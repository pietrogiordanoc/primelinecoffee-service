# Deployment Guide - Prime Line Coffee Service

## Completed Prerequisites

✅ Complete source code
✅ Vite, TypeScript, Tailwind configuration
✅ Netlify Functions configured
✅ Supabase SQL schema
✅ Image optimization system
✅ Email templates

## Deployment Steps

### 1. Supabase Setup

#### a) Create Project
1. Go to https://supabase.com
2. Click "New Project"
3. Name: `prime-line-coffee`
4. Database password: [use a strong password]
5. Region: Select the closest one
6. Click "Create new project"
7. Wait for creation to complete

#### b) Get Credentials
Go to Project Settings > API:
- `Project URL`: Copy URL
- `anon public`: Copy API Key (anon key)
- `service_role`: Copy API Key (service role) - ⚠️ KEEP SECRET

#### c) Run SQL Schema
1. Go to SQL Editor
2. Click "New Query"
3. Copy ALL content from `supabase/schema.sql`
4. Click "Run"
5. Verify there are no errors
6. Go to Table Editor and verify all tables exist:
   - users
   - companies
   - technicians
   - technician_companies
   - dynamic_forms
   - form_fields
   - service_reports
   - report_photos
   - activity_logs
   - email_logs
   - system_settings

#### d) Verify Storage
1. Go to Storage
2. Verify that the `service-reports` bucket exists
3. If it doesn't exist, create it manually
4. Policies are already applied by the SQL

### 2. Resend Configuration

#### a) Create Account
1. Go to https://resend.com
2. Create a free account
3. Verify email

#### b) Configure Domain (Optional but Recommended)
1. Go to Domains
2. Click "Add Domain"
3. Add your domain (e.g., primelinecoffee.com)
4. Configure DNS records as instructed
5. Wait for verification

Or use the test domain: `onboarding.resend.dev`

#### c) Get API Key
1. Go to API Keys
2. Click "Create API Key"
3. Name: "Prime Line Production"
4. Copy the API Key - ⚠️ SAVE SECURELY

### 3. Prepare Code for Deploy

#### a) Create Git Repository
```bash
git init
git add .
git commit -m "Initial commit - Prime Line Coffee Service"
```

#### b) Push to GitHub
1. Go to https://github.com
2. Click "New Repository"
3. Name: `prime-line-coffee-service`
4. Public or Private (recommended)
5. Do NOT initialize with README
6. Click "Create repository"

```bash
git remote add origin https://github.com/your-username/prime-line-coffee-service.git
git branch -M main
git push -u origin main
```

### 4. Deploy on Netlify

#### a) Connect Project
1. Go to https://netlify.com
2. Login with GitHub
3. Click "Add new site" > "Import an existing project"
4. Click "GitHub"
5. Authorize Netlify
6. Find your repository: `prime-line-coffee-service`
7. Click on the repository

#### b) Configure Build Settings
Netlify should auto-detect:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

If not, configure manually.

#### c) Add Environment Variables
Click "Add environment variables":

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://prime-line-coffee.netlify.app
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
RESEND_API_KEY=re_tu_api_key_aqui
```

⚠️ **IMPORTANT**: Use the actual credentials from Supabase and Resend.

#### d) Deploy
1. Click "Deploy site"
2. Wait 2-5 minutes
3. If there are errors, check logs
4. Once complete, you will get a URL like: `https://random-name.netlify.app`

#### e) Configure Custom Domain (Optional)
1. Go to "Domain settings"
2. Click "Add custom domain"
3. Add your domain: `primelinecoffee.com`
4. Follow instructions to configure DNS
5. Netlify will automatically provide SSL certificate

### 5. Post-Deployment Configuration

#### a) Update URL in Variables
1. Go to Site settings > Environment variables
2. Edit `VITE_APP_URL`
3. Set the final URL of your site
4. Click "Save"
5. Re-deploy: Deploys > Trigger deploy > Deploy site

