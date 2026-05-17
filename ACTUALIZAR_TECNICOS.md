# 👥 Actualizar Técnicos - Mayo 2026

## 📋 Cambios Solicitados

### ❌ Remover:
- Andy Hernandez (andy.hernandez@primelinedist.com)

### ✅ Agregar:
- Luis Diaz (luis.diaz@primelinedist.com)
- Ronny Benjamin (ronny.benjamin@primelinedist.com)
- Elias Monnot (elias.monnot@primelinedist.com)

---

## 🚀 Método 1: Admin Panel (Más Fácil - Recomendado)

### Paso 1: Desactivar Andy Hernandez

1. Ve a: https://primelinecoffee-service.netlify.app/admin/technicians
2. Busca **"Andy Hernandez"** en la lista
3. En la columna "Actions", click en el **icono UserX** (desactivar)
4. ✅ Andy queda inactivo (no puede hacer login pero mantiene historial)

---

### Paso 2: Agregar Luis Diaz

1. En la página de Technicians, click **"Add Technician"**
2. Llenar formulario:
   - **Full Name:** Luis Diaz
   - **Email:** luis.diaz@primelinedist.com
   - **Password:** TempPass123
   - **Phone:** (opcional)
3. Click **"Create Technician"**
4. ✅ Luis Diaz creado con ID automático (TECH-009)

---

### Paso 3: Agregar Ronny Benjamin

1. Click **"Add Technician"** nuevamente
2. Llenar:
   - **Full Name:** Ronny Benjamin
   - **Email:** ronny.benjamin@primelinedist.com
   - **Password:** TempPass123
   - **Phone:** (opcional)
3. Click **"Create Technician"**
4. ✅ Ronny Benjamin creado con ID automático (TECH-010)

---

### Paso 4: Agregar Elias Monnot

1. Click **"Add Technician"** nuevamente
2. Llenar:
   - **Full Name:** Elias Monnot
   - **Email:** elias.monnot@primelinedist.com
   - **Password:** TempPass123
   - **Phone:** (opcional)
3. Click **"Create Technician"**
4. ✅ Elias Monnot creado con ID automático (TECH-011)

---

## 🔐 Contraseñas Temporales

Todos los nuevos técnicos tienen:
- **Contraseña:** TempPass123

⚠️ **IMPORTANTE:** Pídeles que cambien su contraseña después del primer login

---

## 🛠️ Método 2: Script Automático (Avanzado)

Si prefieres automatizar la creación:

```bash
node supabase/update-technicians.js
```

Esto creará los 3 técnicos automáticamente via Netlify Functions.

**Nota:** Aún necesitas desactivar a Andy manualmente desde el Admin Panel.

---

## 📊 Método 3: SQL Directo (Solo si tienes permisos)

Si tienes acceso directo a la base de datos:

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta el script: `supabase/update-technicians.sql`

⚠️ **Advertencia:** Requiere permisos de service_role. El Admin Panel es más seguro.

---

## ✅ Verificación Final

Después de hacer los cambios:

1. Ve a https://primelinecoffee-service.netlify.app/admin/technicians
2. Verifica que veas:
   - ❌ Andy Hernandez (Status: **Inactive**)
   - ✅ Luis Diaz (Status: **Active**)
   - ✅ Ronny Benjamin (Status: **Active**)
   - ✅ Elias Monnot (Status: **Active**)

---

## 📱 Prueba de Login

Los nuevos técnicos pueden hacer login en:
- https://primelinecoffee-service.netlify.app/login

Credenciales:
- **Email:** su email
- **Password:** TempPass123

---

## 💡 Tip Pro

Si quieres **eliminar completamente** a Andy (en lugar de solo desactivar):

1. Admin Panel → Technicians
2. Busca Andy Hernandez
3. Click en el **icono de basura (Trash)** 
4. Confirma la eliminación

⚠️ Esto borra su historial. Recomendamos solo **desactivar** para mantener auditoría.

---

## 🎯 Resumen Rápido

```
✅ TODO:
1. Desactivar Andy desde Admin Panel
2. Crear Luis Diaz con email luis.diaz@primelinedist.com
3. Crear Ronny Benjamin con email ronny.benjamin@primelinedist.com
4. Crear Elias Monnot con email elias.monnot@primelinedist.com
5. Todos con contraseña temporal: TempPass123
```

🎉 ¡Listo!
