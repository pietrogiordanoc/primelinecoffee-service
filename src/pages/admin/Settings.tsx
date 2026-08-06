import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Mail, Building2, Settings as SettingsIcon, FileText, AlertCircle } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function SettingsPage() {
  const { settings, loading, fetchSettings, updateSettings } = useSettingsStore();
  const { alert } = useConfirm();
  const [saving, setSaving] = useState(false);

  // Email Settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notifyTechnician, setNotifyTechnician] = useState(true);
  const [notifySuperAdmins, setNotifySuperAdmins] = useState(true);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [senderName, setSenderName] = useState('Prime Line Coffee Service');
  const [senderEmail, setSenderEmail] = useState('');

  // Company Settings
  const [companyName, setCompanyName] = useState('Prime Line Coffee Service');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Report Settings
  const [requirePhotos, setRequirePhotos] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState(10);
  const [autoCompress, setAutoCompress] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      // Load email settings
      setEmailEnabled(settings.email_notifications_enabled);
      setNotifyTechnician(settings.notify_technician);
      setNotifySuperAdmins(settings.notify_super_admins);
      setAdditionalEmails(settings.additional_notification_emails.join(', '));
      setSenderName(settings.email_sender_name);
      setSenderEmail(settings.email_sender_email || '');

      // Load company settings
      setCompanyName(settings.company_name);
      setCompanyPhone(settings.company_phone || '');
      setCompanyAddress(settings.company_address || '');

      // Load report settings
      setRequirePhotos(settings.require_photos);
      setMaxPhotos(settings.max_photos_per_report);
      setAutoCompress(settings.auto_compress_images);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Parse additional emails
      const emailArray = additionalEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      await updateSettings({
        // Email settings
        email_notifications_enabled: emailEnabled,
        notify_technician: notifyTechnician,
        notify_super_admins: notifySuperAdmins,
        additional_notification_emails: emailArray,
        email_sender_name: senderName,
        email_sender_email: senderEmail || null,

        // Company settings
        company_name: companyName,
        company_phone: companyPhone || null,
        company_address: companyAddress || null,

        // Report settings
        require_photos: requirePhotos,
        max_photos_per_report: maxPhotos,
        auto_compress_images: autoCompress,
      });

      await alert('Configuración guardada exitosamente', 'Éxito');
    } catch (error: any) {
      await alert('Error al guardar la configuración: ' + error.message, 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-gray-600 mt-1">Administra las opciones globales de la aplicación</p>
      </div>

      {/* Email Notifications */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notificaciones por Email</h2>
          </div>

          <div className="space-y-4">
            {/* Enable/Disable Emails */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">Activar notificaciones</label>
                <p className="text-sm text-gray-600">Enviar emails automáticos cuando se crea un reporte</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {emailEnabled && (
              <>
                {/* Notify Technician */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900 text-sm">Notificar al técnico</label>
                    <p className="text-xs text-gray-600">Enviar copia del reporte al técnico que lo creó</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyTechnician}
                    onChange={(e) => setNotifyTechnician(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Notify Super Admins */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900 text-sm">Notificar a super admins</label>
                    <p className="text-xs text-gray-600">Enviar a todos los usuarios con rol Super Admin</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySuperAdmins}
                    onChange={(e) => setNotifySuperAdmins(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Additional Emails */}
                <Input
                  label="Emails adicionales (opcional)"
                  type="text"
                  value={additionalEmails}
                  onChange={(e) => setAdditionalEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  helperText="Separar múltiples emails con comas"
                />

                {/* Sender Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nombre del remitente"
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Prime Line Coffee Service"
                  />
                  <Input
                    label="Email del remitente (Resend)"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="reports@yourdomain.com"
                    helperText="Debe estar verificado en Resend"
                  />
                </div>

                {/* Warning about Resend */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Configuración de Resend requerida</p>
                    <p className="mt-1">Asegúrate de tener configurada la variable de entorno <code className="bg-amber-100 px-1 py-0.5 rounded">RESEND_API_KEY</code> en Netlify para que funcionen los emails.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Company Information */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Información de la Empresa</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Nombre de la empresa"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Prime Line Coffee Service"
            />
            <Input
              label="Teléfono"
              type="tel"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="Dirección"
              type="text"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
          </div>
        </div>
      </Card>

      {/* Report Settings */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configuración de Reportes</h2>
          </div>

          <div className="space-y-4">
            {/* Require Photos */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <label className="font-medium text-gray-900 text-sm">Fotos obligatorias</label>
                <p className="text-xs text-gray-600">Requerir al menos una foto en cada reporte</p>
              </div>
              <input
                type="checkbox"
                checked={requirePhotos}
                onChange={(e) => setRequirePhotos(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {/* Auto Compress */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <label className="font-medium text-gray-900 text-sm">Comprimir imágenes</label>
                <p className="text-xs text-gray-600">Optimizar fotos automáticamente antes de subir</p>
              </div>
              <input
                type="checkbox"
                checked={autoCompress}
                onChange={(e) => setAutoCompress(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {/* Max Photos */}
            <Input
              label="Máximo de fotos por reporte"
              type="number"
              value={maxPhotos}
              onChange={(e) => setMaxPhotos(parseInt(e.target.value))}
              min={1}
              max={50}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="px-8"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
