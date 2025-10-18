-- ============================================================================
-- SOLUCIÓN: Arreglar duplicados en QR Leaderboard
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- PASO 1: Eliminar duplicados existentes (mantener el mejor score por jugador)
WITH ranked_results AS (
  SELECT *, 
    ROW_NUMBER() OVER (
      PARTITION BY qr_session_id, TRIM(LOWER(player_name))
      ORDER BY total_score DESC, completed_at DESC
    ) as rn
  FROM qr_session_results
)
DELETE FROM qr_session_results 
WHERE id IN (
  SELECT id FROM ranked_results WHERE rn > 1
);

-- PASO 2: Normalizar nombres existentes (quitar espacios extra)
UPDATE qr_session_results 
SET player_name = TRIM(player_name)
WHERE player_name != TRIM(player_name);

-- PASO 3: Agregar constraint de unicidad para prevenir duplicados futuros
ALTER TABLE qr_session_results 
ADD CONSTRAINT unique_player_per_session 
UNIQUE (qr_session_id, player_name);

-- PASO 4: Crear índice para mejorar rendimiento del leaderboard
CREATE INDEX IF NOT EXISTS idx_qr_results_leaderboard 
ON qr_session_results (qr_session_id, total_score DESC, avg_time ASC);

-- PASO 5: Actualizar políticas RLS para ser más estrictas
DROP POLICY IF EXISTS "Allow insert QR session results" ON qr_session_results;

CREATE POLICY "Insert only in active sessions" 
ON qr_session_results FOR INSERT 
WITH CHECK (
  player_name IS NOT NULL 
  AND TRIM(player_name) != '' 
  AND LENGTH(TRIM(player_name)) >= 2
  AND EXISTS (
    SELECT 1 FROM qr_game_sessions 
    WHERE id = qr_session_id 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
  )
);

-- PASO 6: Verificar que todo esté correcto
SELECT 
  'Migración completada exitosamente' as status,
  (SELECT COUNT(*) FROM qr_session_results) as total_resultados,
  (SELECT COUNT(DISTINCT qr_session_id || '-' || player_name) FROM qr_session_results) as resultados_unicos;

-- PASO 7: Mostrar estadísticas por sesión
SELECT 
  qgs.title as sesion_titulo,
  qgs.access_code as codigo,
  COUNT(qsr.id) as participantes,
  MAX(qsr.total_score) as mejor_score
FROM qr_game_sessions qgs
LEFT JOIN qr_session_results qsr ON qgs.id = qsr.qr_session_id
WHERE qgs.is_active = true
GROUP BY qgs.id, qgs.title, qgs.access_code
ORDER BY COUNT(qsr.id) DESC;

-- ============================================================================
-- DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:
-- 1. Ya no habrá jugadores duplicados en el mismo leaderboard
-- 2. Solo se permitirán inserciones en sesiones activas
-- 3. Los nombres tendrán validación mínima
-- 4. El rendimiento del leaderboard será mejor
-- ============================================================================