#### b) Create Super Admin
1. Go to your Supabase project
2. Authentication > Users
3. Click "Add user" > "Create new user"
4. Email: admin@primelinecoffee.com (or your preference)
5. Password: [create a secure password]
6. Click "Create user"
7. Go to Table Editor > users
8. Find the newly created user
9. Click to edit
10. Change `role` to `super_admin`
11. Click "Save"

#### c) Configure Notification Emails
```sql
-- Ejecutar en Supabase SQL Editor
UPDATE system_settings
SET setting_value = jsonb_build_object(
  'enabled', true,
  'recipients', jsonb_build_array(
    'admin@primelinecoffee.com',
    'manager@primelinecoffee.com'
  )
)
WHERE setting_key = 'email_notifications';
```

### 6. System Verification

#### a) Login Test
1. Go to your site: `https://your-site.netlify.app`
2. Try logging in with the super admin created
3. Verify it redirects to the admin dashboard

#### b) Create Test Data

**Create a Company**:
1. Login as admin
2. Go to "Companies"
3. Click "Add Company"
4. Fill in test data
5. Save

**Create a Technician**:
1. Go to "Technicians"
2. Click "Add Technician"
3. Email: technician@test.com
4. Password: Test123456
5. Name: John Technician
6. Save

**Assign Technician to Company**:
```sql
-- En Supabase SQL Editor
INSERT INTO technician_companies (technician_id, company_id)
SELECT 
  t.id,
  c.id
FROM technicians t
CROSS JOIN companies c
LIMIT 1;
```

**Create a Form**:
1. Go to "Forms"
2. Click "New Form"
3. Name: "Machine Maintenance"
4. Category: "Maintenance"
5. Save
6. Click "View fields"
7. Add fields:
   - Customer name (text)
   - Machine model (text)
   - Service description (textarea)
   - Status (select with options: Good, Fair, Poor)
8. Save each field

#### c) Mobile Report Test
1. Open the site on a mobile device (or use Chrome DevTools in responsive mode)
2. Login as the technician: technician@test.com
3. Select the company
4. Select the form
5. Fill in data
6. Take/upload a test photo
7. Submit report
8. Verify:
   - Report appears in technician "History"
   - Report appears in admin "Reports"
   - Email arrived at configured recipients

### 7. Monitoring and Logs

#### Netlify Functions Logs
1. Go to Functions
2. Click on `send-report-email`
3. View execution logs
4. Verify no errors

#### Supabase Logs
1. Go to Logs
2. Review queries
3. Verify no RLS errors

### 8. Post-Deploy Security

✅ Verify environment variables are configured
✅ Do NOT commit `.env` files to Git
✅ Service Role Key NEVER in the frontend
✅ Production URLs correctly configured
✅ HTTPS enabled (Netlify does this automatically)
✅ RLS policies active in Supabase

## Common Issues and Solutions

### "Missing environment variables"
- Verify variables in Netlify
- Re-deploy after adding variables

### Email not sending
- Verify RESEND_API_KEY
- View logs in Netlify Functions
- Verify verified domain in Resend

### RLS Errors
- Verify that the SQL schema executed completely
- Verify user role in `users` table

### Photos not uploading
- Verify Storage policies in Supabase
- Verify that the bucket exists
- View logs in browser console

## Maintenance

### Update Code
```bash
git add .
git commit -m "Description of change"
git push origin main
```

Netlify will automatically deploy the changes.

### Database Backup
Supabase makes automatic backups, but you can make manual ones:
1. Ir a Database > Backups
2. Click en "Create backup"

### Actualizar Dependencias
```bash
npm update
cd netlify/functions && npm update && cd ../..
git add .
git commit -m "Update dependencies"
git push
```

## Final Checklist

- [ ] Supabase project created and schema executed
- [ ] Resend configured and API key obtained
- [ ] Code pushed to GitHub
- [ ] Netlify connected and deployed
- [ ] Environment variables configured
- [ ] Super admin created
- [ ] Test company created
- [ ] Test technician created
- [ ] Test form created
- [ ] Test report sent successfully
- [ ] Email received correctly
- [ ] Custom domain configured (optional)
- [ ] SSL active (verify lock icon in browser)

## Deployment Complete! 🎉

Your system is in production and ready to use.

For support: admin@primelinecoffee.com
