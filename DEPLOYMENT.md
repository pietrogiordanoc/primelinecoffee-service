# Guía de Deployment - Prime Line Coffee Service

## Pre-requisitos Completados

✅ Código fuente completo
✅ Configuración de Vite, TypeScript, Tailwind
✅ Netlify Functions configuradas
✅ Schema SQL de Supabase
✅ Sistema de optimización de imágenes
✅ Templates de email

## Pasos de Deployment

### 1. Preparación de Supabase

#### a) Crear Proyecto
1. Ir a https://supabase.com
2. Click en "New Project"
3. Nombre: `prime-line-coffee`
4. Password de base de datos: [usar un password fuerte]
5. Region: Seleccionar la más cercana
6. Click en "Create new project"
7. Esperar a que se complete la creación

#### b) Obtener Credenciales
Ir a Project Settings > API:
- `Project URL`: Copiar URL
- `anon public`: Copiar API Key (anon key)
- `service_role`: Copiar API Key (service role) - ⚠️ MANTENER SECRETO

#### c) Ejecutar Schema SQL
1. Ir a SQL Editor
2. Click en "New Query"
3. Copiar TODO el contenido de `supabase/schema.sql`
4. Click en "Run"
5. Verificar que no haya errores
6. Ir a Table Editor y verificar que todas las tablas existen:
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

#### d) Verificar Storage
1. Ir a Storage
2. Verificar que existe el bucket `service-reports`
3. Si no existe, crearlo manualmente
4. Las políticas ya están aplicadas por el SQL

### 2. Configuración de Resend

#### a) Crear Cuenta
1. Ir a https://resend.com
2. Crear cuenta gratuita
3. Verificar email

#### b) Configurar Dominio (Opcional pero Recomendado)
1. Ir a Domains
2. Click en "Add Domain"
3. Agregar tu dominio (ej: primelinecoffee.com)
4. Configurar registros DNS según instrucciones
5. Esperar verificación

O usar el dominio de prueba: `onboarding.resend.dev`

#### c) Obtener API Key
1. Ir a API Keys
2. Click en "Create API Key"
3. Nombre: "Prime Line Production"
4. Copiar la API Key - ⚠️ GUARDAR DE FORMA SEGURA

### 3. Preparar Código para Deploy

#### a) Crear Repositorio Git
```bash
git init
git add .
git commit -m "Initial commit - Prime Line Coffee Service"
```

#### b) Subir a GitHub
1. Ir a https://github.com
2. Click en "New Repository"
3. Nombre: `prime-line-coffee-service`
4. Público o Privado (recomendado)
5. NO inicializar con README
6. Click en "Create repository"

```bash
git remote add origin https://github.com/tu-usuario/prime-line-coffee-service.git
git branch -M main
git push -u origin main
```

### 4. Deploy en Netlify

#### a) Conectar Proyecto
1. Ir a https://netlify.com
2. Login con GitHub
3. Click en "Add new site" > "Import an existing project"
4. Click en "GitHub"
5. Autorizar Netlify
6. Buscar tu repositorio: `prime-line-coffee-service`
7. Click en el repositorio

#### b) Configurar Build Settings
Netlify debería auto-detectar:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

Si no lo hace, configurar manualmente.

#### c) Agregar Variables de Entorno
Click en "Add environment variables":

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://prime-line-coffee.netlify.app
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
RESEND_API_KEY=re_tu_api_key_aqui
```

⚠️ **IMPORTANTE**: Usa las credenciales reales de Supabase y Resend.

#### d) Deploy
1. Click en "Deploy site"
2. Esperar 2-5 minutos
3. Si hay errores, revisar logs
4. Una vez completado, obtendrás una URL tipo: `https://random-name.netlify.app`

#### e) Configurar Dominio Personalizado (Opcional)
1. Ir a "Domain settings"
2. Click en "Add custom domain"
3. Agregar tu dominio: `primelinecoffee.com`
4. Seguir instrucciones para configurar DNS
5. Netlify proveerá certificado SSL automático

### 5. Configuración Post-Deployment

#### a) Actualizar URL en Variables
1. Ir a Site settings > Environment variables
2. Editar `VITE_APP_URL`
3. Poner la URL final de tu sitio
4. Click en "Save"
5. Re-deploy: Deploys > Trigger deploy > Deploy site

