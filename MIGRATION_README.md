# 🚨 SOLUCIÓN: Errores de QR Leaderboard y Resultados

## Problemas Identificados

### ❌ Error 1: "Could not find the table 'qr_session_results'"
```
POST .../qr_session_results 404 (Not Found)
Error: Could not find the table 'public.qr_session_results' in the schema cache
```

### ❌ Error 2: Campos faltantes en qr_game_sessions
```
Error al crear la sesión QR
```

## 🔧 Solución Inmediata

### PASO 1: Verificar Estado Actual
Ve a tu **Supabase SQL Editor** y ejecuta:
```sql
-- Copiar y pegar el contenido de verify_qr_tables.sql
```

### PASO 2: Aplicar Migración Completa
En el **Supabase SQL Editor**, ejecuta:
```sql
-- Copiar y pegar TODO el contenido de fix_qr_migration_safe.sql
```

**⚠️ IMPORTANTE:** Usa `fix_qr_migration_safe.sql` si tienes el error:
```
ERROR: 42P01: relation "qr_session_results" does not exist
```

## 📋 Lo que hace la migración:

### ✅ Crea tabla qr_session_results
- Almacena puntuaciones de jugadores QR
- Configura políticas RLS para acceso público
- Crea índices para rendimiento

### ✅ Agrega campos a qr_game_sessions
- `max_participants` - Límite de participantes
- `expires_at` - Fecha de expiración

### ✅ Configura permisos
- Lectura pública para leaderboards
- Inserción sin autenticación para QR

## 🎯 Después de la migración:

1. **Crear sesión QR** ✅ Funcionará
2. **Guardar resultados** ✅ Funcionará  
3. **Ver leaderboard** ✅ Funcionará
4. **Límites de participantes** ✅ Funcionará

## 🔍 Verificación Final
Ejecuta en SQL Editor:
```sql
SELECT 
    (SELECT COUNT(*) FROM qr_game_sessions) as sesiones,
    (SELECT COUNT(*) FROM qr_session_results) as resultados,
    'Migración exitosa' as status;
```

## ⚠️ Importante
- **NO elimines** datos existentes
- **SÍ ejecuta** la migración completa de una vez
- **REFRESCA** la página después de la migración