# Prime Line Coffee Service - Technical Service Management System

Complete technical service management system built with React, TypeScript, Tailwind CSS, Supabase, and Netlify.

## 🚀 Main Features

- **🔐 Multi-Role Authentication**: Super Admin, Admin, and Technician
- **👥 Technician Management**: Complete CRUD for technicians with company assignment
- **🏢 Company Management**: Administration of client companies
- **📋 Dynamic Form Builder**: Create custom forms without coding
- **📱 Mobile Interface**: Optimized for field technicians
- **📸 Image Optimization**: Automatic compression before sending
- **📧 Email Notifications**: Automatic system with Resend
- **📊 Dashboard Analytics**: KPIs and real-time statistics
- **🗄️ Secure Database**: Supabase with RLS policies
- **☁️ Storage**: Supabase Storage for files

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Hook Form** + **Zod** - Forms & validation
- **React Router** - Routing
- **Lucide React** - Icons
- **Recharts** - Charts
- **date-fns** - Date utilities
- **browser-image-compression** - Image optimization

### Backend & Infrastructure
- **Supabase** - Database, Auth, Storage
- **Netlify** - Hosting & Functions
- **Resend** - Email API
- **PostgreSQL** - Database (via Supabase)

## 📁 Estructura del Proyecto

```
prime-line-coffee-service/
├── src/
│   ├── components/
│   │   ├── auth/           # Componentes de autenticación
│   │   ├── layouts/        # Layouts (Admin, Técnico)
│   │   └── ui/             # Componentes UI reutilizables
│   ├── pages/
│   │   ├── admin/          # Páginas del panel admin
│   │   ├── auth/           # Login
│   │   └── technician/     # Páginas del técnico
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilidades
│   ├── lib/                # Configuración (Supabase)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── netlify/
│   └── functions/          # Serverless functions
├── supabase/
│   └── schema.sql          # Database schema
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── netlify.toml
```

## 🔧 Configuración e Instalación

### 1. Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Supabase
- Cuenta de Netlify
- Cuenta de Resend (para emails)

### 2. Clonar e Instalar Dependencias

```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias de Netlify Functions
cd netlify/functions
npm install
cd ../..
```

### 3. Configurar Supabase

#### 3.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Guarda tu URL y las API keys

#### 3.2 Ejecutar el Schema SQL

1. Open SQL Editor in Supabase
2. Copy content from `supabase/schema.sql`
3. Run the script
4. Verify all tables and policies were created correctly

#### 3.3 Create Storage Bucket

1. Go to Storage in Supabase
2. Verify that the `service-reports` bucket exists
3. Configure access policies (already in schema)

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# App
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://your-app.netlify.app

# Server-side only (for Netlify Functions)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=re_your_api_key
```

### 5. Configure Resend

1. Create account at [resend.com](https://resend.com)
2. Verify your email domain
3. Generate an API key
4. Update `RESEND_API_KEY` in `.env`

### 6. Local Development

```bash
# Start development server
npm run dev

# In another terminal, start Netlify Functions
netlify dev
```

The app will be available at `http://localhost:3000` (or the port Vite assigns).

## 🚀 Deploy to Netlify

### 1. Connect Repository

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" > "Import an existing project"
4. Connect your GitHub repository

### 2. Configure Build Settings

Netlify should automatically detect the `netlify.toml` configuration, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Configure Environment Variables in Netlify

Go to Site Settings > Environment Variables and add:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://your-app.netlify.app
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
```

### 4. Deploy

1. Click "Deploy site"
2. Wait for the build to complete
3. Your app is live! 🎉

## 👤 Create First Super Admin User

After deployment, create the first user manually in Supabase:

1. Go to Authentication in Supabase
2. Click "Add user" > "Create new user"
3. Enter email and password
4. Go to Table Editor > `users`
5. Find the newly created user
6. Change the `role` field to `super_admin`

Now you can log in with that user.

## 📖 Usage Guide

### For Super Admins / Admins

#### Dashboard
- View general system statistics
- Review recent reports
- Monitor activity

#### Technician Management
1. Go to "Technicians"
2. Click "Add Technician"
3. Fill form with technician data
4. Technician will receive credentials

#### Company Management
1. Go to "Companies"
2. Click "Add Company"
3. Complete client company information
4. Assign technicians to companies

#### Form Builder
1. Go to "Forms"
2. Click "New Form"
3. Enter name and description
4. Click "View fields" to add fields:
   - Short/long text
   - Numbers, dates, emails
   - Selection, radio, checkbox
   - Signature, files
5. Technicians will see these forms in their mobile app

#### Review Reports
1. Go to "Reports"
2. Use filters to search
3. View details of each report
4. Download PDF

### For Technicians (Mobile)

#### Fill a Report
1. Open app on mobile
2. Select assigned company
3. Select service type (form)
4. Fill all required fields
5. Take/upload service photos
6. Click "Submit Report"
7. System sends automatic email

#### View History
- Tap "History" in bottom navigation
- View all submitted reports
- Review status of each report

## 🔐 Seguridad

- **RLS (Row Level Security)**: Todas las tablas tienen políticas de seguridad
- **Autenticación**: Supabase Auth con JWT
- **Roles**: Control de acceso basado en roles
- **Storage**: Archivos privados con URLs firmadas
- **API Keys**: Variables de entorno seguras
- **HTTPS**: Todo el tráfico encriptado

## 📸 Optimización de Imágenes

El sistema optimiza automáticamente las fotos:

- Máximo: 1500x1500px
- Formato: JPEG/WebP
- Calidad: 75%
- Tamaño objetivo: 200-700KB
- Máximo: 1MB por imagen

Si las fotos pesan más de 12MB en total, se envían enlaces de descarga en vez de adjuntos.

## 📧 Sistema de Emails

Los emails se envían automáticamente cuando:
- Un técnico envía un reporte

Configuración de destinatarios en la tabla `system_settings`:

```sql
UPDATE system_settings
SET setting_value = '{"enabled": true, "recipients": ["admin@empresa.com", "manager@empresa.com"]}'
WHERE setting_key = 'email_notifications';
```

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que `.env` tenga `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Reinicia el servidor de desarrollo

### Error al enviar emails
- Verifica que `RESEND_API_KEY` esté configurada
- Verifica que el dominio esté verificado en Resend
- Revisa logs en Netlify Functions

### Imágenes no se suben
- Verifica políticas de Storage en Supabase
- Verifica que el bucket `service-reports` exista
- Revisa permisos de storage policies

### Usuario no puede iniciar sesión
- Verifica que el usuario exista en `auth.users`
- Verifica que tenga un registro en la tabla `users`
- Verifica que el rol sea correcto

## 📝 TODO / Mejoras Futuras

- [ ] Modo offline para técnicos
- [ ] Exportar reportes a PDF mejorado
- [ ] Dashboard con más gráficos
- [ ] Notificaciones push
- [ ] Multi-idioma (i18n)
- [ ] Firma digital en reportes
- [ ] Geolocalización de servicios
- [ ] App móvil nativa (React Native)

## 🤝 Soporte

Para soporte o consultas:
- Email: support@primelinecoffee.com
- GitHub Issues: [Crear issue]

## 📄 Licencia

© 2026 Prime Line Coffee Service. Todos los derechos reservados.

---

**Desarrollado con ❤️ para Prime Line Coffee Service**
