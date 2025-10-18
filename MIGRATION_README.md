# Migración de Base de Datos - QR Sessions

## Problema Identificado
Al intentar crear sesiones QR, se produce un error porque la tabla `qr_game_sessions` no tiene las columnas `max_participants` y `expires_at` que se agregaron recientemente.

## Solución

### Opción 1: Ejecutar Script de Migración (Recomendado)
Si ya tienes una base de datos existente con datos, ejecuta este script en tu Supabase SQL Editor:

```sql
-- Ejecutar el contenido de add_qr_session_fields.sql
```

### Opción 2: Recrear Base de Datos Completa
Si no tienes datos importantes, puedes ejecutar el script completo actualizado:

```sql
-- Ejecutar el contenido completo de setup_complete_database.sql
```

## Verificación
Después de aplicar la migración, verifica que las columnas se agregaron correctamente:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'qr_game_sessions' 
AND column_name IN ('max_participants', 'expires_at');
```

## Campos Agregados
- `max_participants INTEGER DEFAULT 50` - Límite máximo de participantes
- `expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')` - Fecha de expiración

Una vez aplicada la migración, las sesiones QR se podrán crear correctamente con las nuevas funcionalidades.