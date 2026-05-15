# Useful Commands - Prime Line Coffee Service

## Development

```bash
# Install dependencies
npm install

# Install Netlify Functions dependencies
cd netlify/functions && npm install && cd ../...

# Start development
npm run dev

# Start with Netlify Dev (includes functions)
netlify dev

# Linting
npm run lint

# Production build
npm run build

# Preview build
npm run preview
```

## Git

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "Description of change"

# Push to GitHub
git push origin main

# Create new branch
git checkout -b feature/new-feature

# Merge branch
git checkout main
git merge feature/new-feature
```

## Supabase (Local Development)

```bash
# Install Supabase CLI (once)
npm install -g supabase

# Login
supabase login

# Initialize local project
supabase init

# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Ver status
supabase status

# Migrations
supabase migration new migration_name
supabase db push
```

## Netlify

```bash
# Install Netlify CLI (once)
npm install -g netlify-cli

# Login
netlify login

# Initialize project
netlify init

# Manual deploy
netlify deploy

# Deploy to production
netlify deploy --prod

# View function logs
netlify functions:log send-report-email

# View environment variables
netlify env:list

# Add environment variable
netlify env:set KEY value
```

## Database (Useful Queries)

```sql
-- View all users with their roles
SELECT id, email, full_name, role, is_active, created_at
FROM users
ORDER BY created_at DESC;

-- View technicians with their users
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

-- View active companies
SELECT name, city, contact_name, contact_email
FROM companies
WHERE is_active = true
ORDER BY name;

-- View recent reports
SELECT *
FROM report_summary
ORDER BY created_at DESC
LIMIT 10;

-- View technician-company assignments
SELECT 
  u.full_name as technician,
  c.name as company,
  tc.assigned_at
FROM technician_companies tc
JOIN technicians t ON t.id = tc.technician_id
JOIN users u ON u.id = t.user_id
JOIN companies c ON c.id = tc.company_id
ORDER BY tc.assigned_at DESC;

-- View active forms
SELECT id, name, category, is_active, created_at
FROM dynamic_forms
WHERE is_active = true
ORDER BY name;

-- View fields for a specific form
SELECT field_label, field_type, is_required, order_index
FROM form_fields
WHERE form_id = 'form-id-here'
ORDER BY order_index;

-- Quick statistics
SELECT 
  (SELECT COUNT(*) FROM service_reports) as total_reports,
  (SELECT COUNT(*) FROM service_reports WHERE status = 'completed') as completed,
  (SELECT COUNT(*) FROM service_reports WHERE status = 'submitted') as submitted,
  (SELECT COUNT(*) FROM technicians WHERE is_active = true) as active_technicians,
  (SELECT COUNT(*) FROM companies WHERE is_active = true) as active_companies;

-- Change user role
UPDATE users
SET role = 'super_admin'
WHERE email = 'user@email.com';

-- Activate/deactivate user
UPDATE users
SET is_active = true
WHERE email = 'user@email.com';

-- Delete test reports
DELETE FROM service_reports
WHERE created_at < NOW() - INTERVAL '1 day'
AND status = 'draft';

-- View recent activity logs
SELECT 
  u.full_name,
  al.action,
  al.entity_type,
  al.created_at
FROM activity_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 20;

-- View email logs
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

## Maintenance

```bash
# Update dependencies
npm update

# Check outdated dependencies
npm outdated

# Clear cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Local production build
npm run build
npm run preview

# Check bundle size
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
# Code backup
git archive --format=zip --output=backup-$(date +%Y%m%d).zip main

# Supabase backup (via dashboard or CLI)
# Dashboard: Database > Backups > Create backup

# Download backup from CLI
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

# View Netlify logs in real time
netlify logs --live
```

## Productividad

```bash
# Useful aliases (add to .bashrc or .zshrc)
alias dev='npm run dev'
alias build='npm run build'
alias ndev='netlify dev'
alias gdeploy='git add . && git commit -m "Quick update" && git push'

# Custom scripts in package.json
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
