-- ============================================================================
-- VERIFICACIÓN SIMPLE: Estado de las tablas QR
-- Ejecuta esto ANTES de la migración para ver qué falta
-- ============================================================================

-- Verificar tabla qr_game_sessions
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_game_sessions')
        THEN '✅ qr_game_sessions existe'
        ELSE '❌ qr_game_sessions NO existe'
    END as tabla_qr_sessions;

-- Verificar tabla qr_session_results
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_session_results')
        THEN '✅ qr_session_results existe'
        ELSE '❌ qr_session_results NO existe - ESTE ES EL PROBLEMA'
    END as tabla_resultados;

-- Verificar columnas de qr_game_sessions
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qr_game_sessions' AND column_name = 'max_participants')
        THEN '✅ max_participants existe'
        ELSE '❌ max_participants NO existe'
    END as campo_max_participants,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qr_game_sessions' AND column_name = 'expires_at')
        THEN '✅ expires_at existe'
        ELSE '❌ expires_at NO existe'
    END as campo_expires_at;

-- Mostrar estructura de qr_game_sessions si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_game_sessions') THEN
        RAISE NOTICE '📋 Estructura de qr_game_sessions:';
    ELSE
        RAISE NOTICE '❌ Tabla qr_game_sessions no existe';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'qr_game_sessions'
ORDER BY ordinal_position;

-- Mensaje de siguiente paso
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_session_results')
        THEN '🔧 SIGUIENTE PASO: Ejecuta fix_qr_migration_safe.sql para crear las tablas faltantes'
        ELSE '✅ Todo está configurado correctamente'
    END as siguiente_paso;