-- =====================================================
-- ACTUALIZAR TÉCNICOS - Mayo 2026
-- =====================================================

-- 1. REMOVER: Andy Hernandez (andy.hernandez@primelinedist.com)
-- Opción A: Desactivar (recomendado - mantiene historial)
UPDATE technicians 
SET is_active = false
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'andy.hernandez@primelinedist.com'
);

-- Opción B: Eliminar completamente (usa esto si prefieres borrar)
-- DELETE FROM technicians 
-- WHERE user_id IN (
--   SELECT id FROM auth.users WHERE email = 'andy.hernandez@primelinedist.com'
-- );
-- DELETE FROM auth.users WHERE email = 'andy.hernandez@primelinedist.com';

-- =====================================================
-- 2. AGREGAR: Luis Diaz
-- =====================================================
-- Nota: Necesitas ejecutar esto desde un servidor con service_role_key
-- O usa la función create-technician en Netlify Functions

-- SQL directo (requiere permisos de admin en Supabase):
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Crear usuario en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'luis.diaz@primelinedist.com',
    crypt('TempPass123', gen_salt('bf')), -- Cambiar contraseña después
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"technician"}',
    '{"full_name":"Luis Diaz"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Crear registro en users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new_user_id,
    'luis.diaz@primelinedist.com',
    'Luis Diaz',
    'technician'
  );

  -- Crear registro en technicians
  INSERT INTO public.technicians (user_id, employee_id, specialization, is_active)
  VALUES (
    new_user_id,
    'TECH-009',
    'Coffee Equipment Specialist',
    true
  );
END $$;

-- =====================================================
-- 3. AGREGAR: Ronny Benjamin
-- =====================================================
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'ronny.benjamin@primelinedist.com',
    crypt('TempPass123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"technician"}',
    '{"full_name":"Ronny Benjamin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new_user_id,
    'ronny.benjamin@primelinedist.com',
    'Ronny Benjamin',
    'technician'
  );

  INSERT INTO public.technicians (user_id, employee_id, specialization, is_active)
  VALUES (
    new_user_id,
    'TECH-010',
    'Coffee Equipment Specialist',
    true
  );
END $$;

-- =====================================================
-- 4. AGREGAR: Elias Monnot
-- =====================================================
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'elias.monnot@primelinedist.com',
    crypt('TempPass123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"technician"}',
    '{"full_name":"Elias Monnot"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new_user_id,
    'elias.monnot@primelinedist.com',
    'Elias Monnot',
    'technician'
  );

  INSERT INTO public.technicians (user_id, employee_id, specialization, is_active)
  VALUES (
    new_user_id,
    'TECH-011',
    'Coffee Equipment Specialist',
    true
  );
END $$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ver todos los técnicos activos
SELECT 
  t.employee_id,
  u.full_name,
  u.email,
  t.specialization,
  t.is_active,
  t.created_at
FROM technicians t
JOIN users u ON u.id = t.user_id
ORDER BY t.created_at DESC;

-- =====================================================
-- CONTRASEÑAS TEMPORALES
-- =====================================================
-- Todos los nuevos técnicos tienen la contraseña: TempPass123
-- 
-- Para cambiar la contraseña de un técnico específico:
-- UPDATE auth.users 
-- SET encrypted_password = crypt('NuevaContraseña123', gen_salt('bf'))
-- WHERE email = 'email@ejemplo.com';

-- =====================================================
-- MÉTODO ALTERNATIVO (más seguro desde el Admin Panel)
-- =====================================================
-- Si el SQL de arriba no funciona por permisos, usa el Admin Panel:
-- 
-- 1. Remover Andy:
--    - Panel Admin → Technicians → Click en toggle de Andy → Desactivar
--
-- 2. Agregar nuevos técnicos:
--    - Panel Admin → Technicians → Add Technician
--    - Llenar: Nombre, Email, Contraseña temporal
--    - Click "Create Technician"
--
-- Repite para:
-- - Luis Diaz (luis.diaz@primelinedist.com)
-- - Ronny Benjamin (ronny.benjamin@primelinedist.com)
-- - Elias Monnot (elias.monnot@primelinedist.com)
