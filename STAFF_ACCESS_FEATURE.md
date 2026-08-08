# Feature: Allow Technicians to View Staff Directory

## 📋 Descripción
Nueva funcionalidad que permite a los administradores controlar si los técnicos pueden ver el directorio de staff desde su vista móvil.

## 🔧 Implementación Realizada

### 1. Base de Datos
- **Archivo**: `supabase/add-technician-staff-view-setting.sql`
- **Cambio**: Nuevo campo `technicians_can_view_staff` en tabla `system_settings`
- **Valor por defecto**: `false` (desactivado)

### 2. Función SQL Actualizada
- **Archivo**: `supabase/function-get-all-staff.sql`
- **Cambio**: La función ahora verifica:
  - ✅ Admins y Super Admins siempre tienen acceso
  - ✅ Técnicos solo tienen acceso si el setting está habilitado
  - ❌ Otros roles no tienen acceso

### 3. Frontend
- **Settings.tsx**: Nuevo toggle "Technicians can view staff directory"
- **settingsStore.ts**: Agregado campo `technicians_can_view_staff` al interface

## 📝 Instrucciones de Implementación

### PASO 1: Ejecutar SQL en Supabase (⚠️ REQUERIDO)

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto **Prime Line Coffee**
3. Abre **SQL Editor**
4. Copia y ejecuta los siguientes SQL en orden:

#### SQL 1: Agregar campo a settings
```sql
-- Add setting to allow technicians to view staff directory
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS technicians_can_view_staff BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.system_settings.technicians_can_view_staff 
IS 'Allow technicians to view the staff directory';
```

#### SQL 2: Actualizar función get_all_staff
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

GRANT EXECUTE ON FUNCTION public.get_all_staff() TO authenticated;

COMMENT ON FUNCTION public.get_all_staff() 
IS 'Returns all staff members (users) with their technician data. Requires admin/super_admin role, or technician role if setting is enabled.';
```

### PASO 2: Verificar el Deploy

El código frontend ya está incluido en el próximo commit. Espera a que Netlify termine el deploy.

### PASO 3: Activar la Funcionalidad

1. Inicia sesión como **Admin** o **Super Admin**
2. Ve a: **Settings** (Configuración)
3. Busca la sección **"Staff Access"**
4. Activa el switch: **"Technicians can view staff directory"**
5. Click en **"Save Settings"**

### PASO 4: Probar

1. Inicia sesión como **Técnico**
2. Ve al footer y toca el icono **"Staff"** (icono de personas)
3. Deberías ver la lista de todos los staff members
4. Para probar el control:
   - Desactiva el switch en Settings
   - El técnico verá mensaje de error
   - Actívalo de nuevo y funcionará

## ✅ Resultado Final

- ✅ Los admins controlan quién puede ver el staff directory
- ✅ Por defecto está **desactivado** (seguridad)
- ✅ Se puede activar/desactivar en cualquier momento desde Settings
- ✅ Los técnicos ven contactos de todo el equipo (cuando está habilitado)

## 🔒 Seguridad

- ✅ RLS (Row Level Security) sigue activo
- ✅ La función usa `SECURITY DEFINER` pero verifica permisos
- ✅ Solo admins pueden cambiar el setting
- ✅ El acceso se controla dinámicamente desde la DB

---

**Commit**: Pendiente de push
**Archivos modificados**: 4
**SQL requerido**: 2 scripts (EJECUTAR MANUALMENTE)
