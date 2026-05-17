# 🔧 Guía de Administración - Control de Técnicos

## 👤 Gestión de Técnicos

### ➕ Crear Nuevo Técnico

1. Ir a **Panel Admin** → **Técnicos**
2. Click en **"Agregar Técnico"**
3. Llenar formulario:
   - **Nombre Completo:** Juan Pérez
   - **Email:** juan@primelinecoffee.com
   - **Contraseña:** TempPass123 (temporal)
   - **Teléfono:** (opcional)
4. Click **"Crear Técnico"**
5. ✅ El técnico ya puede hacer login

**💡 Recomendación:** Usa contraseñas temporales y pide al técnico que la cambie después.

---

### 🏢 Gestión de Empresas

**IMPORTANTE:** Por defecto, **todos los técnicos ven TODAS las empresas activas** automáticamente. No necesitas asignar empresas manualmente.

#### Acceso Automático

Cuando creas una empresa nueva en el Admin Panel:
- ✅ Se marca como activa (`is_active = true`)
- ✅ **Todos los técnicos la ven inmediatamente** en su app móvil
- ✅ Sin necesidad de asignación manual

#### (Opcional) Asignación Específica

La funcionalidad de asignación está disponible por si en el futuro necesitas **restringir** acceso:

1. Ir a **Panel Admin** → **Técnicos**
2. Click en el **botón de edificio 🏢** junto al técnico
3. Marcar/desmarcar empresas específicas

*Nota: Actualmente NO se usa este sistema. Todos ven todas las empresas.*

---

### ❌ Desactivar Técnico (Renuncia/Despido)

**Cuando un técnico deja la empresa:**

#### Método 1: Desactivar (Recomendado)
1. Ir a **Panel Admin** → **Técnicos**
2. Buscar al técnico
3. Click en el **toggle de estado** (ícono de usuario con X)
4. El técnico se marca como **"Inactivo"**

**Resultado:**
- ✅ El técnico **NO puede ver empresas**
- ✅ El técnico **NO puede crear reportes**
- ✅ Su historial se **conserva** (útil para auditorías)
- ✅ Puedes reactivarlo después si regresa

#### Método 2: Eliminar Completamente (Casos extremos)
Solo usa esto en casos de **robo de credenciales** o **seguridad crítica**.

1. Ir a **Supabase Dashboard**
2. **Authentication** → **Users**
3. Buscar al técnico por email
4. Click en **"..."** → **"Delete user"**
5. Confirmar eliminación

**Resultado:**
- ✅ La sesión se **invalida INMEDIATAMENTE** en todos los dispositivos
- ✅ El técnico **NO puede volver a hacer login**
- ❌ Se pierde el historial asociado (a menos que hayas hecho respaldo)

---

## 🔒 Escenarios de Seguridad

### 🚨 Escenario 1: Robo de Teléfono

**Acción inmediata:**
1. Desactivar al técnico (Método 1)
2. Cambiar su contraseña en Supabase (por seguridad)
3. Crear nueva cuenta cuando tenga nuevo teléfono

### 🚨 Escenario 2: Técnico Reporta Credenciales Comprometidas

**Acción inmediata:**
1. **Supabase Dashboard** → **Authentication** → Buscar usuario
2. Click **"Send password recovery"** → Envía email para resetear
3. O manualmente: Click usuario → **"Edit"** → Cambiar password

### 🚨 Escenario 3: Despido Masivo (Varios Técnicos)

**Opción A: Desde Panel Admin**
- Desactivar uno por uno desde el panel

**Opción B: SQL Directo (Más rápido)**
```sql
-- Desactivar múltiples técnicos por email
UPDATE technicians SET is_active = false
WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'tecnico1@empresa.com',
    'tecnico2@empresa.com',
    'tecnico3@empresa.com'
  )
);

-- También desactivar usuarios
UPDATE users SET is_active = false
WHERE email IN (
  'tecnico1@empresa.com',
  'tecnico2@empresa.com',
  'tecnico3@empresa.com'
);
```

---

## 📊 Monitoreo de Actividad

### Ver Actividad de Técnico
1. **Panel Admin** → **Reportes**
2. Filtrar por **técnico específico**
3. Ver todos sus reportes históricos

