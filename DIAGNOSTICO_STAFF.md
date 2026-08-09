# 🔍 Diagnóstico: Staff no se muestra en modo técnico

## ✅ Corrección Realizada

Se actualizó el componente `Staff.tsx` para usar la función RPC `get_all_staff()` en lugar de consultar directamente la tabla `technicians`. Esta función verifica automáticamente los permisos.

## 📋 Pasos de Verificación

### 1️⃣ Verificar que la función SQL existe

Ejecuta este SQL en Supabase SQL Editor para verificar:

```sql
-- Verificar si la función existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_all_staff';
```

**Si NO aparece ningún resultado**, ejecuta este SQL para crear la función:

```sql
-- Function to get all staff members (admins and technicians)
-- This bypasses RLS to allow admins and technicians (if enabled) to see all users
CREATE OR REPLACE FUNCTION public.get_all_staff()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role user_role,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
  allow_technicians BOOLEAN;
BEGIN
  -- Get the current user's role
  SELECT users.role INTO user_role
  FROM public.users 
  WHERE users.id = auth.uid();

  -- Check if user is admin or super_admin
  IF user_role IN ('super_admin', 'admin') THEN
    -- Admins always have access
    NULL; -- Continue
  ELSIF user_role = 'technician' THEN
    -- Check if technicians are allowed to view staff
    SELECT technicians_can_view_staff INTO allow_technicians
    FROM public.system_settings
    LIMIT 1;
    
    IF NOT COALESCE(allow_technicians, false) THEN
      RAISE EXCEPTION 'Access denied. Technicians are not allowed to view staff directory.';
    END IF;
  ELSE
    -- Other roles have no access
    RAISE EXCEPTION 'Access denied. Admin or technician role required.';
  END IF;

  -- Return all users with their technician data if applicable
  RETURN QUERY
  SELECT 
    COALESCE(t.id, u.id) as id,
    u.id as user_id,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    COALESCE(t.is_active, u.is_active) as is_active,
    u.created_at
  FROM public.users u
  LEFT JOIN public.technicians t ON t.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_staff() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_all_staff() IS 'Returns all staff members (users) with their technician data. Requires admin or super_admin role, or technician with permission enabled.';
```

### 2️⃣ Verificar que existe el campo en system_settings

```sql
-- Verificar si existe la columna
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'system_settings' 
  AND column_name = 'technicians_can_view_staff';
```

**Si NO aparece ningún resultado**, ejecuta:

```sql
-- Add setting to allow technicians to view staff directory
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS technicians_can_view_staff BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.system_settings.technicians_can_view_staff 
IS 'Allow technicians to view the staff directory';
```

### 3️⃣ Verificar el valor actual del setting

```sql
-- Ver el valor actual
SELECT technicians_can_view_staff 
FROM public.system_settings;
```

**Si está en `false`**, actívalo desde:
- Panel Admin → Settings → Scroll down hasta "Technicians can view staff directory"
- Activa el switch

O ejecuta directamente:

```sql
-- Activar el permiso
UPDATE public.system_settings 
SET technicians_can_view_staff = true;
```

### 4️⃣ Verificar que tienes datos de técnicos

```sql
-- Ver técnicos existentes
SELECT id, full_name, email, is_active 
FROM public.technicians
WHERE is_active = true;
```

### 5️⃣ Probar la función directamente

```sql
-- Ejecutar como admin o técnico autenticado
SELECT * FROM get_all_staff();
```

## 🧪 Prueba en la Aplicación

1. Haz logout y login nuevamente
2. Ve a la sección "Staff" en el menú de técnico
3. Deberías ver la lista de técnicos

## ❌ Posibles Errores

### Error: "Access denied. Technicians are not allowed to view staff directory"
**Solución**: El setting `technicians_can_view_staff` está en `false`. Actívalo desde Settings o ejecuta el SQL del paso 3.

### Error: "function get_all_staff() does not exist"
**Solución**: La función no está creada. Ejecuta el SQL del paso 1.

### Error: "column technicians_can_view_staff does not exist"
**Solución**: Falta la columna en system_settings. Ejecuta el SQL del paso 2.

### No aparece nada pero no hay error
**Verificar**:
- ¿Hay técnicos creados? (Paso 4)
- ¿Estás logueado como técnico?
- Revisa la consola del navegador (F12) para ver errores

## 📝 Resumen de Archivos Modificados

- ✅ `src/pages/technician/Staff.tsx` - Actualizado para usar RPC function
- 📁 `supabase/function-get-all-staff.sql` - Función SQL con validación
- 📁 `supabase/add-technician-staff-view-setting.sql` - Migración de columna

## 🔗 Referencia

Ver documento completo: [STAFF_ACCESS_FEATURE.md](STAFF_ACCESS_FEATURE.md)
