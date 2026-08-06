# 📧 Configuración de Emails con Resend

## Paso 1: Crear la tabla system_settings en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com)
2. Selecciona **SQL Editor** en el menú lateral
3. Click en **"New query"**
4. Copia y pega el contenido completo del archivo:
   ```
   supabase/create-system-settings.sql
   ```
5. Click en **"Run"** o presiona `Ctrl + Enter`
6. ✅ Deberías ver: `Success. No rows returned`

## Paso 2: Configurar la API Key de Resend en Netlify

1. Ve a tu proyecto en [Netlify Dashboard](https://app.netlify.com)
2. Selecciona tu sitio
3. Ve a **Site configuration** → **Environment variables**
4. Click en **"Add a variable"** o **"Add environment variable"**
5. Agrega la siguiente variable:
   ```
   Key: RESEND_API_KEY
   Value: re_TuApiKeyAqui
   ```
6. Click en **"Save"**
7. **Importante:** Redeploy el sitio para que tome efecto:
   - Ve a **Deploys**
   - Click en **"Trigger deploy"** → **"Deploy site"**

## Paso 3: Configurar el email del remitente en Resend

### 3.1 Verificar tu dominio en Resend

1. Ve a [Resend Dashboard](https://resend.com/domains)
2. Click en **"Add Domain"**
3. Ingresa tu dominio (ej: `primelinecoffee.com`)
4. Sigue las instrucciones para agregar los registros DNS:
   - MX records
   - TXT records (SPF, DKIM)
   - CNAME records
5. Espera a que se verifique (puede tomar hasta 48 horas)

### 3.2 Crear un email de remitente

Una vez verificado tu dominio, puedes usar emails como:
- `reports@primelinecoffee.com`
- `noreply@primelinecoffee.com`
- `service@primelinecoffee.com`

**Nota:** Si no tienes un dominio verificado, puedes usar `onboarding@resend.dev` solo para pruebas.

## Paso 4: Configurar Settings en la App

1. Inicia sesión en la app como **Super Admin**
2. Ve a **Settings** en el menú lateral
3. En la sección **"Notificaciones por Email"**, configura:

### Email Settings

✅ **Activar notificaciones**
- Toggle ON para activar emails automáticos

✅ **Notificar al técnico**
- ☑ Marcado: El técnico recibe copia del reporte que creó
- ☐ Desmarcado: El técnico NO recibe emails

✅ **Notificar a super admins**
- ☑ Marcado: Todos los usuarios con rol "Super Admin" reciben emails
- ☐ Desmarcado: Los super admins NO reciben emails

✅ **Emails adicionales** (opcional)
- Agrega emails separados por comas
- Ejemplo: `manager@company.com, supervisor@company.com`
- Estos emails SIEMPRE recibirán notificaciones

✅ **Nombre del remitente**
- Ejemplo: `Prime Line Coffee Service`
- Aparece como: `Prime Line Coffee Service <reports@primelinecoffee.com>`

✅ **Email del remitente**
- Ejemplo: `reports@primelinecoffee.com`
- Debe estar verificado en Resend
- Si está vacío, usa `onboarding@resend.dev` (solo pruebas)

4. Click en **"Guardar Cambios"**

## Paso 5: Probar el Sistema

1. Como **Técnico**, crea un reporte de prueba
2. Llena el formulario y envía
3. Revisa que los emails lleguen a los destinatarios configurados

### ¿Qué hacer si no llegan los emails?

1. **Revisa los logs de Netlify:**
   ```bash
   netlify functions:log send-report-email
   ```

2. **Verifica que la variable esté configurada:**
   - Ve a Netlify → Site configuration → Environment variables
   - Busca `RESEND_API_KEY`
   - Si no existe, agrégala y redeploy

3. **Revisa los logs de Resend:**
   - Ve a [Resend Dashboard](https://resend.com/emails)
   - Busca el email enviado
   - Revisa el status (delivered, bounced, etc.)

4. **Verifica la configuración en Settings:**
   - Asegúrate de que "Activar notificaciones" esté ON
   - Verifica que al menos una opción esté marcada (técnico o admins)
   - Revisa que los emails estén bien escritos

## Ejemplo de Configuración Completa

```
✅ Activar notificaciones: ON

Email Settings:
✅ Notificar al técnico: ☑
✅ Notificar a super admins: ☑
📧 Emails adicionales: manager@company.com, ceo@company.com
📝 Nombre del remitente: Prime Line Coffee Service
📧 Email del remitente: reports@primelinecoffee.com

Company Settings:
🏢 Nombre: Prime Line Coffee Service
📞 Teléfono: +1 (555) 123-4567
📍 Dirección: 123 Main St, New York, NY 10001

Report Settings:
☐ Fotos obligatorias: OFF
☑ Comprimir imágenes: ON
📸 Máximo de fotos: 10
```

## Flujo Completo

1. **Técnico** crea un reporte → Click "Enviar"
2. **App** guarda el reporte en Supabase
3. **App** llama a `send-report-email` function
4. **Function** lee configuración de `system_settings`
5. **Function** construye lista de destinatarios:
   - Si `notify_super_admins` = true → Agrega super admins
   - Si `notify_technician` = true → Agrega técnico
   - Agrega emails de `additional_notification_emails`
6. **Function** envía email vía Resend
7. **Destinatarios** reciben email con:
   - Detalles del reporte
   - Fotos adjuntas (si <12MB) o links descargables
   - Información del técnico y empresa

## 🎉 ¡Listo!

Ahora tu sistema de emails está **100% configurable desde la UI**, sin código hardcoded.

---

## Preguntas Frecuentes

### ¿Puedo desactivar los emails temporalmente?
Sí, solo desmarca "Activar notificaciones" en Settings y guarda. Los reportes se seguirán guardando, pero sin emails.

### ¿Puedo que solo ciertos emails reciban notificaciones?
Sí, desmarca "Notificar a super admins" y "Notificar al técnico", y agrega solo los emails que quieras en "Emails adicionales".

### ¿Cuántos emails puedo agregar en "Emails adicionales"?
Sin límite, pero Resend tiene límites de envíos según tu plan:
- Free: 100 emails/día
- Pro: 50,000+ emails/mes

### ¿Qué pasa si la API key de Resend es inválida?
El reporte se guarda correctamente, pero el email falla silenciosamente. Verás un warning en la consola del navegador.

### ¿Puedo cambiar el contenido del email?
Sí, edita la función `generateEmailHtml()` en `netlify/functions/send-report-email.ts` y redeploy.
