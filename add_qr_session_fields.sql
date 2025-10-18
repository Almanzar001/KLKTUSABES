-- ============================================================================
-- MIGRACIÓN: Agregar campos max_participants y expires_at a qr_game_sessions
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
    END IF;
END $$;

-- Crear índice para expires_at si no existe
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires_at ON qr_game_sessions(expires_at);

-- Actualizar sesiones existentes que no tengan expires_at
UPDATE qr_game_sessions 
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

SELECT 'Migration completed successfully! qr_game_sessions table updated with max_participants and expires_at fields.' as status;