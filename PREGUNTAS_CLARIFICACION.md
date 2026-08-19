# Preguntas de Clarificación - Lista de Tareas

## ✅ LO QUE ENTIENDO

### Cambios de Terminología
- **Company → Customers**: Cambiar en todo el sistema
- **Staff → Coffee Staff**: Cambiar nomenclatura
- **Todo en inglés**: Eliminar completamente el español del sistema

### Funcionalidad de Admin
- Los admin deben poder crear reportes también (no solo técnicos)
- Quitar el "Version mode" de arriba izquierda
- Los reportes creados por admin deben estar claramente identificados como tales

### Gestión de Customers
- Técnicos pueden agregar customers (empresas)
- Sistema debe detectar duplicados y advertir
- Asignar código único a cada customer
- Permitir mismo nombre pero diferentes sucursales (no duplicar, cambiar sucursal)
- Si un tech crea customer incompleto: alertas en reporte, listing, y email a admin

### Sistema de Log/Tracking
- Todas las correcciones deben generar log (quién hizo qué)
- Visible en listing de history y al pie del reporte
- Técnicos solo ven su propio history

### Formulario CF103
- "Property (Ficha General)" debe tener PLD seleccionado por defecto
- Agregar campo "Owner"
- Agregar "Installation" a Service Type (mover a ficha general)
- Draft no guarda la firma actualmente (bug)
- Error al enviar después de draft (bug)

### Formulario CF105
- Agregar opciones: ICE TEA, HOTWATER, COLD BREW, AFFICIONADO
- Lógica: Si usa pressure pack → no tiene grinder (resolver condiciones)

### Lista de Partes
- Enviarán lista de partes para buscador
- Opción "Other" para entrada manual
- "Other" genera alerta para admin

### Vista Mobile (Técnico)
- Listing de empresa debe mostrar: dirección, ubicación, teléfono (no solo fecha)
- Quitar leyenda "draft (1)" - ruido visual innecesario
- En listing history: cabe más información en la línea

### Otras Correcciones
- Firma de customer NO es obligatoria
- Versión pública del share report no muestra enmiendas (bug)
- Listing ADMIN STAFF no muestra etiquetas de colores por rol (bug)
- Sistema de crear users debe funcionar desde admin dashboard (no hardcoded)
- Función "forgot password" independiente

### Nueva Sección
- Agregar Help/Guide para admin y tech
- Incluir códigos de máquinas
- Onier puede cargar información desde admin

---

## ❓ PREGUNTAS Y ACLARACIONES NECESARIAS

### 1. PÁGINA DE CREACIÓN DE REPORTES PARA ADMIN ✅ ACLARADO

**Punto 1-1.2:**

**ACLARACIÓN RECIBIDA:**
- ✅ **ELIMINAR el toggle de "Technician mode"** - Era idea inicial, ahora obsoleto, quitarlo completamente
- ✅ **Agregar "Create Report" como opción nueva en el menú lateral (sidebar) para ADMIN**
- ✅ **Funciona igual que los técnicos** pero con diferencias de ubicación:
  - **Admin**: "Create Report" aparece en el **left browser/sidebar**
  - **Tech**: "Create Report" está en el **home** (mantienen su flujo igual)
- ✅ **Armonizar y homologar terminología** entre ambas versiones
- ✅ **Identificación del creador** - Cambiar el label del campo según quién creó el reporte:
  - Si lo crea **Admin**: El campo debe decir "**Administrator**" (no "Technician")
  - Si lo crea **Tech**: El campo dice "**Technician**" (como está actualmente)
  - **NO agregar paréntesis al nombre**, solo cambiar la etiqueta del campo

**EJEMPLO:**
```
Actual:     Technician: Pietro Giordano
Si Admin:   Administrator: Pietro Giordano
Si Tech:    Technician: Pietro Giordano
```

- ✅ **Mobile para Admin**: Botón "Create Report" debe estar en el **footer bar (bottom navigation)**
  - **Label/Ícono**: "+ New Report"
  - **Es un botón ADICIONAL** (no reemplaza ningún botón existente)

✅ **PUNTO 1 COMPLETAMENTE ACLARADO**

### 2. IDENTIFICACIÓN DE REPORTES CREADOS POR ADMIN

