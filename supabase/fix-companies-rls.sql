-- =====================================================
-- FIX: Permitir que técnicos vean TODAS las empresas activas
-- =====================================================

-- 1. Eliminar la política antigua que filtra por technician_companies
DROP POLICY IF EXISTS "Technicians can view assigned companies" ON public.companies;

-- 2. Crear nueva política: técnicos ven TODAS las empresas activas
CREATE POLICY "Technicians can view all active companies"
  ON public.companies FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    is_active = true
  );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver todas las políticas de companies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'companies';

-- Probar como técnico (ejecuta esto después de hacer login como técnico)
-- SELECT * FROM companies WHERE is_active = true;
