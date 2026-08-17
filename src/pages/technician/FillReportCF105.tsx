import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useSettingsStore } from '@/stores/settingsStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SignaturePad from '@/components/ui/SignaturePad';
import { Coffee, Building2, Camera, Image, Video, X, Edit } from 'lucide-react';
import { compressVideo, getVideoDuration, generateVideoThumbnail } from '@/utils/videoCompression';
import { optimizeImages } from '@/utils/imageOptimization';
import VideoRecorderModal from '@/components/media/VideoRecorderModal';
import type { DynamicForm } from '@/types';

export const CF105_FORM_ID = '00000000-0000-0000-0000-000000000105';

const ESPRESSO_COFFEE_TYPES = ['Kimbo', 'La Colombe', 'Hausbrandt', 'Beans', 'Fractional Pack', 'Capsules', 'Paper Pods', 'Cold Brew'];
const BATCH_COFFEE_TYPES = ['Kimbo', 'La Colombe', 'Hausbrandt', 'Beans', 'Fractional Pack', 'Cold Brew'];

interface UploadedFile {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  type: 'photo' | 'video';
  duration?: number;
  uploading?: boolean;
  uploadProgress?: number;
}

interface EquipmentQuality {
  location: string;
  coffeeTypes: string[];
  machineModel: string;
  machineSerial: string;
  grinderModel: string;
  grinderSerial: string;
  grindTimeSingle: string;
  grindTimeDouble: string;
  doseStatus: string;
  doseValue: string;
  waterTempStatus: string;
  waterTempValue: string;
  pumpPressureStatus: string;
  pumpPressureValue: string;
  extractionTimeStatus: string;
  volumeStatus: string;
  filterDate: string;
  filterStatus: string;
}

function emptyQuality(): EquipmentQuality {
  return {
    location: '',
    coffeeTypes: [],
    machineModel: '',
    machineSerial: '',
    grinderModel: '',
    grinderSerial: '',
    grindTimeSingle: '',
    grindTimeDouble: '',
    doseStatus: '',
    doseValue: '',
    waterTempStatus: '',
    waterTempValue: '',
    pumpPressureStatus: '',
    pumpPressureValue: '',
    extractionTimeStatus: '',
    volumeStatus: '',
    filterDate: '',
    filterStatus: '',
  };
}