**Punto 1.3:**
- "Ponerlo en todos lados" - ¿Específicamente dónde?:
  - ✓ En el PDF del reporte
  - ✓ En el listing de reportes
  - ✓ En la vista detalle del reporte
  - ✓ En los emails
  - ¿Algún otro lugar?
- ¿Cómo quieres que se muestre? Ejemplo:
  - "Created by: Admin Name"
  - "Report created by Admin"
  - Badge/etiqueta visual con color específico?

### 3. DETECCIÓN DE DUPLICADOS EN CUSTOMERS

**Punto 3:**
- ¿Qué campos deben compararse para detectar duplicación?:
  - ¿Solo nombre?
  - ¿Nombre + dirección?
  - ¿Nombre + teléfono?
- ¿La advertencia debe ser un modal que bloquea, o solo una advertencia que permite continuar?
- Si se detecta posible duplicado, ¿mostrar lista de coincidencias para que el usuario confirme si es el mismo o no?

### 4. GESTIÓN DE SUCURSALES

**Punto 6:**
- Actualmente, ¿existe un campo "sucursal" en el modelo de Customer?
- ¿Cómo debería funcionar el flujo?:
  - Opción A: Al crear customer, buscar si existe nombre similar → si existe, preguntar "¿Es otra sucursal de [nombre]?"
  - Opción B: Al crear customer, elegir si es "Nuevo Customer" o "Nueva Sucursal de existente"
- ¿La sucursal debe tener su propio código único o comparte parte del código del customer principal?
- ¿Un técnico puede ser asignado a una sucursal específica o al customer completo?

### 5. CÓDIGO ÚNICO DE CUSTOMER

**Punto 5:**
- ¿Qué formato debe tener el código?
  - Ejemplo: CUS-001, CUST001, C-00001, etc.
- ¿Debe ser secuencial numérico o puede incluir letras/fecha?
- ¿Debe generarse automáticamente o permitir entrada manual?
- ¿Debe ser visible/editable por los técnicos o solo admin?

### 6. ALERTAS DE CUSTOMER INCOMPLETO

**Punto 4:**
- ¿Qué campos son considerados "obligatorios" para que un customer esté completo?
  - Nombre, dirección, teléfono, email, ¿qué más?
- ¿Debe bloquearse la creación de reportes para customers incompletos?
- ¿O se puede crear reporte pero con advertencias visibles?
- El email a admin, ¿debe enviarse inmediatamente al crear el customer o solo cuando se intenta crear un reporte?

### 7. SISTEMA DE LOG/TRACKING

**Punto 7:**
- ¿Qué tipo de cambios deben loguearse?:
  - ✓ Ediciones de reportes
  - ✓ Ediciones de customers
  - ✓ Cambios de estado
  - ✓ Asignaciones de técnicos
  - ¿Qué más?
- En el "pie de página" del reporte, ¿debe mostrar TODO el historial o solo los últimos X cambios?
- ¿Debe ser un componente expandible/colapsable?
- ¿Debe incluir timestamp exacto con hora?

### 8. SERVICE TYPE - INSTALLATION

**Punto 10:**
- Actualmente "Installation" está en algún lugar del sistema?
- ¿"Mover a ficha general" significa que está en CF105 y debe ir a CF103?
- ¿O es un Service Type completamente nuevo que debe agregarse?

### 9. LISTA DE PARTES

**Punto 11:**
- ¿Cuándo te enviarán la lista de partes?
- ¿Las partes deben estar categorizadas (ej: por tipo de máquina)?
- El buscador de partes, ¿debe ser un dropdown, un autocomplete, o una modal con búsqueda?
- Cuando se usa "Other" y se introduce manual:
  - ¿Se guarda esa parte para futuras ocasiones?
  - ¿El admin debe aprobar/agregar esa parte al catálogo?

### 10. CF105 - LÓGICA DE GRINDER

**Punto 27:**
- "Si usa pressure pack ya no tiene grinder"
- ¿Esta es una regla absoluta o hay excepciones?
- ¿Debe ocultarse el campo grinder automáticamente si se selecciona pressure pack?
- ¿O solo mostrar una advertencia?
- ¿Debo consultar con Onier las condiciones exactas antes de implementar?

### 11. EMAIL CORRECTO

**Punto 14:**
- ¿Cuál es el email correcto para los reportes?:
  - coffeeservicereports@primelinedist.com
  - coffeeservicereports@primelinecoffee.com
  - ¿Otro?
