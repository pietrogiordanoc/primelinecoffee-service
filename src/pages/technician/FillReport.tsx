import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useSettingsStore } from '@/stores/settingsStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Camera, X, Check, Plus, Trash2, ChevronDown, ChevronUp, Image, Video, Upload } from 'lucide-react';
import { compressVideo, validateVideo, getVideoDuration } from '@/utils/videoCompression';
import { optimizeImages } from '@/utils/imageOptimization';
import type { DynamicForm, OptimizedPhoto } from '@/types';

// Uploaded file record (already in Supabase Storage)
interface UploadedFile {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  type: 'photo' | 'video';
  duration?: number; // for videos
  uploading?: boolean;
  uploadProgress?: number;
}

interface EquipmentRecord {
  id: string;
  brand: string;
  model: string;
  serial: string;
  problem: string;
  work_performed: string;
  hours: number;
  parts_used: Array<{ name: string; quantity: number; cost: number }>;
  files: UploadedFile[]; // Changed from photos to files (includes photos and videos)
  collapsed: boolean;
}

export default function FillReport() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const { userProfile } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { alert } = useConfirm();

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // General service data
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [property, setProperty] = useState('');
  const [serviceType, setServiceType] = useState('');
  
  // Equipment records
  const [equipmentRecords, setEquipmentRecords] = useState<EquipmentRecord[]>([
    {
      id: '1',
      brand: '',
      model: '',
      serial: '',
      problem: '',
      work_performed: '',
      hours: 0,
      parts_used: [],
      files: [], // Changed from photos to files
      collapsed: false,
    },
  ]);
  
  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentEquipmentId, setCurrentEquipmentId] = useState<string | null>(null);

  // Load settings immediately on mount
  useEffect(() => {
    console.log('🔄 FillReport mounted - loading settings...');
    fetchSettings();
  }, []);

  useEffect(() => {
    loadForm();
  }, [formId]);

  // Debug: Log settings to verify they're loading
  useEffect(() => {
    if (settings) {
      console.log('🎥 VIDEO SETTINGS:', {
        enable_videos: settings.enable_videos,
        enable_videos_type: typeof settings.enable_videos,
        max_video_size_mb: settings.max_video_size_mb,
        max_video_duration_seconds: settings.max_video_duration_seconds,
        full_settings: settings,
      });
    } else {
      console.warn('⚠️ Settings are NULL or not loaded yet');
    }
  }, [settings]);

  // Compute video enabled status with fallback to true if settings not loaded
  const videosEnabled = settings?.enable_videos !== false; // Default to true if undefined or null

  useEffect(() => {
    loadCompanyAndTechnicianData();
  }, [companyId, userProfile]);

  // Check HTTPS and camera permissions
  useEffect(() => {
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    console.log('🔒 Protocolo:', window.location.protocol);
    console.log('🌐 URL completa:', window.location.href);
    console.log('✅ HTTPS activo:', isHTTPS);
    console.log('🏠 Es localhost:', isLocalhost);
    
    if (!isHTTPS && !isLocalhost) {
      console.error('❌ WARNING: Site is NOT using HTTPS. Camera may not work on mobile devices.');
      console.error('❌ Solution: Make sure to access via https:// or wait for Netlify deployment');
    } else {
      console.log('✅ Secure site for camera use (HTTPS or localhost)');
    }

    // Verificar disponibilidad de API de medios
    if (navigator.mediaDevices) {
      console.log('✅ API navigator.mediaDevices available');
      
      // Intentar verificar permisos (puede no funcionar en todos los navegadores)
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          console.log('✅ Camera permissions granted or available');
        })
        .catch((err) => {
          console.warn('⚠️ Camera permissions not available:', err.message);
          console.log('ℹ️ This is normal if you haven\'t used the camera yet. Permissions will be requested when taking a photo.');
        });
    } else {
      console.error('❌ API navigator.mediaDevices NOT available in this browser');
    }
  }, []);

  async function loadCompanyAndTechnicianData() {
    try {
      // Auto-fill technician name from logged-in user
      if (userProfile?.full_name) {
        setTechnicianName(userProfile.full_name);
      }

      // Auto-fill company data
      if (companyId) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyData) {
          setCustomerName(companyData.contact_name || companyData.name || '');
          setCustomerEmail(companyData.contact_email || '');
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  }

  async function loadForm() {
    try {
      setLoading(true);
      
      if (!formId) {
        setForm(null);
        return;
      }
      
      const { data: formData, error: formError } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('id', formId)
        .single();
        
      if (formError) throw formError;
      setForm(formData);
    } catch (error) {
      console.error('Error loading form:', error);
    } finally {
      setLoading(false);
    }
  }

  function addEquipmentRecord() {
    const newRecord: EquipmentRecord = {
      id: Date.now().toString(),
      brand: '',
      model: '',
      serial: '',
      problem: '',
      work_performed: '',
      hours: 0,
      parts_used: [],
      files: [],
      collapsed: false,
    };
    setEquipmentRecords([...equipmentRecords, newRecord]);
  }

  function removeEquipmentRecord(id: string) {
    if (equipmentRecords.length === 1) {
      alert('There must be at least one equipment record.', 'Attention');
      return;
    }
    setEquipmentRecords(equipmentRecords.filter(r => r.id !== id));
  }

  function toggleEquipmentCollapse(id: string) {
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === id ? { ...r, collapsed: !r.collapsed } : r
      )
    );
  }

  function updateEquipmentField(id: string, field: keyof EquipmentRecord, value: any) {
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      )
    );
  }

  function addPartToEquipment(equipmentId: string) {
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === equipmentId
          ? { ...r, parts_used: [...r.parts_used, { name: '', quantity: 1, cost: 0 }] }
          : r
      )
    );
  }

  function removePartFromEquipment(equipmentId: string, partIndex: number) {
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === equipmentId
          ? { ...r, parts_used: r.parts_used.filter((_, idx) => idx !== partIndex) }
          : r
      )
    );
  }

  function updatePart(equipmentId: string, partIndex: number, field: 'name' | 'quantity' | 'cost', value: any) {
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === equipmentId
          ? {
              ...r,
              parts_used: r.parts_used.map((part, idx) =>
                idx === partIndex ? { ...part, [field]: value } : part
              ),
            }
          : r
      )
    );
  }

  // Upload file immediately to Supabase Storage
  async function uploadFileImmediately(
    file: Blob,
    fileName: string,
    mimeType: string,
    type: 'photo' | 'video',
    equipmentId: string,
    duration?: number
  ): Promise<void> {
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const uploadedFile: UploadedFile = {
      id: fileId,
      file_url: '',
      file_name: fileName,
      file_size: file.size,
      mime_type: mimeType,
      type,
      duration,
      uploading: true,
      uploadProgress: 0,
    };

    // Add file to state with uploading status
    setEquipmentRecords(prev =>
      prev.map(r =>
        r.id === equipmentId ? { ...r, files: [...r.files, uploadedFile] } : r
      )
    );

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(fileName, file, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('service-photos')
        .getPublicUrl(fileName);

      // Update file with URL and remove uploading status
      setEquipmentRecords(prev =>
        prev.map(r =>
          r.id === equipmentId
            ? {
                ...r,
                files: r.files.map(f =>
                  f.id === fileId
                    ? { ...f, file_url: urlData.publicUrl, uploading: false }
                    : f
                ),
              }
            : r
        )
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      // Remove failed upload from state
      setEquipmentRecords(prev =>
        prev.map(r =>
          r.id === equipmentId
            ? { ...r, files: r.files.filter(f => f.id !== fileId) }
            : r
        )
      );
      throw error;
    }
  }

  async function handlePhotoUpload(equipmentId: string, e: React.ChangeEvent<HTMLInputElement>) {
    console.log('📸 handlePhotoUpload called', { equipmentId, filesCount: e.target.files?.length });
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      console.log('❌ No files selected');
      return;
    }

    console.log('✅ Files selected:', files.length);
    
    try {
      // Validate photo size
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

      // Optimize images
      const optimized = await optimizeImages(files);
      console.log('✅ Images optimized:', optimized.length);
      
      // Upload each photo immediately
      for (let i = 0; i < optimized.length; i++) {
        const photo = optimized[i];
        const timestamp = Date.now() + i;
        const fileName = `photo_${timestamp}_${equipmentId}.webp`;
        
        await uploadFileImmediately(
          photo.file,
          fileName,
          'image/webp',
          'photo',
          equipmentId
        );
      }
      
      // Reset input to allow selecting the same image again
      e.target.value = '';
    } catch (error) {
      console.error('❌ Error uploading photos:', error);
      await alert('Error uploading photos. Please try again.', 'Error');
    }
  }

  function removePhoto(equipmentId: string, photoIndex: number) {
    const equipment = equipmentRecords.find(r => r.id === equipmentId);
    if (!equipment) return;

    const fileToRemove = equipment.files[photoIndex];
    
    // Remove from Supabase Storage
    if (fileToRemove?.file_name) {
      supabase.storage
        .from('service-photos')
        .remove([fileToRemove.file_name])
        .catch(err => console.error('Error deleting file from storage:', err));
    }

    // Remove from state
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === equipmentId
          ? { ...r, files: r.files.filter((_, idx) => idx !== photoIndex) }
          : r
      )
    );
  }

  // Handle photo captured from camera modal
  async function handleCapturedPhoto(blob: Blob) {
    if (!currentEquipmentId) return;
    
    try {
      // Validate photo size
      const maxPhotoSize = (settings?.max_photo_size_mb || 10) * 1024 * 1024;
      if (blob.size > maxPhotoSize) {
        await alert(
          `Photo too large (${(blob.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${settings?.max_photo_size_mb || 10} MB`,
          'Error'
        );
        return;
      }

      // Convert blob to File
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const optimized = await optimizeImages([file]);
      
      if (optimized.length > 0) {
        const timestamp = Date.now();
        const fileName = `photo_${timestamp}_${currentEquipmentId}.webp`;
        
        await uploadFileImmediately(
          optimized[0].file,
          fileName,
          'image/webp',
          'photo',
          currentEquipmentId
        );
      }
      
      // Close modal
      setCameraModalOpen(false);
      setCurrentEquipmentId(null);
    } catch (error) {
      console.error('Error processing captured photo:', error);
      await alert('Error processing photo. Please try again.', 'Error');
    }
  }

  // Handle video captured from video recorder modal
  async function handleCapturedVideo(blob: Blob) {
    if (!currentEquipmentId) return;
    
    try {
      // Check if videos are enabled (strict check here)
      if (settings && settings.enable_videos === false) {
        await alert('Video uploads are currently disabled.', 'Information');
        return;
      }

      // Convert blob to File for validation
      const videoFile = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });

      // Validate video duration
      const duration = await getVideoDuration(videoFile);
      const maxDuration = settings?.max_video_duration_seconds || 120;
      if (duration > maxDuration) {
        await alert(
          `Video too long (${duration.toFixed(0)}s). Maximum allowed: ${maxDuration}s`,
          'Error'
        );
        return;
      }

      // Compress video if enabled
      let finalBlob: Blob = blob;
      if (settings?.video_compression_enabled) {
        finalBlob = await compressVideo(videoFile, {
          maxHeight: settings.video_max_resolution_height || 720,
          maxWidth: 1280,
          targetBitrate: settings.video_target_bitrate_mbps || 1.5,
        });
      }

      // Validate video size after compression
      const maxVideoSize = (settings?.max_video_size_mb || 50) * 1024 * 1024;
      if (finalBlob.size > maxVideoSize) {
        await alert(
          `Video too large (${(finalBlob.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${settings?.max_video_size_mb || 50} MB`,
          'Error'
        );
        return;
      }

      const timestamp = Date.now();
      const fileName = `video_${timestamp}_${currentEquipmentId}.mp4`;
      
      await uploadFileImmediately(
        finalBlob,
        fileName,
        'video/mp4',
        'video',
        currentEquipmentId,
        duration
      );
      
      // Close modal
      setVideoModalOpen(false);
      setCurrentEquipmentId(null);
    } catch (error) {
      console.error('Error processing captured video:', error);
      await alert('Error processing video. Please try again.', 'Error');
    }
  }

  // Calculate totals
  const totalHours = equipmentRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
  const totalPartsCost = equipmentRecords.reduce(
    (sum, r) => sum + r.parts_used.reduce((pSum, p) => pSum + (p.quantity * p.cost || 0), 0),
    0
  );
  const totalParts = equipmentRecords.reduce((sum, r) => sum + r.parts_used.length, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!companyId) {
      await alert('No company selected.', 'Error');
      return;
    }

    try {
      setSubmitting(true);

      const reportData = {
        serviceDate,
        technicianName,
        customerName,
        customerEmail,
        property,
        serviceType,
        equipmentRecords: equipmentRecords.map(r => ({
          brand: r.brand,
          model: r.model,
          serial: r.serial,
          problem: r.problem,
          work_performed: r.work_performed,
          hours: r.hours,
          parts_used: r.parts_used,
          fileCount: r.files.length,
          photoCount: r.files.filter(f => f.type === 'photo').length,
          videoCount: r.files.filter(f => f.type === 'video').length,
        })),
        summary: {
          totalHours,
          totalPartsCost,
          totalParts,
          equipmentCount: equipmentRecords.length,
        },
      };

      // Get technician ID
      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', userProfile?.id)
        .single();

      if (!techData) throw new Error('Technician not found');

      // Create service report first
      const { data: reportData2, error: reportError } = await supabase
        .from('service_reports')
        .insert({
          form_id: formId!,
          technician_id: techData.id,
          company_id: companyId,
          status: 'submitted',
          form_data: reportData,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (reportError) throw reportError;
      if (!reportData2) throw new Error('Failed to create report');

      const reportId = reportData2.id;

      // Insert photo/video records into database (files are already uploaded)
      const allFiles = equipmentRecords.flatMap(r => r.files);
      
      if (allFiles.length > 0) {
        const fileRecords = allFiles.map((file, index) => ({
          report_id: reportId,
          file_url: file.file_url,
          thumbnail_url: file.thumbnail_url || file.file_url,
          file_name: file.file_name,
          file_size: file.file_size,
          mime_type: file.mime_type,
          order_index: index,
        }));

        const { error: filesError } = await supabase
          .from('report_photos')
          .insert(fileRecords);

        if (filesError) {
          console.error('Error saving file records:', filesError);
          throw new Error('Failed to save file records');
        }
      }

      // Send email notification
      try {
        console.log('📧 Sending notification email...');
        const emailResponse = await fetch('/.netlify/functions/send-report-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId }),
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

      await alert('Report submitted successfully!', 'Success');
      navigate('/technician');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      await alert('Error submitting report: ' + error.message, 'Error');
    } finally {
      setSubmitting(false);
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
      <div className="mb-3">
        <h1 className="text-lg font-bold text-gray-900">
          {form.name}
          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            v2.0 🎥
          </span>
        </h1>
        {form.description && (
          <p className="text-gray-600 text-sm mt-0.5">{form.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General Service Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Service Information</h2>
          <div className="space-y-2">
            <Input
              label="Date"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
            />
            <Input
              label="Technician Name"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Technician name"
              required
              disabled
            />
            <Input
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              required
              disabled
            />
            <Input
              label="Customer Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@email.com"
              disabled
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select...</option>
                <option value="PLD">PLD</option>
                <option value="La Colombe">La Colombe</option>
                <option value="Owner">Owner</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
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
          </div>
        </div>

        {/* Equipment Service Records */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Equipment Service Records</h2>
            <Button type="button" onClick={addEquipmentRecord} size="sm" variant="secondary">
              <Plus className="w-4 h-4 mr-1" />
              Add Equipment
            </Button>
          </div>

          <div className="space-y-2">
            {equipmentRecords.map((equipment, index) => (
              <div key={equipment.id} className="bg-white border border-gray-200 rounded-lg">
                {/* Equipment Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => toggleEquipmentCollapse(equipment.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {equipment.collapsed ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      Equipment #{index + 1}
                      {equipment.brand && ` - ${equipment.brand} ${equipment.model}`}
                    </span>
                  </button>
                  {equipmentRecords.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEquipmentRecord(equipment.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Equipment Details */}
                {!equipment.collapsed && (
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Brand"
                        value={equipment.brand}
                        onChange={(e) => updateEquipmentField(equipment.id, 'brand', e.target.value)}
                        placeholder="e.g. La Marzocco"
                        required
                      />
                      <Input
                        label="Model"
                        value={equipment.model}
                        onChange={(e) => updateEquipmentField(equipment.id, 'model', e.target.value)}
                        placeholder="e.g. Linea PB"
                        required
                      />
                    </div>
                    
                    <Input
                      label="Serial Number"
                      value={equipment.serial}
                      onChange={(e) => updateEquipmentField(equipment.id, 'serial', e.target.value)}
                      placeholder="Serial number"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description</label>
                      <textarea
                        value={equipment.problem}
                        onChange={(e) => updateEquipmentField(equipment.id, 'problem', e.target.value)}
                        placeholder="Describe the problem found"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Performed</label>
                      <textarea
                        value={equipment.work_performed}
                        onChange={(e) => updateEquipmentField(equipment.id, 'work_performed', e.target.value)}
                        placeholder="Describe what work was done"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        rows={2}
                      />
                    </div>

                    <Input
                      label="Hours Spent"
                      type="number"
                      step="0.5"
                      value={equipment.hours}
                      onChange={(e) => updateEquipmentField(equipment.id, 'hours', parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />

                    {/* Parts Used */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">Parts Used</label>
                        <button
                          type="button"
                          onClick={() => addPartToEquipment(equipment.id)}
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          + Add Part
                        </button>
                      </div>
                      {equipment.parts_used.length > 0 && (
                        <div className="space-y-1">
                          {equipment.parts_used.map((part, partIdx) => (
                            <div key={partIdx} className="flex gap-1">
                              <input
                                type="text"
                                value={part.name}
                                onChange={(e) => updatePart(equipment.id, partIdx, 'name', e.target.value)}
                                placeholder="Part name"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <input
                                type="number"
                                value={part.quantity}
                                onChange={(e) => updatePart(equipment.id, partIdx, 'quantity', parseInt(e.target.value) || 0)}
                                placeholder="Qty"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={part.cost}
                                onChange={(e) => updatePart(equipment.id, partIdx, 'cost', parseFloat(e.target.value) || 0)}
                                placeholder="Cost"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => removePartFromEquipment(equipment.id, partIdx)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Photos & Videos */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {videosEnabled ? '📸 Photos & Videos (v2.0 - VIDEO ENABLED ✅)' : '📸 Photos Only (Videos: OFF ❌)'}
                      </label>
                      
                      {/* DEBUG INFO - Remove after testing */}
                      <div className="text-xs text-gray-500 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <strong>DEBUG:</strong> enable_videos = {String(settings?.enable_videos)} | 
                        Type: {typeof settings?.enable_videos} | 
                        Settings loaded: {settings ? 'YES' : 'NO'} | 
                        videosEnabled = {String(videosEnabled)}
                      </div>
                      
                      {equipment.files.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {equipment.files.map((file, fileIdx) => (
                            <div key={file.id} className="relative">
                              {file.uploading ? (
                                <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center">
                                  <Upload className="w-6 h-6 text-gray-400 animate-pulse" />
                                </div>
                              ) : file.type === 'video' ? (
                                <div className="relative w-full h-20 bg-black rounded overflow-hidden">
                                  <video
                                    src={file.file_url}
                                    className="w-full h-full object-cover"
                                    muted
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Video className="w-6 h-6 text-white opacity-80" />
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={file.file_url}
                                  alt={`File ${fileIdx + 1}`}
                                  className="w-full h-20 object-cover rounded"
                                />
                              )}
                              {!file.uploading && (
                                <button
                                  type="button"
                                  onClick={() => removePhoto(equipment.id, fileIdx)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Photo/Video buttons */}
                      <div className={`grid gap-2 ${videosEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {/* Camera Button - Opens modal with getUserMedia */}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentEquipmentId(equipment.id);
                            setCameraModalOpen(true);
                          }}
                          className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition"
                        >
                          <Camera className="w-6 h-6 text-blue-600 mb-1" />
                          <span className="text-sm font-medium text-blue-700">Camera</span>
                        </button>

                        {/* Video Button - Opens video recorder modal (if enabled) */}
                        {videosEnabled && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentEquipmentId(equipment.id);
                              setVideoModalOpen(true);
                            }}
                            className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 active:bg-purple-200 transition"
                          >
                            <Video className="w-6 h-6 text-purple-600 mb-1" />
                            <span className="text-sm font-medium text-purple-700">Video</span>
                          </button>
                        )}

                        {/* Gallery Button */}
                        <div>
                          <label 
                            htmlFor={`file-gallery-${equipment.id}`}
                            className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-green-300 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 active:bg-green-200 transition"
                          >
                            <Image className="w-6 h-6 text-green-600 mb-1" />
                            <span className="text-sm font-medium text-green-700">Gallery</span>
                          </label>
                          <input
                            id={`file-gallery-${equipment.id}`}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              console.log('🖼️ Gallery onChange', e.target.files?.length);
                              handlePhotoUpload(equipment.id, e);
                            }}
                            style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Service Summary</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Equipment Serviced:</span>
              <span className="font-medium text-gray-900 ml-1">{equipmentRecords.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Hours:</span>
              <span className="font-medium text-gray-900 ml-1">{totalHours.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-600">Parts Used:</span>
              <span className="font-medium text-gray-900 ml-1">{totalParts}</span>
            </div>
            <div>
              <span className="text-gray-600">Parts Cost:</span>
              <span className="font-medium text-gray-900 ml-1">${totalPartsCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          loading={submitting}
          size="md"
          fullWidth
          className="sticky bottom-16 z-10 mt-4"
        >
          <Check className="w-4 h-4 mr-2" />
          Submit Report
        </Button>
      </form>

      {/* Camera Modal - Simple code that works */}
      {cameraModalOpen && (
        <CameraModal
          onCapture={handleCapturedPhoto}
          onClose={() => {
            setCameraModalOpen(false);
            setCurrentEquipmentId(null);
          }}
        />
      )}

      {/* Video Recorder Modal */}
      {videoModalOpen && (
        <VideoRecorderModal
          onCapture={handleCapturedVideo}
          onClose={() => {
            setVideoModalOpen(false);
            setCurrentEquipmentId(null);
          }}
          maxDuration={settings?.max_video_duration_seconds || 120}
        />
      )}
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
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('user');
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
        webkit-playsinline="true"
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

// Video Recorder Modal Component
interface VideoRecorderModalProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  maxDuration: number;
}

function VideoRecorderModal({ onCapture, onClose, maxDuration }: VideoRecorderModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);

  // Start camera
  async function startCamera(facingMode: 'environment' | 'user') {
    try {
      setError(null);
      
      // Stop previous stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true // Include audio for videos
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera');
    }
  }

  // Start recording
  function startRecording() {
    if (!stream) return;

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onCapture(blob);
        cleanup();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not start recording');
    }
  }

  // Stop recording
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  // Toggle camera
  async function toggleCamera() {
    const wasRecording = isRecording;
    if (wasRecording) stopRecording();

    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    try {
      await startCamera(newFacingMode);
      setCurrentFacingMode(newFacingMode);
    } catch (err) {
      console.error('Error switching camera:', err);
      setError('Camera not available');
    }
  }

  // Cleanup
  function cleanup() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (isRecording) {
      stopRecording();
    }
    onClose();
  }

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, maxDuration]);

  // Start camera on mount
  useEffect(() => {
    startCamera(currentFacingMode);
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        muted={!isRecording}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          backgroundColor: '#000',
        }}
      />

      {/* Recording Indicator */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'white',
            animation: 'pulse 1s infinite',
          }} />
          {formatTime(recordingTime)} / {formatTime(maxDuration)}
        </div>
      )}

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

      {/* Controls */}
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
          disabled={isRecording}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid white',
            backgroundColor: isRecording ? 'rgba(107, 114, 128, 0.5)' : 'rgba(220, 38, 38, 0.8)',
            color: 'white',
            fontSize: '24px',
            cursor: isRecording ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isRecording ? 0.5 : 1,
          }}
        >
          ×
        </button>

        {/* Record/Stop Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            border: '5px solid white',
            backgroundColor: isRecording ? 'rgba(220, 38, 38, 0.8)' : 'rgba(220, 38, 38, 0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          {isRecording ? '■' : '●'}
        </button>

        {/* Toggle Camera Button */}
        <button
          onClick={toggleCamera}
          disabled={isRecording}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid white',
            backgroundColor: isRecording ? 'rgba(107, 114, 128, 0.5)' : 'rgba(75, 85, 99, 0.8)',
            color: 'white',
            fontSize: '24px',
            cursor: isRecording ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isRecording ? 0.5 : 1,
          }}
        >
          🔄
        </button>
      </div>
    </div>
  );
}