#### b) Crear Super Admin
1. Ir a tu proyecto Supabase
2. Authentication > Users
3. Click en "Add user" > "Create new user"
4. Email: admin@primelinecoffee.com (o el que prefieras)
5. Password: [crear password seguro]
6. Click en "Create user"
7. Ir a Table Editor > users
8. Buscar el usuario recién creado
9. Click para editar
10. Cambiar `role` a `super_admin`
11. Click en "Save"

#### c) Configurar Emails de Notificación
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

### 6. Verificación del Sistema

#### a) Test de Login
1. Ir a tu sitio: `https://tu-sitio.netlify.app`
2. Intentar login con el super admin creado
3. Verificar que redirija al dashboard admin

#### b) Crear Datos de Prueba

**Crear una Empresa**:
1. Login como admin
2. Ir a "Empresas"
3. Click en "Agregar Empresa"
4. Llenar datos de prueba
5. Guardar

**Crear un Técnico**:
1. Ir a "Técnicos"
2. Click en "Agregar Técnico"
3. Email: tecnico@test.com
4. Password: Test123456
5. Nombre: Juan Técnico
6. Guardar

**Asignar Técnico a Empresa**:
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

**Crear un Formulario**:
1. Ir a "Formularios"
2. Click en "Nuevo Formulario"
3. Nombre: "Mantenimiento de Máquinas"
4. Categoría: "Mantenimiento"
5. Guardar
6. Click en "Ver campos"
7. Agregar campos:
   - Nombre cliente (text)
   - Modelo máquina (text)
   - Descripción servicio (textarea)
   - Estado (select con opciones: Bueno, Regular, Malo)
8. Guardar cada campo

#### c) Test de Reporte desde Móvil
1. Abrir el sitio en un móvil (o usar Chrome DevTools en modo responsive)
2. Login con el técnico: tecnico@test.com
3. Seleccionar la empresa
4. Seleccionar el formulario
5. Llenar datos
6. Tomar/subir una foto de prueba
7. Enviar reporte
8. Verificar:
   - Reporte aparece en "Historial" del técnico
   - Reporte aparece en "Reportes" del admin
   - Email llegó a los destinatarios configurados

### 7. Monitoreo y Logs

#### Netlify Functions Logs
1. Ir a Functions
2. Click en `send-report-email`
3. Ver logs de ejecución
4. Verificar que no haya errores

#### Supabase Logs
1. Ir a Logs
2. Revisar queries
3. Verificar que no haya errores de RLS

### 8. Seguridad Post-Deploy

✅ Verificar que las variables de entorno estén configuradas
✅ NO commitear archivos `.env` a Git
✅ Service Role Key NUNCA en el frontend
✅ URLs de producción configuradas correctamente
✅ HTTPS habilitado (Netlify lo hace automático)
✅ RLS policies activas en Supabase

## Problemas Comunes y Soluciones

### "Missing environment variables"
- Verificar variables en Netlify
- Re-deploy después de agregar variables

### Email no se envía
- Verificar RESEND_API_KEY
- Ver logs en Netlify Functions
- Verificar dominio verificado en Resend

### Errores de RLS
- Verificar que el schema SQL se ejecutó completamente
- Verificar rol del usuario en tabla `users`

### Fotos no se suben
- Verificar Storage policies en Supabase
- Verificar que el bucket existe
- Ver logs en consola del navegador

## Mantenimiento

### Actualizar Código
```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Netlify auto-desplegará los cambios.

### Backup de Base de Datos
Supabase hace backups automáticos, pero puedes hacer manuales:
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

## Checklist Final

- [ ] Supabase proyecto creado y schema ejecutado
- [ ] Resend configurado y API key obtenida
- [ ] Código subido a GitHub
- [ ] Netlify conectado y desplegado
- [ ] Variables de entorno configuradas
- [ ] Super admin creado
- [ ] Empresa de prueba creada
- [ ] Técnico de prueba creado
- [ ] Formulario de prueba creado
- [ ] Reporte de prueba enviado exitosamente
- [ ] Email recibido correctamente
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL activo (verificar candado en navegador)

## ¡Deployment Completado! 🎉

Tu sistema está en producción y listo para usar.

Para soporte: admin@primelinecoffee.com
