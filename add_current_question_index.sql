-- ============================================================================
-- AÑADIR current_question_index a tabla rooms para sincronización de respaldo
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Verificar si la columna ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'current_question_index'
  ) THEN
    -- Añadir la columna current_question_index
    ALTER TABLE rooms ADD COLUMN current_question_index INTEGER DEFAULT 0;
    
    RAISE NOTICE '✅ Columna current_question_index añadida a tabla rooms';
  ELSE
    RAISE NOTICE '✅ Columna current_question_index ya existe en tabla rooms';
  END IF;
END $$;

-- Crear índice para optimizar consultas de sincronización
CREATE INDEX IF NOT EXISTS idx_rooms_question_sync 
ON rooms (id, current_question_index, updated_at);

-- Verificar resultado
SELECT 'Migration completed' as status;

-- ============================================================================
-- Esta migración añade:
-- 1. Campo current_question_index para sincronización de respaldo
-- 2. Índice optimizado para consultas de sincronización
-- 
-- El host actualizará este campo cuando avance preguntas
-- Los participantes lo detectarán como método de respaldo
-- ============================================================================