export default function FillReportCF105() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ formId?: string; reportId?: string }>();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const { userProfile } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { alert } = useConfirm();

  const isEditMode = window.location.pathname.includes('/edit');
  const editReportId = isEditMode ? reportId : null;

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [property, setProperty] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [salesRepresentativeId, setSalesRepresentativeId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [salesReps, setSalesReps] = useState<Array<{id: string, full_name: string, email: string}>>([]);

  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    contact_name: string;
    contact_email: string;
    address?: string;
    phone?: string;
  } | null>(null);

  const [espresso, setEspresso] = useState<EquipmentQuality>(emptyQuality());
  const [coffee, setCoffee] = useState<EquipmentQuality>(emptyQuality());

  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [customerSignature, setCustomerSignature] = useState('');
  const [customerPrintName, setCustomerPrintName] = useState('');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videosEnabled, setVideosEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setVideosEnabled(settings?.enable_videos !== false);
  }, [settings?.enable_videos]);

  useEffect(() => {
    loadForm();
    loadSalesRepresentatives();
  }, []);

  useEffect(() => {
    loadCompanyAndTechnicianData();
  }, [companyId, userProfile]);

  async function loadCompanyAndTechnicianData() {
    if (userProfile?.full_name) {
      setTechnicianName(userProfile.full_name);
    }
    if (companyId) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyData) {
        setCompanyInfo({
          name: companyData.name || '',
          contact_name: companyData.contact_name || '',
          contact_email: companyData.contact_email || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
        });
        setCustomerName(companyData.contact_name || '');
        setCustomerEmail(companyData.contact_email || '');
      }
    }
  }

  async function loadSalesRepresentatives() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'sales_representative')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setSalesReps(data || []);
    } catch (error) {
      console.error('Error loading sales representatives:', error);
    }
  }

  async function loadForm() {
    try {
      setLoading(true);

      if (isEditMode && editReportId) {
        await loadDraftReport(editReportId);
        return;
      }

      const { data: formData, error } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('id', CF105_FORM_ID)
        .single();

      if (error) throw error;
      setForm(formData);
    } catch (error) {
      console.error('Error loading CF105 form:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDraftReport(id: string) {
    try {
      const { data: report, error } = await supabase
        .from('service_reports')
        .select('*, companies(name, contact_name, contact_email, address, contact_phone)')
        .eq('id', id)
        .eq('status', 'draft')
        .single();

      if (error || !report) throw error || new Error('Draft not found');

      const { data: loadedForm, error: formError } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('id', report.form_id)
        .single();

      if (formError || !loadedForm) throw formError || new Error('Form not found');
      setForm(loadedForm);

      if (report.companies) {
        setCompanyInfo({
          name: report.companies.name,
          contact_name: report.companies.contact_name,
          contact_email: report.companies.contact_email,
          address: report.companies.address,
          phone: report.companies.contact_phone,
        });
      }

      const d = report.form_data || {};
      setServiceDate(d.serviceDate || new Date().toISOString().split('T')[0]);
      setTechnicianName(d.technicianName || userProfile?.full_name || '');
      setCustomerName(d.customerName || '');
      setCustomerEmail(d.customerEmail || '');
      setProperty(d.property || '');
      setServiceType(d.serviceType || '');
      setSalesRepresentativeId(d.salesRepresentativeId || report.sales_representative_id || '');
      setAdditionalNotes(d.additionalNotes || '');
      setEspresso({ ...emptyQuality(), ...(d.espresso || {}) });
      setCoffee({ ...emptyQuality(), ...(d.coffee || {}) });
      setCustomerPrintName(d.customerPrintName || '');

      if (report.signature_url) {
        setCustomerSignature(report.signature_url);
      }

      const { data: reportPhotos } = await supabase
        .from('report_photos')
        .select('*')
        .eq('report_id', id);

      if (reportPhotos) {
        setPhotos(
          reportPhotos.map((p) => ({
            id: p.id,
            file_url: p.file_url,
            thumbnail_url: p.thumbnail_url || p.file_url,
            file_name: p.file_name,
            file_size: p.file_size,
            mime_type: p.mime_type,
            type: p.mime_type?.startsWith('video/') ? 'video' as const : 'photo' as const,
            duration: p.duration || undefined,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading draft report:', error);
      await alert('Failed to load draft report. Please try again.', 'Error');
      navigate('../history');
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const maxPhotoSize = (settings?.max_photo_size_mb || 10) * 1024 * 1024;
      for (const file of files) {
        if (file.size > maxPhotoSize) {
          await alert(
            `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${settings?.max_photo_size_mb || 10} MB`,
            'Error'
          );
          return;
        }
      }

      const optimized = await optimizeImages(files);

      for (let i = 0; i < optimized.length; i++) {
        const photo = optimized[i];
        const fileId = `${Date.now()}_${i}`;
        const fileName = `photo_${fileId}.webp`;

        setPhotos((prev) => [
          ...prev,
          { id: fileId, file_url: '', file_name: fileName, file_size: photo.file.size, mime_type: 'image/webp', type: 'photo', uploading: true },
        ]);

        const { error: uploadError } = await supabase.storage
          .from('service-photos')
          .upload(fileName, photo.file, { contentType: 'image/webp', cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          setPhotos((prev) => prev.filter((p) => p.id !== fileId));
          continue;
        }

        const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(fileName);
        setPhotos((prev) =>
          prev.map((p) => (p.id === fileId ? { ...p, file_url: urlData.publicUrl, uploading: false } : p))
        );
      }

      e.target.value = '';
    } catch (error) {
      console.error('Error uploading photos:', error);
      await alert('Error uploading photos. Please try again.', 'Error');
    }
  }

  function removePhoto(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo?.file_name) {
      supabase.storage.from('service-photos').remove([photo.file_name]).catch((err) => console.error(err));
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleCameraCapture(blob: Blob) {
    try {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const optimized = await optimizeImages([file]);

      const fileId = `${Date.now()}`;
      const fileName = `photo_${fileId}.webp`;

      setPhotos((prev) => [
        ...prev,
        { id: fileId, file_url: '', file_name: fileName, file_size: optimized[0].file.size, mime_type: 'image/webp', type: 'photo', uploading: true },
      ]);

      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(fileName, optimized[0].file, { contentType: 'image/webp', cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Error uploading camera photo:', uploadError);
        setPhotos((prev) => prev.filter((p) => p.id !== fileId));
        return;
      }

      const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(fileName);
      setPhotos((prev) =>
        prev.map((p) => (p.id === fileId ? { ...p, file_url: urlData.publicUrl, uploading: false } : p))
      );

      setCameraModalOpen(false);
    } catch (error) {
      console.error('Error processing camera photo:', error);
      await alert('Error uploading camera photo. Please try again.', 'Error');
    }
  }

  async function handleVideoCapture(blob: Blob) {
    if (!videosEnabled) {
      await alert('Video uploads are currently disabled.', 'Information');
      return;
    }

    try {
      const videoFile = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      const duration = await getVideoDuration(videoFile);
      const maxDuration = settings?.max_video_duration_seconds || 120;

      if (duration > maxDuration) {
        await alert(`Video too long (${duration.toFixed(0)}s). Maximum allowed: ${maxDuration}s`, 'Error');
        return;
      }

      let finalBlob: Blob = blob;
      if (settings?.video_compression_enabled) {
        finalBlob = await compressVideo(videoFile, {
          maxHeight: settings.video_max_resolution_height || 720,
          maxWidth: 1280,
          targetBitrate: settings.video_target_bitrate_mbps || 1.5,
        });
      }

      const maxVideoSize = (settings?.max_video_size_mb || 50) * 1024 * 1024;
      if (finalBlob.size > maxVideoSize) {
        await alert(`Video too large (${(finalBlob.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${settings?.max_video_size_mb || 50} MB`, 'Error');
        return;
      }

      const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const fileName = `video_${fileId}.mp4`;
      setPhotos((prev) => [
        ...prev,
        { id: fileId, file_url: '', file_name: fileName, file_size: finalBlob.size, mime_type: 'video/mp4', type: 'video', duration, uploading: true },
      ]);

      const { error: uploadError } = await supabase.storage.from('service-photos').upload(fileName, finalBlob, {
        contentType: 'video/mp4', cacheControl: '3600', upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(fileName);
      let thumbnailUrl = urlData.publicUrl;
      try {
        const thumbnailBlob = await generateVideoThumbnail(finalBlob, 0.5);
        const thumbnailFileName = fileName.replace(/\.mp4$/i, '_thumb.jpg');
        const { error: thumbnailError } = await supabase.storage.from('service-photos').upload(thumbnailFileName, thumbnailBlob, {
          contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
        });
        if (!thumbnailError) {
          thumbnailUrl = supabase.storage.from('service-photos').getPublicUrl(thumbnailFileName).data.publicUrl;
        }
      } catch (thumbnailError) {
        console.warn('Could not generate video thumbnail:', thumbnailError);
      }

      setPhotos((prev) => prev.map((p) => p.id === fileId ? { ...p, file_url: urlData.publicUrl, thumbnail_url: thumbnailUrl, uploading: false } : p));
      setVideoModalOpen(false);
    } catch (error) {
      console.error('Error processing video:', error);
      await alert('Error uploading video. Please try again.', 'Error');
      setPhotos((prev) => prev.filter((p) => !p.uploading || p.type !== 'video'));
    }
  }

  async function handleSubmit(e: React.FormEvent, isDraft: boolean = false) {
    e.preventDefault();

    if (!isEditMode && !companyId) {
      await alert('No company selected.', 'Error');
      return;
    }
    if (!isDraft && !customerSignature) {
      await alert('Customer signature is required.', 'Error');
      return;
    }

    try {
      isDraft ? setSavingDraft(true) : setSubmitting(true);

      const reportData = {
        serviceDate,
        technicianName,
        customerName,
        customerEmail,
        property,
        serviceType,
        salesRepresentativeId,
        additionalNotes,
        customerPrintName,
        espresso_location: espresso.location,
        espresso_coffeeTypes: espresso.coffeeTypes,
        espresso_machineModel: espresso.machineModel,
        espresso_machineSerial: espresso.machineSerial,
        espresso_grinderModel: espresso.grinderModel,
        espresso_grinderSerial: espresso.grinderSerial,
        espresso_grindTimeSingle: espresso.grindTimeSingle,
        espresso_grindTimeDouble: espresso.grindTimeDouble,
        espresso_doseStatus: espresso.doseStatus,
        espresso_doseValue: espresso.doseValue,
        espresso_waterTempStatus: espresso.waterTempStatus,
        espresso_waterTempValue: espresso.waterTempValue,
        espresso_pumpPressureStatus: espresso.pumpPressureStatus,
        espresso_pumpPressureValue: espresso.pumpPressureValue,
        espresso_extractionTimeStatus: espresso.extractionTimeStatus,
        espresso_volumeStatus: espresso.volumeStatus,
        espresso_filterDate: espresso.filterDate,
        espresso_filterStatus: espresso.filterStatus,
        coffee_location: coffee.location,
        coffee_coffeeTypes: coffee.coffeeTypes,
        coffee_machineModel: coffee.machineModel,
        coffee_machineSerial: coffee.machineSerial,
        coffee_grinderModel: coffee.grinderModel,
        coffee_grinderSerial: coffee.grinderSerial,
        coffee_doseStatus: coffee.doseStatus,
        coffee_doseValue: coffee.doseValue,
        coffee_waterTempStatus: coffee.waterTempStatus,
        coffee_waterTempValue: coffee.waterTempValue,
        coffee_volumeStatus: coffee.volumeStatus,
        coffee_filterDate: coffee.filterDate,
        coffee_filterStatus: coffee.filterStatus,
      };

      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', userProfile?.id)
        .single();

      const technicianId = techData?.id || null;

      let signatureUrl = customerSignature;
      if (customerSignature && customerSignature.startsWith('data:')) {
        const base64Response = await fetch(customerSignature);
        const blob = await base64Response.blob();
        const signatureFileName = `signatures/signature_${Date.now()}_${userProfile?.id || 'unknown'}.png`;

        const { error: uploadError } = await supabase.storage
          .from('service-reports')
          .upload(signatureFileName, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(signatureFileName);
          signatureUrl = urlData.publicUrl;
        }
      }

      let reportRecordId: string;

      if (isEditMode && editReportId) {
        const { data: updateData, error: updateError } = await supabase
          .from('service_reports')
          .update({
            sales_representative_id: salesRepresentativeId || null,
            status: isDraft ? 'draft' : 'submitted',
            form_data: reportData,
            signature_url: signatureUrl || null,
            submitted_at: isDraft ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editReportId)
          .select('id')
          .single();

        if (updateError) throw updateError;
        if (!updateData) throw new Error('Failed to update report');
        reportRecordId = updateData.id;

        const { error: deletePhotosError } = await supabase.from('report_photos').delete().eq('report_id', reportRecordId);
        if (deletePhotosError) {
          console.error('Error deleting old photo records:', deletePhotosError);
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('service_reports')
          .insert({
            form_id: CF105_FORM_ID,
            technician_id: technicianId,
            company_id: companyId,
            sales_representative_id: salesRepresentativeId || null,
            status: isDraft ? 'draft' : 'submitted',
            form_data: reportData,
            signature_url: signatureUrl || null,
            submitted_at: isDraft ? null : new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!inserted) throw new Error('Failed to create report');
        reportRecordId = inserted.id;
      }

      if (photos.length > 0) {
        const fileRecords = photos.map((p, index) => ({
          report_id: reportRecordId,
          file_url: p.file_url,
          thumbnail_url: p.file_url,
          file_name: p.file_name,
          file_size: p.file_size,
          mime_type: p.mime_type,
          order_index: index,
        }));

        const { error: filesError } = await supabase.from('report_photos').insert(fileRecords);
        if (filesError) {
          console.error('Error saving photo records:', filesError);
          throw new Error('Failed to save file records');
        }
      }

      if (!isDraft) {
        try {
          console.log('📧 Sending notification email...');
          const emailResponse = await fetch('/.netlify/functions/send-report-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId: reportRecordId }),
          });
          
          if (emailResponse.ok) {
            console.log('✅ Email sent successfully');
          } else {
            console.warn('⚠️ Error sending email, but report was saved correctly');
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail entire process if email fails
        }
      }

      const successMessage = isEditMode
        ? (isDraft 
            ? 'Draft updated successfully!' 
            : 'Draft submitted successfully!')
        : (isDraft 
            ? 'Draft saved successfully! You can continue it later from History.' 
            : 'Report submitted successfully!');

      await alert(successMessage, 'Success');
      navigate('../..');
    } catch (error: any) {
      console.error('Error submitting CF105 report:', error);
      const actionText = isDraft ? (isEditMode ? 'updating draft' : 'saving draft') : 'submitting report';
      await alert(`Error ${actionText}: ${error.message}`, 'Error');
    } finally {
      setSubmitting(false);
      setSavingDraft(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-4">
        <div className="text-center text-red-600">Form not found</div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {isEditMode && (
        <div className="mb-3 bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center gap-2">
          <Edit className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-900">Editing Draft</p>
            <p className="text-xs text-amber-700">You're continuing a previously saved draft.</p>
          </div>
        </div>
      )}

      <div className="mb-3">
        <h1 className="text-base md:text-lg font-bold text-gray-900">{form.name}</h1>
        {form.description && <p className="text-gray-600 text-xs md:text-sm mt-0.5">{form.description}</p>}
      </div>

      {companyInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4">
          <h2 className="text-sm md:text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Company Name</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{companyInfo.name}</p>
            </div>
            {companyInfo.address && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-0.5">Address</p>
                <p className="text-sm md:text-base text-gray-900">{companyInfo.address}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
          <h2 className="text-sm md:text-base font-semibold text-green-900 mb-3">Service Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Date</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{serviceDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Technician</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{technicianName}</p>
            </div>
            <Input
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              required
            />
            <Input
              label="Customer Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
              required
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xs md:text-sm"
              >
                <option value="">Select...</option>
                <option value="PLD">PLD</option>
                <option value="La Colombe">La Colombe</option>
                <option value="Owner">Owner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xs md:text-sm"
              >
                <option value="">Select...</option>
                <option value="Delivery">Delivery</option>
                <option value="Pick up">Pick up</option>
                <option value="Service">Service</option>
                <option value="Tune up">Tune up</option>
                <option value="Training">Training</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sales Rep
              </label>
              <select
                value={salesRepresentativeId}
                onChange={(e) => setSalesRepresentativeId(e.target.value)}
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xs md:text-sm"
              >
                <option value="">None</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.full_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Who requested this service?
              </p>
            </div>
          </div>
        </div>

        <QualitySection
          icon={<Coffee className="w-4 h-4" />}
          title="Espresso"
          coffeeTypeOptions={ESPRESSO_COFFEE_TYPES}
          value={espresso}
          onChange={setEspresso}
          showEspressoOnlyFields
        />

        <QualitySection
          icon={<Coffee className="w-4 h-4" />}
          title="Coffee (Batch Brewer)"
          coffeeTypeOptions={BATCH_COFFEE_TYPES}
          value={coffee}
          onChange={setCoffee}
          showEspressoOnlyFields={false}
        />

        <Textarea
          label="Additional Notes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any additional observations or recommendations"
          rows={3}
        />

        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">{videosEnabled ? 'Photos & Videos' : 'Photos'}</h2>
          
          {photos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                  {photo.uploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : photo.type === 'video' ? (
                    <div className="relative w-full h-full bg-black rounded overflow-hidden">
                      {photo.thumbnail_url ? (
                        <img src={photo.thumbnail_url} alt="Video thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <video src={photo.file_url} className="w-full h-full object-cover" muted />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Video className="w-6 h-6 text-white opacity-80" />
                      </div>
                      {photo.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                          {Math.floor(photo.duration)}s
                        </div>
                      )}
                    </div>
                  ) : (
                    <img src={photo.file_url} alt="" className="w-full h-full object-cover" />
                  )}
                  {!photo.uploading && (
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={`grid gap-2 ${videosEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {/* Camera Button */}
            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition"
            >
              <Camera className="w-6 h-6 text-blue-600 mb-1" />
              <span className="text-sm font-medium text-blue-700">Camera</span>
            </button>

            {videosEnabled && (
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 active:bg-purple-200 transition"
              >
                <Video className="w-6 h-6 text-purple-600 mb-1" />
                <span className="text-sm font-medium text-purple-700">Video</span>
              </button>
            )}

            {/* Gallery Button */}
            <div>
              <label 
                htmlFor="file-gallery"
                className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-green-300 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 active:bg-green-200 transition"
              >
                <Image className="w-6 h-6 text-green-600 mb-1" />
                <span className="text-sm font-medium text-green-700">Gallery</span>
              </label>
              <input
                id="file-gallery"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
          <SignaturePad
            label="Customer Signature"
            value={customerSignature}
            onChange={setCustomerSignature}
            required
          />
          
          <div className="mt-3">
            <Input
              label="Print Name"
              value={customerPrintName}
              onChange={(e) => setCustomerPrintName(e.target.value)}
              placeholder="Print customer name"
              required
            />
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Customer acknowledges services performed
          </p>
        </div>

        <div className="flex gap-2 sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={savingDraft}
            onClick={(e) => handleSubmit(e as any, true)}
          >
            Save Draft
          </Button>
          <Button type="submit" fullWidth loading={submitting}>
            Submit Report
          </Button>
        </div>
      </form>

      {/* Camera Modal */}
      {cameraModalOpen && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setCameraModalOpen(false)}
        />
      )}
      {videoModalOpen && (
        <VideoRecorderModal
          onCapture={handleVideoCapture}
          onClose={() => setVideoModalOpen(false)}
          maxDuration={settings?.max_video_duration_seconds || 120}
        />
      )}
    </div>
  );
}

function StatusToggle({
  label,
  spec,
  options,
  value,
  onChange,
  valuePlaceholder,
  valueField,
  onValueChange,
}: {
  label: string;
  spec?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  valuePlaceholder?: string;
  valueField?: string;
  onValueChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {spec && <p className="text-[11px] text-gray-500">{spec}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              value === opt
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
            }`}
          >
            {opt}
          </button>
        ))}
        {onValueChange && (
          <input
            type="text"
            value={valueField}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={valuePlaceholder}
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        )}
      </div>
    </div>
  );
}

function QualitySection({
  icon,
  title,
  coffeeTypeOptions,
  value,
  onChange,
  showEspressoOnlyFields,
}: {
  icon: React.ReactNode;
  title: string;
  coffeeTypeOptions: string[];
  value: EquipmentQuality;
  onChange: (v: EquipmentQuality) => void;
  showEspressoOnlyFields: boolean;
}) {
  const set = (patch: Partial<EquipmentQuality>) => onChange({ ...value, ...patch });

  function toggleCoffeeType(type: string) {
    const exists = value.coffeeTypes.includes(type);
    set({ coffeeTypes: exists ? value.coffeeTypes.filter((t) => t !== type) : [...value.coffeeTypes, type] });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
      <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>

      <div className="mb-3">
        <Input
          label="Equipment Location"
          value={value.location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="e.g., Front Counter, Kitchen, Bar Area"
        />
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-gray-700 mb-1">Coffee Type <span className="text-gray-400 font-normal">(select all that apply)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {coffeeTypeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleCoffeeType(type)}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${
                value.coffeeTypes.includes(type)
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Input label="Machine Model" value={value.machineModel} onChange={(e) => set({ machineModel: e.target.value })} />
        <Input label="Serial" value={value.machineSerial} onChange={(e) => set({ machineSerial: e.target.value })} />
        <Input label="Grinder Model" value={value.grinderModel} onChange={(e) => set({ grinderModel: e.target.value })} />
        <Input label="Serial" value={value.grinderSerial} onChange={(e) => set({ grinderSerial: e.target.value })} />
      </div>

      {showEspressoOnlyFields && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Input
            label="Grind Out Time - Single (sec)"
            type="number"
            value={value.grindTimeSingle}
            onChange={(e) => set({ grindTimeSingle: e.target.value })}
          />
          <Input
            label="Grind Out Time - Double (sec)"
            type="number"
            value={value.grindTimeDouble}
            onChange={(e) => set({ grindTimeDouble: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-3">
        <StatusToggle
          label="Coffee Dose"
          spec={showEspressoOnlyFields ? 'Ground Coffee Dose: 7g ±0.5g (single), 14g ±0.5g (double)' : 'Refer to quality parameter sheet for batch volumes'}
          options={['Ok', 'Adjusted']}
          value={value.doseStatus}
          onChange={(v) => set({ doseStatus: v })}
          valueField={value.doseValue}
          valuePlaceholder="Adjusted to"
          onValueChange={(v) => set({ doseValue: v })}
        />

        <StatusToggle
          label="Water Temperature"
          spec={showEspressoOnlyFields ? '92°C ±2°C = 194°-201°F' : '200°-205°F from water spout'}
          options={['Ok', 'Adjusted']}
          value={value.waterTempStatus}
          onChange={(v) => set({ waterTempStatus: v })}
          valueField={value.waterTempValue}
          valuePlaceholder="°C/°F"
          onValueChange={(v) => set({ waterTempValue: v })}
        />

        {showEspressoOnlyFields && (
          <>
            <StatusToggle
              label="Pump Pressure"
              spec="9 Bar ±0.5 bar = 8.5-9.5 bar"
              options={['Ok', 'Adjusted']}
              value={value.pumpPressureStatus}
              onChange={(v) => set({ pumpPressureStatus: v })}
              valueField={value.pumpPressureValue}
              valuePlaceholder="Bar"
              onValueChange={(v) => set({ pumpPressureValue: v })}
            />
            <StatusToggle
              label="Extraction Time"
              spec='5" + 25-30" after pre-infusion'
              options={['Ok', 'Adjusted']}
              value={value.extractionTimeStatus}
              onChange={(v) => set({ extractionTimeStatus: v })}
            />
            <StatusToggle
              label="Espresso Volume"
              spec="25 ml ±5 ml = 20-30 ml"
              options={['Ok', 'Adjusted']}
              value={value.volumeStatus}
              onChange={(v) => set({ volumeStatus: v })}
            />
          </>
        )}

        {!showEspressoOnlyFields && (
          <StatusToggle
            label="Water Volume"
            spec="Measured in ounces. Refer to quality parameter sheet"
            options={['Ok', 'Adjusted']}
            value={value.volumeStatus}
            onChange={(v) => set({ volumeStatus: v })}
          />
        )}

        <div className="flex items-end gap-2 flex-wrap">
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">Water Filter Date</label>
            <input
              type="date"
              value={value.filterDate}
              onChange={(e) => set({ filterDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {['Ok', 'Need Replacement'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set({ filterStatus: value.filterStatus === opt ? '' : opt })}
                className={`px-2.5 py-1 text-xs rounded-full border transition ${
                  value.filterStatus === opt
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Camera Modal Component - Simple code that works perfectly
interface CameraModalProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);

  // Start camera - Following complete instructions for mobile
  async function startCamera(facingMode: 'environment' | 'user') {
    try {
      setError(null);
      
      // Detener stream anterior si existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      console.log('📹 getUserMedia con facingMode:', facingMode);
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      console.log('✅ Stream obtenido');
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = newStream;
        
        // ⚠️ CRITICAL: Wait for video to load its metadata
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            console.log('✅ Video metadata cargado:', video.videoWidth, 'x', video.videoHeight);
            resolve();
          };
        });
        
        // ⚠️ CRITICAL: Start playback explicitly
        await video.play();
        console.log('✅ Video reproduciendo');
        
        // ⚠️ CRITICAL: Additional wait to stabilize
        await new Promise(r => setTimeout(r, 300));
        
        // Verificar dimensiones
        console.log('📐 Dimensiones finales:', video.videoWidth, 'x', video.videoHeight);
        console.log('📊 Paused:', video.paused, '| Muted:', video.muted);
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn('⚠️ Dimensiones 0x0 detectadas');
        }
      }
    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      const errorMsg = 'Could not access camera';
      setError(errorMsg);
      throw err;
    }
  }

  // Capturar foto
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        cleanup();
      }
    }, 'image/jpeg', 0.9);
  }

  // Toggle between rear and front camera
  async function toggleCamera() {
    const previousFacingMode = currentFacingMode;
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    try {
      await startCamera(newFacingMode);
      setCurrentFacingMode(newFacingMode);
    } catch (err) {
      // Si falla, mantener la anterior
      console.error('Error switching camera:', err);
      setCurrentFacingMode(previousFacingMode);
      setError('Camera not available');
      setTimeout(() => setError(null), 3000);
    }
  }

  // Limpiar al cerrar
  function cleanup() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  }

  // Start camera when modal opens
  useEffect(() => {
    startCamera(currentFacingMode);
    
    // Event listeners para reactivar video cuando vuelve a la app
    const handleVisibilityChange = () => {
      if (!document.hidden && videoRef.current?.srcObject && videoRef.current.paused) {
        console.log('🔄 Reactivando video (visibilitychange)');
        videoRef.current.play().catch(e => console.warn('Error reactivando:', e));
      }
    };
    
    const handleFocus = () => {
      if (videoRef.current?.srcObject && videoRef.current.paused) {
        console.log('🔄 Reactivando video (focus)');
        videoRef.current.play().catch(e => console.warn('Error reactivando:', e));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          backgroundColor: '#000',
        }}
      />

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Error Message */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          padding: '1rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Controles */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}>
        {/* Close Button */}
        <button
          onClick={cleanup}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid white',
            backgroundColor: 'rgba(220, 38, 38, 0.8)',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Capture Button */}
        <button
          onClick={capturePhoto}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            border: '5px solid white',
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            cursor: 'pointer',
          }}
        />

        {/* Toggle Camera Button */}
        <button
          onClick={toggleCamera}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid white',
            backgroundColor: 'rgba(75, 85, 99, 0.8)',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🔄
        </button>
      </div>
    </div>
  );
}
