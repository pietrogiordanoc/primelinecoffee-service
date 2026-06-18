# 📸 Solución de Problemas - Cámara en Móviles

## ✅ Checklist de Verificación

### 1. **HTTPS Activo** 
La cámara **NO funciona** sin HTTPS en navegadores móviles (excepto en localhost).

**Verificar:**
- Abre la app en tu teléfono
- La URL debe empezar con `https://` (NO `http://`)
- Si es Netlify: Automáticamente tiene HTTPS ✅
- Abre la consola del navegador (desde Chrome en PC conectado al móvil)
- Busca el log: `✅ HTTPS activo: true`

**Si ves `❌ ADVERTENCIA: El sitio NO está en HTTPS`:**
- Asegúrate de acceder a la URL de Netlify (ej: `https://tu-app.netlify.app`)
- NO uses la IP local del servidor de desarrollo desde el móvil

---

### 2. **Permisos del Navegador**

Chrome Android necesita permisos explícitos para acceder a la cámara.

**Verificar permisos en Chrome Android:**

1. Abre Chrome en tu Android
2. Toca los **3 puntos** (⋮) arriba a la derecha
3. Ve a **Configuración** → **Configuración de sitios**
4. Toca **Cámara**
5. Busca tu sitio (ej: `https://tu-app.netlify.app`)
6. **Asegúrate que diga "Permitir"** ✅

**Si está bloqueado:**
- Toca el sitio y cambia a **Permitir**
- Recarga la página

**Alternativa rápida:**
1. Toca el **candado** 🔒 junto a la URL en Chrome
2. Toca **Permisos**
3. Cambia **Cámara** a **Permitir**

---

### 3. **Verificar Logs en Consola**

Para ver logs desde tu PC mientras pruebas en el móvil:

1. **En tu PC:** Abre Chrome
2. Ve a `chrome://inspect/#devices`
3. **En tu Android:** 
   - Ve a **Configuración** → **Opciones de desarrollador**
   - Activa **Depuración USB**
   - Conecta el teléfono por USB a la PC
4. **En tu PC:** Verás tu dispositivo, haz clic en **inspect**
5. Se abrirá DevTools mostrando lo que pasa en tu móvil

**Logs importantes que debes ver:**
```
✅ HTTPS activo: true
✅ API navigator.mediaDevices disponible
✅ Sitio seguro para usar cámara
```

**Cuando tocas el botón de cámara:**
```
📸 Camera onChange 1
✅ Files selected: 1
✅ Images optimized: 1
```

---

### 4. **Comportamiento Esperado**

**Botón AZUL (Cámara):**
- Debe abrir **directamente la cámara trasera**
- NO muestra la galería
- Toma 1 foto a la vez

**Botón VERDE (Galería):**
- Debe abrir el **selector de archivos/galería**
- Permite seleccionar **múltiples fotos**
- Muestra fotos existentes

---

### 5. **Si Sigue Sin Funcionar**

**Prueba esto:**

1. **Cierra Chrome completamente** en el móvil
2. **Limpia caché:**
   - Chrome → ⋮ → Configuración → Privacidad
   - Borrar datos de navegación
   - Marca "Imágenes y archivos en caché"
   - Últimas 24 horas
   - Borrar
3. **Abre de nuevo** la app
4. **Intenta primero el botón VERDE** (Galería) - es más compatible
5. Si Galería funciona pero Cámara no: Es un problema de permisos específico

**Revisa la consola y anota:**
- ¿Qué logs aparecen?
- ¿Hay algún error en rojo?
- ¿Qué dice en "HTTPS activo"?
- ¿Aparece algún mensaje de permisos denegados?

---

## 🔧 Configuración del Código

El código implementado sigue el estándar HTML5:

```jsx
{/* Botón Cámara */}
<label htmlFor="file-camera">
  Cámara
</label>
<input
  id="file-camera"
  type="file"
  accept="image/*"
  capture="environment"  // ← Fuerza cámara trasera en móviles
  onChange={handlePhotoUpload}
/>

{/* Botón Galería */}
<label htmlFor="file-gallery">
  Galería  
</label>
<input
  id="file-gallery"
  type="file"
  accept="image/*"
  multiple  // ← Permite múltiples archivos
  onChange={handlePhotoUpload}
/>
```

**Atributos clave:**
- `accept="image/*"` - Solo imágenes
- `capture="environment"` - Cámara trasera (móviles)
- `multiple` - Múltiples archivos (galería)

---

## 📱 Compatibilidad

| Navegador | Versión Mínima | Estado |
|-----------|----------------|--------|
| Chrome Android | 79+ | ✅ Soportado |
| Safari iOS | 11+ | ✅ Soportado |
| Firefox Android | 68+ | ✅ Soportado |
| Samsung Internet | 10+ | ✅ Soportado |

**Nota:** El atributo `capture` se **ignora en desktop** (comportamiento normal).

---

## 🆘 Ayuda Adicional

Si después de verificar todo sigue sin funcionar:

1. **Anota:**
   - Modelo del teléfono
   - Versión de Android
   - Versión de Chrome
   - Logs de la consola (capturas de pantalla)
   - ¿El botón verde (galería) funciona?

2. **Prueba en otro navegador** (Firefox, Samsung Internet)

3. **Prueba desde otro teléfono** para descartar problemas de hardware

---

## ✅ Checklist Final

- [ ] La URL es HTTPS (comienza con `https://`)
- [ ] Chrome tiene permisos de cámara para el sitio
- [ ] Depuración USB habilitada (para ver logs)
- [ ] Conectado a DevTools desde PC (opcional pero recomendado)
- [ ] Caché del navegador limpiada
- [ ] Botón verde (Galería) probado primero
- [ ] Logs revisados en consola
