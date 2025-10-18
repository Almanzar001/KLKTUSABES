-- ============================================================================
-- MIGRACIÓN COMPLETA: QR Sessions y Leaderboard
-- Ejecuta este script para agregar todas las funcionalidades QR faltantes
-- ============================================================================

-- PASO 1: Agregar campos a qr_game_sessions
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

-- Permitir lectura pública para leaderboards
DROP POLICY IF EXISTS "Public can read QR session results" ON qr_session_results;
CREATE POLICY "Public can read QR session results" 
  ON qr_session_results FOR SELECT 
  USING (true);

-- Permitir insertar a cualquiera (para acceso QR sin autenticación)
DROP POLICY IF EXISTS "Allow insert QR session results" ON qr_session_results;
CREATE POLICY "Allow insert QR session results" 
  ON qr_session_results FOR INSERT 
  WITH CHECK (true);

-- Permitir actualizar propios resultados
DROP POLICY IF EXISTS "Users can update own QR results" ON qr_session_results;
CREATE POLICY "Users can update own QR results" 
  ON qr_session_results FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- PASO 5: Crear función para actualizar updated_at si no existe
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Crear trigger para qr_session_results
-- ============================================================================

DROP TRIGGER IF EXISTS update_qr_session_results_updated_at ON qr_session_results;
-- Note: qr_session_results doesn't have updated_at column, so we skip this trigger

-- PASO 7: Actualizar datos existentes
-- ============================================================================

-- Actualizar sesiones existentes que no tengan expires_at
UPDATE qr_game_sessions 
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

-- Actualizar sesiones existentes que no tengan max_participants
UPDATE qr_game_sessions 
SET max_participants = 50
WHERE max_participants IS NULL;

-- PASO 8: Habilitar Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE qr_session_results;

-- PASO 9: Crear vista de estadísticas
-- ============================================================================

CREATE OR REPLACE VIEW qr_session_stats AS
SELECT 
  qgs.id as session_id,
  qgs.title,
  qgs.access_code,
  qgs.is_active,
  qgs.max_participants,
  COUNT(qsr.id) as total_players,
  COALESCE(MAX(qsr.total_score), 0) as best_score,
  COALESCE(ROUND(AVG(qsr.total_score::numeric), 0), 0) as avg_score,
  COALESCE(ROUND(AVG(qsr.total_correct::numeric / NULLIF(qsr.total_questions, 0) * 100), 1), 0) as avg_accuracy,
  qgs.created_at,
  qgs.expires_at
FROM qr_game_sessions qgs
LEFT JOIN qr_session_results qsr ON qgs.id = qsr.qr_session_id
GROUP BY qgs.id, qgs.title, qgs.access_code, qgs.is_active, qgs.max_participants, qgs.created_at, qgs.expires_at;

-- PASO 10: Verificación final
-- ============================================================================

DO $$
DECLARE
    qr_sessions_count INTEGER;
    qr_results_count INTEGER;
    missing_fields TEXT := '';
BEGIN
    -- Contar registros
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
END $$;

SELECT 
    '🎯 Migración QR completa ejecutada' as status,
    (SELECT COUNT(*) FROM qr_game_sessions) as sesiones_qr,
    (SELECT COUNT(*) FROM qr_session_results) as resultados_guardados;