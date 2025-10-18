-- ============================================================================
-- MIGRACIÓN SEGURA: QR Sessions y Leaderboard
-- Este script maneja correctamente el orden de creación de tablas
-- ============================================================================

-- PASO 1: Verificar y agregar campos a qr_game_sessions PRIMERO
-- ============================================================================

-- Agregar campo max_participants si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_game_sessions' 
        AND column_name = 'max_participants'
    ) THEN
        ALTER TABLE qr_game_sessions 
        ADD COLUMN max_participants INTEGER DEFAULT 50;
        RAISE NOTICE '✅ Agregada columna max_participants';
    ELSE
        RAISE NOTICE '✅ Columna max_participants ya existe';
    END IF;
END $$;

-- Agregar campo expires_at si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_game_sessions' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE qr_game_sessions 
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');
        RAISE NOTICE '✅ Agregada columna expires_at';
    ELSE
        RAISE NOTICE '✅ Columna expires_at ya existe';
    END IF;
END $$;

-- PASO 2: Crear tabla qr_session_results si no existe
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_session_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_session_id UUID REFERENCES qr_game_sessions(id) ON DELETE CASCADE NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  total_score INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  avg_time DECIMAL(10,2) DEFAULT 0,
  game_data JSONB,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Crear índices necesarios
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires_at ON qr_game_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_session_results_session_id ON qr_session_results(qr_session_id);
CREATE INDEX IF NOT EXISTS idx_qr_session_results_score ON qr_session_results(qr_session_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_qr_session_results_completed ON qr_session_results(completed_at);

-- PASO 4: Configurar RLS para qr_session_results
-- ============================================================================

ALTER TABLE qr_session_results ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public can read QR session results" ON qr_session_results;
DROP POLICY IF EXISTS "Allow insert QR session results" ON qr_session_results;
DROP POLICY IF EXISTS "Users can update own QR results" ON qr_session_results;

-- Crear políticas nuevas
CREATE POLICY "Public can read QR session results" 
  ON qr_session_results FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert QR session results" 
  ON qr_session_results FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own QR results" 
  ON qr_session_results FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- PASO 5: Actualizar datos existentes
-- ============================================================================

-- Actualizar sesiones existentes que no tengan expires_at
UPDATE qr_game_sessions 
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

-- Actualizar sesiones existentes que no tengan max_participants
UPDATE qr_game_sessions 
SET max_participants = 50
WHERE max_participants IS NULL;

-- PASO 6: Habilitar Realtime (manejo seguro de errores)
-- ============================================================================

DO $$
BEGIN
    -- Intentar agregar qr_session_results a realtime
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE qr_session_results;
        RAISE NOTICE '✅ Tabla qr_session_results agregada a realtime';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE '✅ Tabla qr_session_results ya está en realtime';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  No se pudo agregar qr_session_results a realtime: %', SQLERRM;
    END;
END $$;

-- PASO 7: Crear vista de estadísticas DESPUÉS de que las tablas existan
-- ============================================================================

-- Eliminar vista si existe
DROP VIEW IF EXISTS qr_session_stats;

-- Crear vista nueva
CREATE VIEW qr_session_stats AS
SELECT 
  qgs.id as session_id,
  qgs.title,
  qgs.access_code,
  qgs.is_active,
  COALESCE(qgs.max_participants, 50) as max_participants,
  COUNT(qsr.id) as total_players,
  COALESCE(MAX(qsr.total_score), 0) as best_score,
  COALESCE(ROUND(AVG(qsr.total_score::numeric), 0), 0) as avg_score,
  COALESCE(ROUND(AVG(qsr.total_correct::numeric / NULLIF(qsr.total_questions, 0) * 100), 1), 0) as avg_accuracy,
  qgs.created_at,
  COALESCE(qgs.expires_at, qgs.created_at + INTERVAL '24 hours') as expires_at
FROM qr_game_sessions qgs
LEFT JOIN qr_session_results qsr ON qgs.id = qsr.qr_session_id
GROUP BY qgs.id, qgs.title, qgs.access_code, qgs.is_active, qgs.max_participants, qgs.created_at, qgs.expires_at;

-- PASO 8: Verificación final
-- ============================================================================

DO $$
DECLARE
    qr_sessions_count INTEGER;
    qr_results_count INTEGER;
    missing_fields TEXT := '';
    qr_results_exists BOOLEAN;
BEGIN
    -- Verificar si qr_session_results existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'qr_session_results'
    ) INTO qr_results_exists;
    
    IF qr_results_exists THEN
        -- Contar registros solo si las tablas existen
        SELECT COUNT(*) INTO qr_sessions_count FROM qr_game_sessions;
        SELECT COUNT(*) INTO qr_results_count FROM qr_session_results;
        
        -- Verificar campos faltantes
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qr_game_sessions' AND column_name = 'max_participants') THEN
            missing_fields := missing_fields || 'max_participants ';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qr_game_sessions' AND column_name = 'expires_at') THEN
            missing_fields := missing_fields || 'expires_at ';
        END IF;
        
        -- Mostrar resultado
        IF missing_fields = '' THEN
            RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!';
            RAISE NOTICE '📊 Sesiones QR existentes: %', qr_sessions_count;
            RAISE NOTICE '🏆 Resultados guardados: %', qr_results_count;
            RAISE NOTICE '✅ Todas las tablas y campos están configurados correctamente';
        ELSE
            RAISE NOTICE '⚠️  MIGRACIÓN INCOMPLETA - Campos faltantes: %', missing_fields;
        END IF;
    ELSE
        RAISE NOTICE '❌ ERROR: No se pudo crear la tabla qr_session_results';
    END IF;
END $$;

-- Mostrar resultado final
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_session_results')
        THEN '🎯 Migración QR completada exitosamente'
        ELSE '❌ Error en migración QR'
    END as status,
    (SELECT COUNT(*) FROM qr_game_sessions) as sesiones_qr,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_session_results')
        THEN (SELECT COUNT(*) FROM qr_session_results)::text
        ELSE 'Tabla no existe'
    END as resultados_guardados;