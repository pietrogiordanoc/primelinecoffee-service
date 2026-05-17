-- =====================================================
-- ASIGNAR EMPRESA A TÉCNICO - Quick Fix
-- =====================================================
-- Usa este script para asignar empresas a técnicos manualmente

-- 1. Primero, encuentra los IDs que necesitas:

-- Ver todos los técnicos:
SELECT 
  t.id as technician_id,
  u.full_name,
  u.email
FROM technicians t
JOIN users u ON u.id = t.user_id
WHERE t.is_active = true;

-- Ver todas las empresas:
SELECT 
  id as company_id,
  name,
  city
FROM companies
WHERE is_active = true;

-- 2. Asignar empresa a técnico:
-- Copia el technician_id y company_id de las queries anteriores

INSERT INTO technician_companies (technician_id, company_id)
VALUES (
  'PEGA_TECHNICIAN_ID_AQUI',
  'PEGA_COMPANY_ID_AQUI'
);

-- Ejemplo real:
-- INSERT INTO technician_companies (technician_id, company_id)
-- VALUES (
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   'f9e8d7c6-b5a4-3210-fedc-ba0987654321'
-- );

-- 3. Verificar asignación:
SELECT 
  u.full_name as technician,
  c.name as company,
  tc.assigned_at
FROM technician_companies tc
JOIN technicians t ON t.id = tc.technician_id
JOIN users u ON u.id = t.user_id
JOIN companies c ON c.id = tc.company_id
ORDER BY tc.assigned_at DESC;

-- 4. (Si necesitas) Remover asignación:
-- DELETE FROM technician_companies
-- WHERE technician_id = 'ID_DEL_TECNICO' 
-- AND company_id = 'ID_DE_LA_EMPRESA';

-- =====================================================
-- ASIGNACIÓN MÚLTIPLE (varios técnicos a una empresa)
-- =====================================================
-- Si quieres asignar varios técnicos a una misma empresa:

-- INSERT INTO technician_companies (technician_id, company_id)
-- SELECT t.id, 'ID_DE_LA_EMPRESA'::uuid
-- FROM technicians t
-- WHERE t.user_id IN (
--   SELECT id FROM users WHERE email IN (
--     'tecnico1@empresa.com',
--     'tecnico2@empresa.com',
--     'tecnico3@empresa.com'
--   )
-- );

-- =====================================================
-- ASIGNACIÓN MÚLTIPLE (un técnico a varias empresas)
-- =====================================================
-- Si quieres asignar un técnico a varias empresas:

-- INSERT INTO technician_companies (technician_id, company_id)
-- SELECT 'ID_DEL_TECNICO'::uuid, c.id
-- FROM companies c
-- WHERE c.name IN (
--   'Cafe Central',
--   'Coffee Shop Downtown',
--   'La Colombe Flagship'
-- );
