# Sales Representative Role - Complete Integration Guide

## 📋 Overview

Se ha implementado el rol **Sales Representative** (Representante de Ventas) en la aplicación. Este rol permite:

- Crear usuarios con rol de Sales Representative
- Conectar Sales Reps con reportes de servicio
- Visualizar qué Sales Rep solicitó cada servicio
- Filtrar y gestionar Sales Reps desde el panel de administración

## 🔧 Implementación Realizada

### 1. **Base de Datos (SQL)**
- ✅ Nuevo valor `sales_representative` en el enum `user_role`
- ✅ Nueva columna `sales_representative_id` en tabla `service_reports`
- ✅ Índice para optimización de queries
- ✅ Vista `report_summary` actualizada para incluir datos del Sales Rep
- ✅ Política RLS para que Sales Reps puedan ver sus propios reportes

### 2. **TypeScript Types**
- ✅ `UserRole` actualizado: `'super_admin' | 'admin' | 'technician' | 'sales_representative'`
- ✅ `ServiceReport` con campo `sales_representative_id?: string`
- ✅ `ReportSummary` con campos `sales_rep_id`, `sales_rep_name`, `sales_rep_email`

### 3. **Frontend - Staff Management**
Archivo: `src/pages/admin/Technicians.tsx`
- ✅ Filtro "Sales Reps" en vista de staff
- ✅ Badge naranja para identificar Sales Reps
- ✅ Dropdown de roles actualizado con "Sales Representative"
- ✅ Validación Zod actualizada

### 4. **Frontend - Report Creation**
Archivo: `src/pages/technician/FillReport.tsx`
- ✅ Selector de Sales Representative al crear reporte
- ✅ Carga automática de lista de Sales Reps activos
- ✅ Campo opcional con texto de ayuda "Who requested this service?"
- ✅ Campo incluido en el insert a la base de datos

### 5. **Frontend - Reports View**
Archivo: `src/pages/admin/Reports.tsx`
- ✅ Nueva columna "Sales Rep" en tabla de reportes
- ✅ Muestra nombre y email del Sales Rep
- ✅ Muestra "-" si no hay Sales Rep asignado

## 🚀 Pasos para Activar

### **PASO 1: Ejecutar Migración SQL en Supabase** ⚠️ CRÍTICO

**IMPORTANTE:** Esta migración debe ejecutarse en **DOS PASOS** porque PostgreSQL requiere que los valores ENUM se "commiteen" antes de usarlos.

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Abre **SQL Editor** (menú lateral)
3. Crea una nueva query

**Ejecuta PASO 1 primero:**
```sql
-- PASO 1: Agregar valor al ENUM
ALTER TYPE user_role ADD VALUE 'sales_representative';
```
- Click **RUN**
- Espera a que diga "Success"

**Luego ejecuta PASO 2:**
```sql
-- PASO 2: Agregar columna, índices y políticas

ALTER TABLE service_reports
ADD COLUMN IF NOT EXISTS sales_representative_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_reports_sales_rep ON service_reports(sales_representative_id);

COMMENT ON COLUMN service_reports.sales_representative_id IS 'The sales representative who requested this service for the company';

CREATE POLICY "Sales reps can view their own reports"
  ON service_reports FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'sales_representative' AND
    sales_representative_id = auth.uid()
  );

GRANT SELECT ON service_reports TO authenticated;

DROP VIEW IF EXISTS public.report_summary;

CREATE VIEW public.report_summary AS
SELECT
  sr.id,
  sr.status,
  sr.created_at,
  sr.submitted_at,
  df.name AS form_name,
  c.name AS company_name,
  u.full_name AS technician_name,
  u.email AS technician_email,
  sales_rep.id AS sales_rep_id,
  sales_rep.full_name AS sales_rep_name,
  sales_rep.email AS sales_rep_email,
  (SELECT COUNT(*) FROM public.report_photos WHERE report_id = sr.id) AS photo_count
FROM public.service_reports sr
JOIN public.dynamic_forms df ON df.id = sr.form_id
JOIN public.companies c ON c.id = sr.company_id
JOIN public.technicians t ON t.id = sr.technician_id
JOIN public.users u ON u.id = t.user_id
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id;

GRANT SELECT ON public.report_summary TO authenticated;
```
- Click **RUN**
- Espera a que termine

**O usa el archivo completo** con instrucciones: `supabase/add-sales-representative-role.sql`

### **PASO 2: Verificar en la App**

Una vez ejecutada la migración SQL, la aplicación ya está lista:

1. **Crear Sales Reps:**
   - Ve a Admin → Staff
   - Click "Add Staff Member"
   - Llena el formulario y selecciona rol "Sales Representative"

