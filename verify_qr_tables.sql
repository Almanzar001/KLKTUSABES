-- ============================================================================
-- SCRIPT DE VERIFICACIÓN: Tablas QR y Leaderboard
-- Ejecuta esto para verificar si las tablas necesarias existen
-- ============================================================================

-- Verificar que la tabla qr_session_results existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'qr_session_results'
        ) 
        THEN '✅ qr_session_results existe'
        ELSE '❌ qr_session_results NO existe - ejecuta add_qr_session_fields.sql'
    END as tabla_resultados;

-- Verificar que la tabla qr_game_sessions tiene las columnas necesarias
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'qr_game_sessions' 
            AND column_name = 'max_participants'
        ) 
        THEN '✅ max_participants existe'
        ELSE '❌ max_participants NO existe - ejecuta add_qr_session_fields.sql'
    END as max_participants,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'qr_game_sessions' 
            AND column_name = 'expires_at'
        ) 
        THEN '✅ expires_at existe'
        ELSE '❌ expires_at NO existe - ejecuta add_qr_session_fields.sql'
    END as expires_at;

-- Mostrar estructura actual de qr_game_sessions
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'qr_game_sessions'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('qr_game_sessions', 'qr_session_results')
ORDER BY tablename, policyname;

-- Contar registros existentes
SELECT 
    (SELECT COUNT(*) FROM qr_game_sessions) as sesiones_qr,
    (SELECT 
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_session_results')
            THEN COUNT(*)::text
            ELSE 'Tabla no existe'
        END
     FROM qr_session_results
    ) as resultados_guardados;

SELECT '🎯 Verificación completa - revisa los resultados arriba para identificar problemas' as status;