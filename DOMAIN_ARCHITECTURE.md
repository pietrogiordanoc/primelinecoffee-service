# 🌐 Arquitectura de Dominio y Hosting
## Prime Line Coffee Service

**Fecha:** 2026-08-16  
**Versión:** 1.0

---

## 📋 INFORMACIÓN GENERAL

**Aplicación:** Prime Line Coffee Service - Sistema de Gestión de Servicio Técnico  
**Tipo:** Aplicación web interna (no pública)  
**Usuario final:** Técnicos, administradores, vendedores

---

## 🏗️ DIAGRAMA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                         USUARIO                             │
│         Escribe: coffeeservice.primelinecoffee.com         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  DNS (WIX)                                   │
│  Dominio: primelinecoffee.com                               │
│  ┌───────────────────────────────────────┐                 │
│  │ CNAME: coffeeservice                  │                 │
│  │ → primelinecoffee-service.netlify.app │                 │
│  └───────────────────────────────────────┘                 │
│  ┌───────────────────────────────────────┐                 │
│  │ TXT: subdomain-owner-verification     │                 │
│  │ → 6de7b812d42be863ac29d5b47c6e2a19    │                 │
│  └───────────────────────────────────────┘                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               NETLIFY CDN (HOSTING)                         │
│  URL: primelinecoffee-service.netlify.app                  │
│  Domain: coffeeservice.primelinecoffee.com (Primary)       │
│  ┌─────────────────────────────────────────────┐           │
│  │ ⚛️  React App (Build con Vite)              │           │
│  │ 📦 TypeScript + Tailwind CSS                │           │
│  │ 🔒 SSL/TLS (Let's Encrypt)                  │           │
│  │ 🚀 Deploy automático desde GitHub           │           │
│  └─────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────┐           │
│  │ ⚡ Netlify Functions (Serverless)          │           │
│  │    - create-admin.ts                        │           │
│  │    - create-technician.ts                   │           │
│  │    - delete-company.ts                      │           │
│  │    - send-report-email.ts                   │           │
│  │    - toggle-technician-status.ts            │           │
│  └─────────────────────────────────────────────┘           │
└──────┬──────────────────────────┬───────────────────────────┘
       │                          │
       ▼                          ▼
┌──────────────────┐    ┌──────────────────────────────┐
│   SUPABASE       │    │      RESEND                  │
│   (Backend)      │    │      (Email Service)         │
│                  │    │                              │
│ 🗄️  PostgreSQL   │    │ 📧 Email API                 │
│ 🔐 Auth          │    │ ✅ Domain verified:          │
│ 📂 Storage       │    │    primelinecoffee.com       │
│ 🛡️  RLS Policies │    │ 📨 Send report notifications │
│                  │    │                              │
└──────────────────┘    └──────────────────────────────┘
```

---

## 🔗 FLUJO DE CONEXIÓN DETALLADO

### 1️⃣ **Usuario Accede a la Aplicación**
```
Usuario → coffeeservice.primelinecoffee.com
```

### 2️⃣ **DNS Wix Resuelve el Dominio**
```
Wix DNS Server:
  - Busca registro CNAME "coffeeservice"
  - Retorna: primelinecoffee-service.netlify.app
```

### 3️⃣ **Netlify CDN Sirve la Aplicación**
```
Netlify CDN:
  - Entrega archivos desde el edge más cercano
  - Archivos estáticos (HTML, CSS, JS, imágenes)
  - Service Worker para funcionamiento offline
  - Headers de seguridad aplicados
```

### 4️⃣ **Aplicación React Carga en el Navegador**
```
React App:
  - Inicializa Supabase Client
  - Verifica sesión de usuario
  - Carga componentes según rol
```

### 5️⃣ **Usuario Se Autentica**
```
Supabase Auth:
  - Verifica email/password
  - Genera JWT token
  - Establece sesión segura
```

### 6️⃣ **Aplicación Consulta Datos**
```
Supabase Database:
  - RLS verifica permisos del usuario
  - Retorna solo datos autorizados
  - Empresas, técnicos, reportes, etc.
```

### 7️⃣ **Usuario Crea un Reporte**
```
1. Usuario completa formulario CF103/CF105
2. Sube fotos → Supabase Storage
3. Guarda datos → PostgreSQL con RLS
4. Netlify Function ejecuta send-report-email.ts
5. Resend envía email a admin
```

---

## 🗂️ ESTRUCTURA DE SERVICIOS

### 1. **DOMINIO (Wix)**
```
Proveedor: Network Solutions
Gestión DNS: Wix
Dominio Principal: primelinecoffee.com

Registros DNS:
┌─────────┬──────────────┬────────────────────────────────────┐
│ Tipo    │ Host         │ Valor                              │
├─────────┼──────────────┼────────────────────────────────────┤
│ CNAME   │ coffeeservice│ primelinecoffee-service.netlify.app│
│ TXT     │ subdomain... │ 6de7b812d42be863ac29d5b47c6e2a19   │
└─────────┴──────────────┴────────────────────────────────────┘
```

### 2. **HOSTING (Netlify)**
```
Plan: Free/Starter
Build: npm run build (Vite)
Deploy: Automático desde GitHub (main branch)

Dominios:
  ✅ primelinecoffee-service.netlify.app (Netlify subdomain)
  ⭐ coffeeservice.primelinecoffee.com (Primary domain)

SSL/TLS:
  📜 Let's Encrypt (renovación automática cada 90 días)
  🔒 HTTPS enforced

Headers de Seguridad:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Content-Security-Policy: (configurado)
  - X-Robots-Tag: noindex, nofollow
```

### 3. **BACKEND (Supabase)**
```
Servicios Usados:
  🗄️  Database: PostgreSQL 15
  🔐 Auth: Email/Password (JWT tokens)
  📂 Storage: Fotos, firmas (private bucket)
  🛡️  Security: Row Level Security (RLS)

Configuración:
  Site URL: https://coffeeservice.primelinecoffee.com
  
  Redirect URLs:
    - https://coffeeservice.primelinecoffee.com
    - https://coffeeservice.primelinecoffee.com/**
    - https://coffeeservice.primelinecoffee.com/auth/callback

Tablas Principales:
  - companies
  - technicians
  - reports
  - form_templates
  - email_logs
```

### 4. **EMAIL (Resend)**
```
Dominio Verificado: primelinecoffee.com
Uso: Notificaciones de reportes técnicos
Integración: Netlify Functions (send-report-email.ts)

Emails Enviados:
  - Notificación de reporte completado
  - PDF adjunto con detalles
  - Enviado a administradores
```

---

## 🔐 VARIABLES DE ENTORNO

### Netlify Environment Variables:
```env
VITE_SUPABASE_URL=https://[proyecto].supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key]
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://coffeeservice.primelinecoffee.com

SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
RESEND_API_KEY=[resend_key]
EMAIL_FROM=service@primelinecoffee.com
```

**⚠️ IMPORTANTE:** Estas variables están encriptadas en Netlify y nunca se exponen en el código frontend.

---

## 🛠️ STACK TECNOLÓGICO

### Frontend:
```
⚛️  React 18.2
📘 TypeScript 5.3
⚡ Vite 5.1
🎨 Tailwind CSS 3.4
📊 Recharts (gráficas)
📋 React Hook Form + Zod (formularios)
🌐 i18next (internacionalización EN/ES)
🔄 Zustand (state management)
📱 PWA (Progressive Web App)
```

### Backend:
```
🗄️  Supabase PostgreSQL
⚡ Netlify Functions (Node.js)
📧 Resend API
🔐 JWT Authentication
📦 Storage con signed URLs
```

### Build & Deploy:
```
🔧 npm/pnpm
📦 esbuild (bundling)
🚀 GitHub → Netlify (CI/CD automático)
🌍 CDN global de Netlify
```

---

## 📊 MÉTRICAS Y LÍMITES

### Netlify (Free Plan):
```
✅ Bandwidth: 100 GB/mes
✅ Build minutes: 300 min/mes
✅ Concurrent builds: 1
✅ Functions: 125K invocations/mes
✅ Edge Functions: 3M requests/mes
✅ SSL: Incluido gratis
```

### Supabase (Free Plan):
```
✅ Database: 500 MB
✅ Storage: 1 GB
✅ Bandwidth: 5 GB/mes
✅ Auth users: Ilimitado
✅ RLS: Incluido
```

### Resend (Free Plan):
```
✅ Emails: 3,000/mes
✅ Verified domain: 1
✅ API requests: Ilimitado
```

---

## 🔒 SEGURIDAD IMPLEMENTADA

### ✅ No-Index (Privacidad):
```html
<meta name="robots" content="noindex, nofollow">
```
```
X-Robots-Tag: noindex, nofollow
robots.txt: Disallow: /
```

### ✅ Headers HTTP de Seguridad:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [configurado]
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### ✅ Autenticación:
```
- Supabase JWT tokens
- Row Level Security (RLS)
- Session management
- Password hashing (bcrypt)
```

### ✅ Datos Sensibles:
```
- API keys en variables de entorno
- Storage privado con signed URLs
- HTTPS obligatorio
- No logging de datos sensibles
```

---

## 🚀 PROCESO DE DEPLOYMENT

### 1. Desarrollo Local:
```bash
npm run dev
# App corre en http://localhost:3000
```

### 2. Commit a GitHub:
```bash
git add .
git commit -m "Feature: Nueva funcionalidad"
git push origin main
```

### 3. Deploy Automático:
```
GitHub → Netlify detecta push → Build → Deploy → Live
Tiempo total: 2-4 minutos
```

### 4. Post-Deploy:
```
- Netlify genera preview URL
- Tests automáticos
- Deploy a producción
- CDN cache invalidation
```

---

## 📞 INFORMACIÓN DE CONTACTO Y SOPORTE

### Proveedores:
```
DNS:      Wix (soporte técnico 24/7)
Hosting:  Netlify (docs.netlify.com)
Backend:  Supabase (supabase.com/support)
Email:    Resend (resend.com/support)
```

### Dominios:
```
Registrar: Network Solutions
DNS:       Wix DNS Manager
```

---

## 📝 NOTAS IMPORTANTES

1. **SSL Certificate:** Let's Encrypt se renueva automáticamente cada 90 días
2. **DNS Propagation:** Cambios DNS toman 5 min - 48 horas
3. **Deploy Time:** Cada push a `main` genera deploy automático (2-4 min)
4. **Backup:** Supabase hace backups automáticos diarios
5. **Monitoring:** Revisar Netlify Analytics y Supabase Logs regularmente

---

## 🔄 ACTUALIZACIONES Y MANTENIMIENTO

### Revisión Mensual:
- ✅ Verificar certificado SSL vigente
- ✅ Revisar logs de errores en Netlify
- ✅ Verificar uso de recursos (bandwidth, functions)
- ✅ Actualizar dependencias npm

### Revisión Trimestral:
- ✅ Auditoría de usuarios y permisos
- ✅ Revisar políticas RLS en Supabase
- ✅ Verificar backups funcionando
- ✅ Análisis de seguridad

---

**Última actualización:** 2026-08-16  
**Próxima revisión:** 2026-09-16
