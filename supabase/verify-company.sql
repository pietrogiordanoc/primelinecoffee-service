-- Verificar empresa Cafe Miami
SELECT 
  id,
  name,
  city,
  is_active,
  created_at
FROM companies
WHERE name ILIKE '%miami%';

-- Ver TODAS las empresas (incluso inactivas)
SELECT 
  id,
  name,
  city,
  is_active,
  created_at
FROM companies
ORDER BY created_at DESC;

-- Si no aparece ninguna empresa, significa que no se creó correctamente
-- Si aparece pero is_active = false, activala:
-- UPDATE companies SET is_active = true WHERE name = 'Cafe Miami';
