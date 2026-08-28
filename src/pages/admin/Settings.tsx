import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Mail, Building2, Settings as SettingsIcon, FileText, AlertCircle, HardDrive } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function SettingsPage() {
  const { settings, loading, fetchSettings, updateSettings } = useSettingsStore();
  const { alert } = useConfirm();
  const [saving, setSaving] = useState(false);

  // Email Settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notifyTechnician, setNotifyTechnician] = useState(true);
  const [notifySuperAdmins, setNotifySuperAdmins] = useState(true);
  const [notifyAdditionalEmails, setNotifyAdditionalEmails] = useState(true);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [customerCreationEmails, setCustomerCreationEmails] = useState('');
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

  // Staff Access Settings
  const [techniciansCanViewStaff, setTechniciansCanViewStaff] = useState(false);

  // Storage Settings
  const [storageLimit, setStorageLimit] = useState(50);
  const [warningPercent, setWarningPercent] = useState(70);
  const [criticalPercent, setCriticalPercent] = useState(85);
  const [maxPhotoSize, setMaxPhotoSize] = useState(10);
  const [maxVideoSize, setMaxVideoSize] = useState(50);
  const [maxVideoDuration, setMaxVideoDuration] = useState(120);
  const [videoCompressionEnabled, setVideoCompressionEnabled] = useState(true);
  const [videoMaxResolution, setVideoMaxResolution] = useState(720);
  const [videoBitrate, setVideoBitrate] = useState(1.5);
  const [enableVideos, setEnableVideos] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      // Load email settings
      setEmailEnabled(settings.email_notifications_enabled);
      setNotifyTechnician(settings.notify_technician);
      setNotifySuperAdmins(settings.notify_super_admins);
      setNotifyAdditionalEmails(settings.notify_additional_emails ?? true);
      setAdditionalEmails(settings.additional_notification_emails.join(', '));
      setCustomerCreationEmails(settings.customer_creation_notification_emails?.join(', ') || '');
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

      // Load staff access settings
      setTechniciansCanViewStaff(settings.technicians_can_view_staff || false);

      // Load storage settings
      setStorageLimit(settings.storage_limit_gb || 50);
      setWarningPercent(settings.storage_warning_percent || 70);
      setCriticalPercent(settings.storage_critical_percent || 85);
      setMaxPhotoSize(settings.max_photo_size_mb || 10);
      setMaxVideoSize(settings.max_video_size_mb || 50);
      setMaxVideoDuration(settings.max_video_duration_seconds || 120);
      setVideoCompressionEnabled(settings.video_compression_enabled ?? true);
      setVideoMaxResolution(settings.video_max_resolution_height || 720);
      setVideoBitrate(settings.video_target_bitrate_mbps || 1.5);
      setEnableVideos(settings.enable_videos ?? true);
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
        notify_additional_emails: notifyAdditionalEmails,
        additional_notification_emails: emailArray,
        customer_creation_notification_emails: customerCreationEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0),
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

        // Staff access settings
        technicians_can_view_staff: techniciansCanViewStaff,

        // Storage settings
        storage_limit_gb: storageLimit,
        storage_warning_percent: warningPercent,
        storage_critical_percent: criticalPercent,
        max_photo_size_mb: maxPhotoSize,
        max_video_size_mb: maxVideoSize,
        max_video_duration_seconds: maxVideoDuration,
        video_compression_enabled: videoCompressionEnabled,
        video_max_resolution_height: videoMaxResolution,
        video_target_bitrate_mbps: videoBitrate,
        enable_videos: enableVideos,
      });

      await alert('Settings saved successfully', 'Success');
    } catch (error: any) {
      await alert('Error saving settings: ' + error.message, 'Error');
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
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Manage global application settings</p>
      </div>

      {/* Email Notifications */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            {/* Enable/Disable Emails */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">Enable notifications</label>
                <p className="text-sm text-gray-600">Send automatic emails when a report is created</p>
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
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full min-w-[650px] text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Event</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Super admins</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Technician</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Report additional emails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">Report submitted</p>
                          <p className="text-xs text-gray-500">Send a copy of the service report</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notifySuperAdmins}
                            onChange={(e) => setNotifySuperAdmins(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            aria-label="Notify super admins about submitted reports"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={notifyTechnician}
                            onChange={(e) => setNotifyTechnician(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            aria-label="Notify technician about submitted reports"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifyAdditionalEmails}
                              onChange={(e) => setNotifyAdditionalEmails(e.target.checked)}
                              className="sr-only peer"
                              aria-label="Send submitted reports to additional emails"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </td>
                      </tr>
                      <tr className="bg-blue-50/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">Customer created</p>
                          <p className="text-xs text-gray-500">Alert when a technician creates a customer</p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-blue-700">Always</td>
                        <td className="px-4 py-3 text-center text-xs text-gray-400">Not applicable</td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-blue-700">Configured below</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Input
                  label="Report additional emails"
                  type="text"
                  value={additionalEmails}
                  onChange={(e) => setAdditionalEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  helperText="Recipients for submitted reports. Separate multiple emails with commas."
                />

                <Input
                  label="Customer creation notification emails"
                  type="text"
                  value={customerCreationEmails}
                  onChange={(e) => setCustomerCreationEmails(e.target.value)}
                  placeholder="admin1@example.com, admin2@example.com"
                  helperText="Recipients for customer-created alerts. Super admins always receive these alerts."
                />

                {/* Sender Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Sender name"
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Prime Line Coffee Service"
                  />
                  <Input
                    label="Sender email (Resend)"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="reports@yourdomain.com"
                    helperText="Must be verified in Resend"
                  />
                </div>

                {/* Warning about Resend */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Resend configuration required</p>
                    <p className="mt-1">Make sure you have the <code className="bg-amber-100 px-1 py-0.5 rounded">RESEND_API_KEY</code> environment variable configured in Netlify for emails to work.</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Company name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Prime Line Coffee Service"
            />
            <Input
              label="Phone"
              type="tel"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="Address"
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
            <h2 className="text-lg font-semibold text-gray-900">Report Settings</h2>
          </div>

          <div className="space-y-4">
            {/* Require Photos */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <label className="font-medium text-gray-900 text-sm">Required photos</label>
                <p className="text-xs text-gray-600">Require at least one photo in each report</p>
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
                <label className="font-medium text-gray-900 text-sm">Compress images</label>
                <p className="text-xs text-gray-600">Optimize photos automatically before uploading</p>
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
              label="Maximum photos per report"
              type="number"
              value={maxPhotos}
              onChange={(e) => setMaxPhotos(parseInt(e.target.value))}
              min={1}
              max={50}
            />
          </div>
        </div>
      </Card>

      {/* Staff Access Settings */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Staff Access</h2>
          </div>

          <div className="space-y-4">
            {/* Allow Technicians to View Staff */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">Technicians can view staff directory</label>
                <p className="text-sm text-gray-600">Allow technicians to see the list of all staff members</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={techniciansCanViewStaff}
                  onChange={(e) => setTechniciansCanViewStaff(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Info about Staff Access */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Staff Directory Access</p>
                <p className="mt-1">When enabled, technicians can view contact information for all staff members from their mobile view. This is useful for team coordination.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Storage Settings */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Storage Settings</h2>
          </div>

          <div className="space-y-4">
            {/* Storage Limit */}
            <Input
              label="Storage Limit (GB)"
              type="number"
              value={storageLimit}
              onChange={(e) => setStorageLimit(parseInt(e.target.value))}
              min={1}
              max={1000}
              helperText="Total storage allocation for this project"
            />

            {/* Warning and Critical Levels */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Warning Level (%)"
                type="number"
                value={warningPercent}
                onChange={(e) => setWarningPercent(parseInt(e.target.value))}
                min={1}
                max={100}
                helperText="Show warning at this %"
              />
              <Input
                label="Critical Level (%)"
                type="number"
                value={criticalPercent}
                onChange={(e) => setCriticalPercent(parseInt(e.target.value))}
                min={1}
                max={100}
                helperText="Show critical alert at this %"
              />
            </div>

            {/* Enable Videos */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">Enable videos</label>
                <p className="text-sm text-gray-600">Allow technicians to upload videos in reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVideos}
                  onChange={(e) => setEnableVideos(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* File Size Limits */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max Photo Size (MB)"
                type="number"
                value={maxPhotoSize}
                onChange={(e) => setMaxPhotoSize(parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <Input
                label="Max Video Size (MB)"
                type="number"
                value={maxVideoSize}
                onChange={(e) => setMaxVideoSize(parseInt(e.target.value))}
                min={1}
                max={500}
                disabled={!enableVideos}
              />
            </div>

            {/* Video Duration */}
            <Input
              label="Max Video Duration (seconds)"
              type="number"
              value={maxVideoDuration}
              onChange={(e) => setMaxVideoDuration(parseInt(e.target.value))}
              min={10}
              max={600}
              helperText={`${Math.floor(maxVideoDuration / 60)} minutes ${maxVideoDuration % 60} seconds`}
              disabled={!enableVideos}
            />

            {/* Video Compression */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <label className="font-medium text-gray-900 text-sm">Compress videos</label>
                <p className="text-xs text-gray-600">Automatically compress videos before upload</p>
              </div>
              <input
                type="checkbox"
                checked={videoCompressionEnabled}
                onChange={(e) => setVideoCompressionEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                disabled={!enableVideos}
              />
            </div>

            {videoCompressionEnabled && enableVideos && (
              <div className="grid grid-cols-2 gap-4 ml-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <Input
                  label="Max Resolution (height)"
                  type="number"
                  value={videoMaxResolution}
                  onChange={(e) => setVideoMaxResolution(parseInt(e.target.value))}
                  min={360}
                  max={4320}
                  step={180}
                  helperText={`${videoMaxResolution}p`}
                />
                <Input
                  label="Target Bitrate (Mbps)"
                  type="number"
                  value={videoBitrate}
                  onChange={(e) => setVideoBitrate(parseFloat(e.target.value))}
                  min={0.5}
                  max={10}
                  step={0.1}
                />
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Storage configuration tips</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Lower resolution and bitrate = smaller files and longer storage capacity</li>
                  <li>720p at 1.5 Mbps is recommended for optimal quality/size balance</li>
                  <li>Monitor your storage usage in the Storage Dashboard</li>
                </ul>
              </div>
            </div>
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
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
