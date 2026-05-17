# 🔧 Guía Rápida: Asignar Empresas a Técnicos

## Problema que resuelve
Los técnicos solo ven empresas que les han sido asignadas explícitamente. Si creaste una empresa pero el técnico no la ve en su app móvil, es porque falta asignarla.

---

## ✅ Solución 1: Desde el Admin Panel (Interfaz)

### Pasos:

1. **Ir a la página de Técnicos**
   - Login como administrador
   - Click en "Technicians" en el menú lateral

2. **Buscar el técnico**
   - Encuentra el técnico en la lista

3. **Click en el botón de edificio** 🏢
   - En la columna "Actions", click en el icono de edificio (Building2)
   - Se abrirá el modal "Assign Companies"

4. **Seleccionar empresas**
   - Verás una lista de todas las empresas activas
   - Click en el checkbox de cada empresa que quieras asignar
   - Las empresas asignadas se marcarán en azul con la etiqueta "Assigned"

5. **Guardar**
   - Click en "Done"
   - Los cambios se guardan automáticamente

6. **Verificar**
   - El técnico debe cerrar sesión y volver a entrar
   - O simplemente refrescar la página
   - Ahora verá las empresas asignadas en su app

---

## 🚀 Solución 2: SQL Directo (Rápido)

Si prefieres SQL, usa el archivo `supabase/assign-companies-to-technician.sql`:

```sql
-- 1. Ver técnicos disponibles
SELECT 
  t.id as technician_id,
  u.full_name,
  u.email
FROM technicians t
JOIN users u ON u.id = t.user_id
WHERE t.is_active = true;

-- 2. Ver empresas disponibles
SELECT 
  id as company_id,
  name,
  city
FROM companies
WHERE is_active = true;

-- 3. Asignar empresa a técnico
INSERT INTO technician_companies (technician_id, company_id)
VALUES (
  'PEGA_TECHNICIAN_ID_AQUI',
  'PEGA_COMPANY_ID_AQUI'
);

-- 4. Verificar asignación
SELECT 
  u.full_name as technician,
  c.name as company,
  tc.assigned_at
FROM technician_companies tc
JOIN technicians t ON t.id = tc.technician_id
JOIN users u ON u.id = t.user_id
JOIN companies c ON c.id = tc.company_id
ORDER BY tc.assigned_at DESC;
```

---

## 📋 Checklist: Flujo Completo

Para que un técnico pueda llenar reportes:

- [ ] ✅ Crear técnico (ya hecho)
- [ ] ✅ Crear empresa (ya hecho)
- [ ] ⚠️ **ASIGNAR empresa a técnico** (este paso faltaba!)
- [ ] ✅ Crear formulario dinámico CF103 (ya creado el SQL)
- [ ] ⏳ Ejecutar `seed-cf103-form.sql` en Supabase
- [ ] ✅ Técnico puede ver empresa en su app
- [ ] ✅ Técnico puede seleccionar CF103 y llenar reporte

---

## 🔍 Troubleshooting

### "No companies" en la app del técnico

**Causa:** El técnico no tiene empresas asignadas en `technician_companies`

**Solución:** Usar el botón 🏢 en la página de Technicians para asignar

---

### El técnico no ve la empresa recién asignada

**Causa:** Necesita refrescar la sesión

**Solución:** 
- Cerrar sesión y volver a entrar
- O simplemente refrescar la página (F5)

---

### No aparecen empresas en el modal de asignación

**Causa:** No hay empresas activas (`is_active = true`)

**Solución:** 
1. Ir a Companies
2. Verificar que existan empresas
3. Crear empresas si es necesario

---

## 🎯 Características del Modal de Asignación

✅ Muestra todas las empresas activas  
✅ Checkbox para activar/desactivar asignaciones  
✅ Cambios se guardan instantáneamente  
✅ Muestra contador de empresas asignadas  
✅ Filtro automático por `is_active = true`  
✅ Empresas asignadas se marcan visualmente  

---

## 🔐 Seguridad

- Solo administradores pueden asignar empresas
- RLS policy: técnicos solo ven SUS empresas asignadas
- La tabla `technician_companies` controla el acceso
- Si quitas la asignación, el técnico pierde acceso inmediato

---

## 📱 Próximos Pasos

Ahora que tienes la funcionalidad de asignación:

1. **Asigna las empresas** que creaste al técnico
2. **Ejecuta el seed CF103**: `seed-cf103-form.sql` en Supabase
3. **Prueba el flujo completo**: 
   - Login como técnico
   - Selecciona empresa
   - Selecciona formulario CF103
   - Llena el reporte
   - Sube fotos
   - Firma
   - Submit

---

## 💡 Tip Pro

Para asignar múltiples técnicos a una empresa rápidamente:

```sql
-- Asignar todos los técnicos activos a una empresa
INSERT INTO technician_companies (technician_id, company_id)
SELECT t.id, 'ID_DE_LA_EMPRESA'::uuid
FROM technicians t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM technician_companies tc 
    WHERE tc.technician_id = t.id 
    AND tc.company_id = 'ID_DE_LA_EMPRESA'::uuid
  );
```

---

🎉 **¡Listo!** Ahora puedes asignar empresas a técnicos desde el Admin Panel.
