# 🔐 Flujo de Seguridad y Acceso - Prime Line Coffee Service

## 📱 Acceso de Técnicos

### ✅ Flujo Profesional Recomendado

#### 1. **Login Único**
- El técnico accede a: `https://tu-dominio.com/login`
- Ingresa email y contraseña
- Supabase Auth guarda la sesión en localStorage/cookies
- **La sesión persiste por 7 días** (configurable en Supabase)

#### 2. **Instalación como App (PWA)**
Los técnicos pueden instalar la app en su móvil:

**Android:**
1. Abrir el sitio en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. La app se instala como app nativa

**iOS:**
1. Abrir en Safari
2. Botón compartir → "Añadir a pantalla de inicio"
3. Funciona como app nativa

**Ventajas:**
- ✅ Abre en pantalla completa (sin barra del navegador)
- ✅ Ícono en el escritorio como app nativa
- ✅ Acceso rápido con un toque
- ✅ Funciona offline (caché de navegador)

#### 3. **Sesión Persistente**
```
Primera vez:
1. Técnico hace login → Sesión guardada
2. Cierra la app

Próximas veces:
1. Abre la app → YA ESTÁ LOGUEADO automáticamente
2. Va directo a seleccionar empresa y llenar formularios
```

**No necesita volver a loguearse cada vez** mientras la sesión esté activa.

---

## 🔒 Seguridad: Control de Acceso

### ✅ Cómo Funciona la Protección

#### Escenario: Técnico abandona la empresa

**Paso 1: Desactivar al técnico**
```
Admin Panel → Técnicos → Click en el técnico → Toggle "Desactivar"
```

**Paso 2: El sistema automáticamente:**
```
1. Marca `is_active = false` en la base de datos
2. Las políticas RLS (Row Level Security) BLOQUEAN su acceso
3. No puede ver empresas asignadas
4. No puede crear nuevos reportes
5. No puede ver datos de otros técnicos
```

**Paso 3: Próximo intento de acceso del técnico**
```
1. Abre la app → Sesión sigue activa
2. Intenta cargar datos → RLS policies LO BLOQUEAN
3. Ve pantalla vacía o error
4. No puede hacer NADA
```

**Paso 4 (Opcional): Forzar logout**
Para ser más estricto, puedes:
```
1. Ir a Supabase Dashboard
2. Authentication → Users → Buscar al técnico
3. Click → "Remove user" (borra completamente su cuenta)
```

Esto **invalida su sesión inmediatamente** en todos los dispositivos.

---

## 🔐 Niveles de Seguridad Implementados

### 1. **Autenticación (Supabase Auth)**
- ✅ Email/Password
- ✅ Sesiones encriptadas
- ✅ Tokens JWT con expiración
- ✅ Refresh tokens automáticos

### 2. **Autorización (Row Level Security)**
```sql
-- Técnico SOLO puede ver empresas asignadas a él
CREATE POLICY "Technicians can view assigned companies"
  ON companies FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    id IN (
      SELECT company_id FROM technician_companies tc
      JOIN technicians t ON t.id = tc.technician_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Técnico SOLO puede crear reportes de sí mismo
CREATE POLICY "Technicians can insert reports"
  ON service_reports FOR INSERT
  WITH CHECK (
    technician_id IN (
      SELECT id FROM technicians WHERE user_id = auth.uid()
    )
  );
```

### 3. **Control de Estado (is_active)**
```typescript
// En cada carga de datos, se verifica is_active
const { data: technicians } = await supabase
  .from('technicians')
  .select('*')
  .eq('is_active', true); // Solo técnicos activos
```

### 4. **Rutas Protegidas (Frontend)**
```typescript
<ProtectedRoute allowedRoles={['technician']}>
  <TechnicianLayout />
</ProtectedRoute>
```

---

## 🎯 Flujo Completo: Técnico Usa la App

### Día 1: Configuración Inicial
```
1. Admin crea técnico:
   - Nombre: Juan Pérez
   - Email: juan@empresa.com
   - Contraseña: TempPass123

2. Admin asigna empresas al técnico:
   - Empresa A
   - Empresa B
   - Empresa C

3. Técnico recibe credenciales por email

4. Técnico abre: https://tu-dominio.com/login
   - Ingresa email/password
   - Click "Iniciar Sesión"

5. Sistema lo redirige a: /technician (panel móvil)

6. Técnico instala como PWA:
   - Chrome → Menú → "Agregar a pantalla de inicio"
```