- ¿Hay otros emails que necesiten actualizarse en el sistema?

### 12. ETIQUETAS DE COLORES POR ROL

**Punto 22:**
- ¿Qué roles existen actualmente?:
  - Admin, Technician, Sales Rep... ¿otros?
- ¿Qué colores quieres para cada rol?
- ¿Las etiquetas deben mostrarse en el listing como badges?

### 13. HELP/GUIDE SECTION

**Punto 23:**
- ¿El contenido es diferente para admin vs tech?
- ¿Debe ser una página dentro del sistema o abrir documentación externa?
- Los "códigos de máquinas":
  - ¿Es una tabla de referencia?
  - ¿Debe ser editable por Onier/admin?
  - ¿Los técnicos solo lectura?
- ¿Onier puede cargar PDFs, imágenes, texto, o todo lo anterior?

### 14. FORGOTTEN PASSWORD

**Punto 16:**
- ¿Actualmente existe alguna funcionalidad de forgot password?
- "Independiente arreglar" - ¿significa que está roto y hay que arreglarlo?
- ¿O que hay que implementarlo desde cero?
- ¿Debe usar el sistema de Supabase Auth o un flujo custom?

### 15. CREAR USERS DESDE DASHBOARD

**Punto 25:**
- ¿Actualmente hay funciones hardcoded en Netlify Functions?
- ¿Los botones ya existen en el UI pero no funcionan?
- ¿O hay que crear tanto el UI como la funcionalidad?
- ¿Debe poder crear todos los tipos de usuarios (admin, tech, sales rep)?

### 16. VERSIÓN PÚBLICA - ENMIENDAS

**Punto 20:**
- ¿Las enmiendas deberían mostrarse en la versión pública del share?
- ¿O deben estar ocultas pero se muestra mal actualmente?
- ¿Dónde específicamente no se ven (qué sección del reporte)?

### 17. MOBILE - INFORMACIÓN EN LISTINGS

**Punto 18:**
- En el listing de customers (empresas), ¿qué información exacta mostrar?:
  - Nombre
  - Dirección
  - Teléfono
  - ¿Ciudad/ubicación?
  - ¿Último servicio?
  - ¿Código de customer?
- En el listing de history, ¿qué datos adicionales?:
  - Tipo de servicio
  - Estado
  - ¿Código del reporte?
  - ¿Técnico asignado (si es admin viendo)?

---

## 📋 PRÓXIMOS PASOS SUGERIDOS

1. **Revisar estas preguntas** y darme respuestas detalladas
2. **Priorizar las tareas** - ¿en qué orden quieres que las implemente?
3. **Definir información adicional** que pueda faltar
4. **Confirmar el email** correcto y lista de partes
5. **Consultar con Onier** sobre reglas de negocio específicas (CF105, etc.)

---

## 🎯 RESUMEN DE TAREAS POR CATEGORÍA

### UI/UX Changes
- Cambios de terminología (Company→Customers, Staff→Coffee Staff)
- Eliminar español completamente
- Mejorar información visible en mobile (listings)
- Quitar ruido visual ("draft (1)")
- Agregar etiquetas de color por rol

### New Features
- Admin puede crear reportes
- Sistema de detección de duplicados
- Código único de customer
- Gestión de sucursales
- Sistema de log/tracking completo
- Buscador de partes con "Other"
- Help/Guide section con códigos de máquinas
- Alertas para customers incompletos

### Forms & Data
- CF103: Installation en Service Type, Owner, PLD por defecto
- CF105: Agregar ICE TEA, HOTWATER, COLD BREW, AFFICIONADO
- CF105: Lógica pressure pack/grinder
- Firma de customer no obligatoria

### Bugs to Fix
- Draft no guarda firma
- Error al send después de draft CF103
- Versión pública no muestra enmiendas
- Crear users desde dashboard (no hardcoded)
- Forgotten password

### Backend/Database
- Modelo de sucursales
- Sistema de códigos únicos
- Sistema de log/tracking
- Catálogo de partes
- Alertas y notificaciones por email

---

**Nota**: Este documento será la base para todo el trabajo. Una vez clarifiquemos estos puntos, podemos empezar a implementar paso a paso en el orden que prefieras.