2. **Asignar a Reportes:**
   - Los técnicos verán un nuevo campo "Sales Representative" al crear reportes
   - Pueden seleccionar quién solicitó el servicio (opcional)

3. **Ver en Reportes:**
   - Admin → Reports
   - Nueva columna "Sales Rep" muestra el nombre del sales representative

## 📊 Modelo de Datos

```
┌─────────────────┐         ┌──────────────────┐
│     users       │         │ service_reports  │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │◄────────│ sales_rep_id (FK)│
│ email           │         │ technician_id    │
│ full_name       │         │ company_id       │
│ role            │         │ form_id          │
│ ├ super_admin   │         │ form_data        │
│ ├ admin         │         │ status           │
│ ├ technician    │         │ created_at       │
│ └ sales_rep ✨  │         └──────────────────┘
└─────────────────┘
```

## 🎨 UI/UX Improvements

### **Badge Colors por Rol:**
- 🟣 **Super Admin** - Purple
- 🔵 **Manager** - Blue
- 🟠 **Sales Rep** - Orange ✨ NUEVO
- 🟢 **Technician** - Green

### **Filtros:**
- Nuevo botón "Sales Reps" en vista de staff
- Filtra solo usuarios con rol sales_representative

### **Formulario de Reporte:**
```
Service Information
├─ Date
├─ Technician Name
├─ Customer Name
├─ Customer Email
├─ Property
├─ Service Type
└─ Sales Representative ✨ NUEVO
   └─ Dropdown con Sales Reps activos
   └─ Campo opcional
   └─ Hint: "Who requested this service?"
```

## 🔐 Permisos y Seguridad

### **Sales Representatives pueden:**
- ✅ Ver reportes donde ellos son el Sales Rep asignado
- ❌ NO pueden crear reportes (solo técnicos)
- ❌ NO pueden editar reportes
- ❌ NO pueden eliminar reportes

### **Técnicos pueden:**
- ✅ Crear reportes y asignar Sales Rep

### **Admins pueden:**
- ✅ Ver todos los reportes con Sales Rep info
- ✅ Crear/editar/eliminar Sales Reps
- ✅ Filtrar reportes por Sales Rep

## ✅ Checklist de Implementación

- [x] SQL Migration creada
- [x] Types TypeScript actualizados
- [x] Staff management actualizado
- [x] Form de reportes actualizado
- [x] Vista de reportes actualizada
- [x] Build exitoso
- [x] Código deployado a GitHub
- [ ] **SQL ejecutado en Supabase** ⚠️ PENDIENTE
- [ ] Sales Reps creados para pruebas

## 🧪 Testing

Una vez ejecutada la migración SQL:

1. **Crear Sales Rep:**
   ```
   - Ir a Admin → Staff
   - Add Staff Member
   - Name: "John Sales"
   - Email: "john@sales.com"
   - Role: Sales Representative
   ```

2. **Crear Reporte con Sales Rep:**
   ```
   - Login como técnico
   - Crear nuevo reporte
   - Seleccionar Sales Rep del dropdown
   - Enviar reporte
   ```

3. **Verificar en Reports:**
   ```
   - Admin → Reports
   - Ver columna "Sales Rep"
   - Debe mostrar "John Sales"
   ```

## 📝 Notas Importantes

- **Campo Opcional:** El Sales Rep es opcional, reportes sin Sales Rep mostrarán "-"
- **Retrocompatibilidad:** Reportes antiguos no tendrán Sales Rep (null)
- **Performance:** Se agregó índice para queries rápidas
- **Vista Actualizada:** report_summary incluye LEFT JOIN para incluir reportes sin Sales Rep

## 🔗 Commits

- [f36e343](https://github.com/pietrogiordanoc/primelinecoffee-service/commit/f36e343) - Add Sales Representative role - Complete integration with reports

## 🆘 Troubleshooting

**Problema:** No veo el rol Sales Representative en el dropdown
- **Solución:** Ejecuta la migración SQL primero

**Problema:** Error al crear Sales Rep
- **Solución:** Verifica que la migración SQL se ejecutó correctamente

**Problema:** Columna Sales Rep no aparece en Reports
- **Solución:** Refresca la página, el frontend ya está actualizado

## 📞 Próximos Pasos

1. ✅ Ejecutar SQL migration en Supabase
2. ✅ Crear primeros Sales Reps
3. ✅ Asignar a reportes existentes (opcional)
4. 📊 Considerar agregar filtro por Sales Rep en Reports
5. 📊 Agregar métricas de Sales Reps en Dashboard
