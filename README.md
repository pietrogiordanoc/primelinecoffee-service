# Prime Line Coffee Service - Sistema de Gestión de Servicios Técnicos

Sistema completo de gestión de servicios técnicos desarrollado con React, TypeScript, Tailwind CSS, Supabase y Netlify.

## 🚀 Características Principales

- **🔐 Autenticación Multi-Rol**: Super Admin, Admin y Técnico
- **👥 Gestión de Técnicos**: CRUD completo de técnicos con asignación a empresas
- **🏢 Gestión de Empresas**: Administración de empresas clientes
- **📋 Form Builder Dinámico**: Crea formularios personalizados sin programar
- **📱 Interfaz Móvil**: Optimizada para técnicos en campo
- **📸 Optimización de Imágenes**: Compresión automática antes de enviar
- **📧 Notificaciones Email**: Sistema automático con Resend
- **📊 Dashboard Analytics**: KPIs y estadísticas en tiempo real
- **🗄️ Base de Datos Segura**: Supabase con RLS policies
- **☁️ Almacenamiento**: Supabase Storage para archivos

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** con TypeScript
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

1. Abre el SQL Editor en Supabase
2. Copia el contenido de `supabase/schema.sql`
3. Ejecuta el script
4. Verifica que todas las tablas y políticas se crearon correctamente

#### 3.3 Crear Bucket de Storage

1. Ve a Storage en Supabase
2. Verifica que el bucket `service-reports` existe
3. Configura las políticas de acceso (ya están en el schema)

### 4. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# App
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://tu-app.netlify.app

# Server-side only (para Netlify Functions)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
RESEND_API_KEY=re_tu_api_key
```

### 5. Configurar Resend

1. Crea una cuenta en [resend.com](https://resend.com)
2. Verifica tu dominio de email
3. Genera una API key
4. Actualiza `RESEND_API_KEY` en `.env`

### 6. Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, iniciar Netlify Functions
netlify dev
```

La aplicación estará disponible en `http://localhost:3000` (o el puerto que asigne Vite).

## 🚀 Deployment a Netlify

### 1. Conectar Repositorio

1. Sube el código a GitHub
2. Ve a [netlify.com](https://netlify.com)
3. Click en "Add new site" > "Import an existing project"
4. Conecta tu repositorio de GitHub

### 2. Configurar Build Settings

Netlify debería detectar automáticamente la configuración de `netlify.toml`, pero verifica:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Configurar Variables de Entorno en Netlify

Ve a Site Settings > Environment Variables y agrega:

```
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_APP_NAME=Prime Line Coffee Service
VITE_APP_URL=https://tu-app.netlify.app
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
RESEND_API_KEY=tu_resend_key
```

### 4. Deploy

1. Click en "Deploy site"
2. Espera a que termine el build
3. ¡Tu aplicación está en línea! 🎉

## 👤 Crear el Primer Usuario Super Admin

Después del deployment, necesitas crear el primer usuario manualmente en Supabase:

1. Ve a Authentication en Supabase
2. Click en "Add user" > "Create new user"
3. Ingresa email y password
4. Ve a Table Editor > `users`
5. Encuentra el usuario recién creado
6. Cambia el campo `role` a `super_admin`

Ahora puedes iniciar sesión con ese usuario.

## 📖 Guía de Uso

### Para Super Admins / Admins

#### Dashboard
- Ver estadísticas generales del sistema
- Revisar reportes recientes
- Monitorear actividad

#### Gestión de Técnicos
1. Ir a "Técnicos"
2. Click en "Agregar Técnico"
3. Llenar formulario con datos del técnico
4. El técnico recibirá sus credenciales

#### Gestión de Empresas
1. Ir a "Empresas"
2. Click en "Agregar Empresa"
3. Completar información de la empresa cliente
4. Asignar técnicos a empresas

#### Constructor de Formularios
1. Ir a "Formularios"
2. Click en "Nuevo Formulario"
3. Dar nombre y descripción
4. Click en "Ver campos" para agregar campos:
   - Texto corto/largo
   - Números, fechas, emails
   - Selección, radio, checkbox
   - Firma, archivos
5. Los técnicos verán estos formularios en su app móvil

#### Revisar Reportes
1. Ir a "Reportes"
2. Usar filtros para buscar
3. Ver detalles de cada reporte
4. Descargar PDF

### Para Técnicos (Mobile)

#### Llenar un Reporte
1. Abrir la app en el móvil
2. Seleccionar empresa asignada
3. Seleccionar tipo de servicio (formulario)
4. Llenar todos los campos requeridos
5. Tomar/subir fotos del servicio
6. Click en "Enviar Reporte"
7. El sistema enviará email automático

#### Ver Historial
- Tap en "Historial" en la barra inferior
- Ver todos los reportes enviados
- Revisar estado de cada reporte

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
