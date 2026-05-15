# Comandos Útiles - Prime Line Coffee Service

## Desarrollo

```bash
# Instalar dependencias
npm install

# Instalar dependencias de Netlify Functions
cd netlify/functions && npm install && cd ../..

# Iniciar desarrollo
npm run dev

# Iniciar con Netlify Dev (incluye functions)
netlify dev

# Linting
npm run lint

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Git

```bash
# Ver estado
git status

# Agregar cambios
git add .

# Commit
git commit -m "Descripción del cambio"

# Push a GitHub
git push origin main

# Crear nueva branch
git checkout -b feature/nueva-funcionalidad

# Merge branch
git checkout main
git merge feature/nueva-funcionalidad
```

## Supabase (Local Development)

```bash
# Instalar Supabase CLI (una vez)
npm install -g supabase

# Login
supabase login

# Inicializar proyecto local
supabase init

# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Ver status
supabase status

# Migrations
supabase migration new nombre_migracion
supabase db push
```

## Netlify

```bash
# Instalar Netlify CLI (una vez)
npm install -g netlify-cli

# Login
netlify login

# Inicializar proyecto
netlify init

# Deploy manual
netlify deploy

# Deploy a producción
netlify deploy --prod

# Ver logs de functions
netlify functions:log send-report-email

# Ver variables de entorno
netlify env:list

# Agregar variable de entorno
netlify env:set KEY value
```

## Database (Queries Útiles)

```sql
-- Ver todos los usuarios con sus roles
SELECT id, email, full_name, role, is_active, created_at
FROM users
ORDER BY created_at DESC;

-- Ver técnicos con sus usuarios
SELECT 
  t.id,
  u.full_name,
  u.email,
  t.employee_id,
  t.specialization,
  t.is_active
FROM technicians t
JOIN users u ON u.id = t.user_id
ORDER BY u.full_name;

-- Ver empresas activas
SELECT name, city, contact_name, contact_email
FROM companies
WHERE is_active = true
ORDER BY name;

-- Ver reportes recientes
SELECT *
FROM report_summary
ORDER BY created_at DESC
LIMIT 10;

-- Ver asignaciones técnico-empresa
SELECT 
  u.full_name as technician,
  c.name as company,
  tc.assigned_at
FROM technician_companies tc
JOIN technicians t ON t.id = tc.technician_id
JOIN users u ON u.id = t.user_id
JOIN companies c ON c.id = tc.company_id
ORDER BY tc.assigned_at DESC;

-- Ver formularios activos
SELECT id, name, category, is_active, created_at
FROM dynamic_forms
WHERE is_active = true
ORDER BY name;

-- Ver campos de un formulario específico
SELECT field_label, field_type, is_required, order_index
FROM form_fields
WHERE form_id = 'form-id-aqui'
ORDER BY order_index;

-- Estadísticas rápidas
SELECT 
  (SELECT COUNT(*) FROM service_reports) as total_reports,
  (SELECT COUNT(*) FROM service_reports WHERE status = 'completed') as completed,
  (SELECT COUNT(*) FROM service_reports WHERE status = 'submitted') as submitted,
  (SELECT COUNT(*) FROM technicians WHERE is_active = true) as active_technicians,
  (SELECT COUNT(*) FROM companies WHERE is_active = true) as active_companies;

-- Cambiar rol de usuario
UPDATE users
SET role = 'super_admin'
WHERE email = 'usuario@email.com';

-- Activar/desactivar usuario
UPDATE users
SET is_active = true
WHERE email = 'usuario@email.com';

-- Limpiar reportes de prueba
DELETE FROM service_reports
WHERE created_at < NOW() - INTERVAL '1 day'
AND status = 'draft';

-- Ver logs de actividad recientes
SELECT 
  u.full_name,
  al.action,
  al.entity_type,
  al.created_at
FROM activity_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 20;

-- Ver logs de emails
SELECT 
  recipient_email,
  subject,
  status,
  sent_at,
  error_message
FROM email_logs
ORDER BY sent_at DESC
LIMIT 10;
```

## Mantenimiento

```bash
# Actualizar dependencias
npm update

# Verificar dependencias obsoletas
npm outdated

# Limpiar cache
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Build de producción local
npm run build
npm run preview

# Verificar tamaño del bundle
npm run build -- --stats
```

## Testing

```bash
# Ejecutar tests (cuando se implementen)
npm test

# Ejecutar tests en modo watch
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Backup

```bash
# Backup de código
git archive --format=zip --output=backup-$(date +%Y%m%d).zip main

# Backup de Supabase (vía dashboard o CLI)
# Dashboard: Database > Backups > Create backup

# Descargar backup desde CLI
supabase db dump > backup.sql
```

## Troubleshooting

```bash
# Limpiar todo y empezar de nuevo
rm -rf node_modules dist .netlify
npm install
npm run build

# Ver versiones
node --version
npm --version
git --version

# Ver puertos en uso
# Windows
netstat -ano | findstr :3000

# Matar proceso en puerto
# Windows
taskkill /PID [PID] /F

# Ver logs de Netlify en tiempo real
netlify logs --live
```

## Productividad

```bash
# Alias útiles (agregar a .bashrc o .zshrc)
alias dev='npm run dev'
alias build='npm run build'
alias ndev='netlify dev'
alias gdeploy='git add . && git commit -m "Quick update" && git push'

# Scripts personalizados en package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "clean": "rm -rf node_modules dist .netlify",
    "fresh": "npm run clean && npm install",
    "deploy": "npm run build && netlify deploy --prod"
  }
}
```