### Ver Último Login
```sql
-- Consulta SQL en Supabase
SELECT 
  u.full_name,
  u.email,
  u.is_active,
  au.last_sign_in_at
FROM users u
JOIN auth.users au ON au.id = u.id
WHERE u.role = 'technician'
ORDER BY au.last_sign_in_at DESC;
```

---

## 🔐 Políticas de Seguridad Recomendadas

### Contraseñas
- ✅ Mínimo 8 caracteres
- ✅ Incluir números y letras
- ✅ Cambiar cada 90 días (opcional)
- ✅ No reutilizar contraseñas anteriores

### Sesiones
- ✅ Configurar expiración a 30 días
- ✅ Forzar logout en casos críticos
- ✅ Revisar sesiones activas periódicamente

### Revisión de Acceso
- ✅ Cada 3 meses: Revisar lista de técnicos activos
- ✅ Cada 6 meses: Auditar asignaciones de empresas
- ✅ Anual: Resetear contraseñas de todos

---

## ⚙️ Configuración de Sesiones (Supabase)

### Cambiar Duración de Sesión

1. **Supabase Dashboard** → **Authentication** → **Configuration**
2. **JWT Settings:**
   - **JWT Expiry:** `86400` (24 horas)
   - **Refresh Token Expiry:** `2592000` (30 días)
3. Click **"Save"**

**Recomendado:**
- JWT Expiry: **24 horas** (para técnicos que usan la app a diario)
- Refresh Token: **30 días** (no necesitan re-login frecuente)

---

## 📋 Checklist: Onboarding de Técnico

- [ ] Crear cuenta en Panel Admin
- [ ] Asignar empresas correspondientes
- [ ] Enviar credenciales por email seguro
- [ ] Verificar que técnico pueda hacer login
- [ ] Verificar que ve solo sus empresas asignadas
- [ ] Solicitar instalación de app como PWA
- [ ] Capacitar en uso de formularios
- [ ] Hacer reporte de prueba supervisado

---

## 📋 Checklist: Offboarding de Técnico

- [ ] Desactivar cuenta en Panel Admin
- [ ] Remover asignaciones de empresas
- [ ] (Opcional) Exportar reportes del técnico para histórico
- [ ] (Si es crítico) Eliminar cuenta en Supabase
- [ ] Documentar fecha y motivo de salida
- [ ] Actualizar lista de técnicos activos

---

## 🆘 Respaldo de Emergencia: Resetear Contraseña Técnico

### Desde Supabase Dashboard (Más rápido)
1. **Supabase** → **Authentication** → **Users**
2. Buscar técnico por email
3. Click en el usuario
4. **Actions** → **"Send Magic Link"** o **"Send Password Recovery"**
5. Técnico recibe email con link para resetear

### Desde SQL (Avanzado)
```sql
-- Cambiar contraseña directamente (requiere hash)
-- NO RECOMENDADO, mejor usar el dashboard
```

---

## 📞 Contacto de Soporte

**Administrador Principal:**
- Email: admin@primelinecoffee.com
- Teléfono: [TU TELÉFONO]

**Soporte Técnico Supabase:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs

---

## ✅ Resumen: Flujo de Seguridad

```
TÉCNICO ACTIVO (is_active = true)
↓
Puede hacer login ✅
Puede ver empresas asignadas ✅
Puede llenar formularios ✅
Puede enviar reportes ✅

---

TÉCNICO DESACTIVADO (is_active = false)
↓
Puede hacer login ✅ (sesión existente)
PERO...
No puede ver empresas ❌ (RLS lo bloquea)
No puede llenar formularios ❌ (RLS lo bloquea)
No puede enviar reportes ❌ (RLS lo bloquea)
Ve pantalla vacía ⚠️

---

TÉCNICO ELIMINADO (cuenta borrada)
↓
No puede hacer login ❌
Sesión se invalida inmediatamente ❌
No existe en el sistema ❌
```

**Tu sistema tiene triple protección:**
1. **Autenticación** (Supabase Auth)
2. **RLS Policies** (Base de datos)
3. **is_active flag** (Control manual)

✅ **Es seguro, profesional y fácil de administrar.**