### Día 2-365: Uso Diario
```
1. Técnico toca ícono de la app en su móvil
2. App abre automáticamente → YA ESTÁ LOGUEADO
3. Ve lista de empresas asignadas (A, B, C)
4. Selecciona empresa
5. Selecciona formulario (CF103)
6. Llena datos
7. Toma fotos
8. Envía reporte
9. Cierra app
```

**No necesita volver a loguearse** (sesión persiste 7 días).

### Día 366: Técnico Abandona la Empresa
```
1. Admin va a panel → Técnicos
2. Click en Juan Pérez → Toggle "Desactivar"
3. Sistema marca is_active = false

4. Próxima vez que Juan abre la app:
   - Sesión sigue activa PERO...
   - RLS policies bloquean todo
   - No puede ver empresas
   - No puede crear reportes
   - Ve pantalla vacía

5. (Opcional) Admin borra cuenta en Supabase:
   - Sesión se invalida inmediatamente
   - Próxima vez Juan intenta abrir → Redirigido a /login
   - No puede acceder con sus credenciales
```

---

## 📊 Comparación de Métodos

| Método | Seguridad | Facilidad | Recomendado |
|--------|-----------|-----------|-------------|
| **Login cada vez** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ❌ Tedioso |
| **Sesión persistente + is_active** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **MEJOR** |
| **Sesión persistente + RLS** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **MEJOR** |
| **Borrar cuenta Supabase** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Para casos críticos |

---

## 🔗 Acceso al Formulario CF103

### Opción 1: Link Directo (Simple)
```
https://tu-dominio.com/technician/report/00000000-0000-0000-0000-000000000103?company=COMPANY_ID
```

Pero **requiere login primero**.

### Opción 2: Flujo Recomendado (Actual)
```
1. Técnico hace login
2. Ve lista de empresas
3. Selecciona empresa
4. Ve lista de formularios (CF103 aparece aquí)
5. Click en CF103
6. Llena formulario
```

**Este es el flujo más profesional** porque:
- ✅ Valida que el técnico está asignado a esa empresa
- ✅ Valida que el formulario está activo
- ✅ Mantiene contexto (empresa seleccionada)
- ✅ Más seguro

---

## ⚙️ Configuración de Sesión en Supabase

### Cambiar Duración de Sesión
```
Supabase Dashboard → Authentication → Configuration

JWT Expiry: 3600 (1 hora)
Refresh Token Expiry: 604800 (7 días)

Recomendado para técnicos:
JWT Expiry: 86400 (24 horas)
Refresh Token Expiry: 2592000 (30 días)
```

---

## 🚨 Escenarios de Emergencia

### ¿Técnico reporta robo de teléfono?
```
1. Admin desactiva técnico inmediatamente
2. (Opcional) Borra cuenta en Supabase
3. Crea nueva cuenta con nueva contraseña
4. Técnico instala app en nuevo teléfono
```

### ¿Técnico olvida contraseña?
```
Opción 1: Admin resetea contraseña en Supabase Dashboard
Opción 2: Implementar "Olvidé mi contraseña" (flujo de Supabase Auth)
```

### ¿Múltiples técnicos despedidos?
```
Script SQL rápido:
UPDATE technicians SET is_active = false
WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'juan@empresa.com',
    'pedro@empresa.com',
    'maria@empresa.com'
  )
);
```

---

## ✅ Resumen: Sistema Actual es Seguro y Profesional

**Ya tienes implementado:**
- ✅ Autenticación robusta (Supabase Auth)
- ✅ Sesiones persistentes (no requiere login constante)
- ✅ RLS policies (protección a nivel de base de datos)
- ✅ Control is_active (desactivar técnicos)
- ✅ PWA ready (instalar como app nativa)

**Tu sistema es:**
- 🔒 **Seguro**: RLS + Auth + is_active = Triple capa de protección
- 📱 **Fácil**: Login una vez, usar por semanas
- 🚀 **Profesional**: Funciona como app nativa
- 🔄 **Controlable**: Desactivas técnicos en 2 clicks

**No necesitas cambiar nada**, solo documentar el flujo para tu equipo.
