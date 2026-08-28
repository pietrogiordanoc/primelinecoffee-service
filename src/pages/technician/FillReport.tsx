import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useSettingsStore } from '@/stores/settingsStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SignaturePad from '@/components/ui/SignaturePad';
import { Camera, X, Check, Plus, Trash2, ChevronDown, ChevronUp, Image, Video, Upload, Edit } from 'lucide-react';
import { compressVideo, validateVideo, getVideoDuration, generateVideoThumbnail } from '@/utils/videoCompression';
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
  parts_used: Array<{ name: string; quantity: number }>;
  files: UploadedFile[]; // Changed from photos to files (includes photos and videos)
  collapsed: boolean;
}

export default function FillReport() {
  const navigate = useNavigate();
  const { formId, reportId } = useParams<{ formId?: string; reportId?: string }>();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const { userProfile } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { alert } = useConfirm();

  // Check if we're editing a draft (URL contains /edit)
  const isEditMode = window.location.pathname.includes('/edit');
  const editReportId = isEditMode ? reportId : null; // Use reportId from URL params

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  
  // General service data
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [property, setProperty] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [salesRepresentativeId, setSalesRepresentativeId] = useState('');
  
  // Sales representatives list
  const [salesReps, setSalesReps] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  
  // Company information
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    contact_name: string;
    contact_email: string;
    address?: string;
    phone?: string;
  } | null>(null);
  
  // Equipment records
  const [equipmentRecords, setEquipmentRecords] = useState<EquipmentRecord[]>([
    {
      id: '1',
      brand: '',
      model: '',
      serial: '',
      problem: '',
      work_performed: '',
      parts_used: [],
      files: [], // Changed from photos to files
      collapsed: false,
    },
  ]);
  
  // Additional fields
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');
  const [customerPrintName, setCustomerPrintName] = useState('');
  
  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentEquipmentId, setCurrentEquipmentId] = useState<string | null>(null);

  // Load settings immediately on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    loadForm();
    loadSalesRepresentatives();
  }, [formId]);

  // Compute video enabled status with fallback to true if settings not loaded
  const videosEnabled = settings?.enable_videos !== false; // Default to true if undefined or null

  useEffect(() => {
    loadCompanyAndTechnicianData();
  }, [companyId, userProfile]);

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
          // Store full company info for display
          setCompanyInfo({
            name: companyData.name || '',
            contact_name: companyData.contact_name || '',
            contact_email: companyData.contact_email || '',
            address: companyData.address || '',
            phone: companyData.phone || '',
          });
          
          // Auto-fill form fields
          setCustomerName(companyData.contact_name || companyData.name || '');
          setCustomerEmail(companyData.contact_email || '');
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  }

  async function loadForm() {
    // If we're editing a draft, load the report data instead
    if (isEditMode && editReportId) {
      await loadDraftReport(editReportId);
      return;
    }
    
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

  async function loadDraftReport(reportId: string) {
    console.log('🎬 === LOADING DRAFT REPORT ===');
    console.log('📋 Report ID:', reportId);
    console.log('👤 User Profile:', userProfile);
    
    try {
      setLoading(true);
      
      // Load the draft report
      console.log('📥 Step 1: Fetching draft report from database...');
      const { data: report, error: reportError } = await supabase
        .from('service_reports')
        .select('*, companies(name, contact_name, contact_email, address, contact_phone)')
        .eq('id', reportId)
        .eq('status', 'draft')
        .single();

      if (reportError) {
        console.error('❌ ERROR loading draft report:', reportError);
        console.error('   Code:', reportError.code);
        console.error('   Message:', reportError.message);
        console.error('   Details:', reportError.details);
        throw reportError;
      }
      
      if (!report) {
        console.error('❌ No draft report found with ID:', reportId);
        await alert('This draft report could not be found or is no longer available.', 'Draft Not Found');
        navigate('../history');
        return;
      }

      console.log('✅ Draft report loaded successfully!');
      console.log('   Report:', report);
      console.log('   Form ID needed:', report.form_id);
      console.log('   Status:', report.status);

      // Load the form
      console.log('📥 Step 2: Fetching form definition...');
      console.log('   Attempting to load form ID:', report.form_id);
      
      const { data: loadedForm, error: formError } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('id', report.form_id)
        .single();

      console.log('📊 Form query result:');
      console.log('   Data:', loadedForm);
      console.log('   Error:', formError);

      if (formError) {
        console.error('❌ ERROR loading form:', formError);
        console.error('   Code:', formError.code);
        console.error('   Message:', formError.message);
        console.error('   Details:', formError.details);
        console.error('   Hint:', formError.hint);
        throw formError;
      }
      
      if (!loadedForm) {
        console.error('❌ Form query returned null/undefined');
        console.error('   Form ID searched:', report.form_id);
        console.error('   This means the form exists but RLS denied access');
        throw new Error('Form not found');
      }

      console.log('✅ Form loaded successfully!');
      console.log('   Form name:', loadedForm.name);
      console.log('   Form is_active:', loadedForm.is_active);
      setForm(loadedForm);

      // Set company info
      if (report.companies) {
        setCompanyInfo({
          name: report.companies.name,
          contact_name: report.companies.contact_name,
          contact_email: report.companies.contact_email,
          address: report.companies.address,
          phone: report.companies.contact_phone,
        });
      }

      // Populate form fields from form_data
      const formData = report.form_data || {};
      
      setServiceDate(formData.serviceDate || new Date().toISOString().split('T')[0]);
      setTechnicianName(formData.technicianName || userProfile?.full_name || '');
      setCustomerName(formData.customerName || '');
      setCustomerEmail(formData.customerEmail || '');
      setProperty(formData.property || '');
      setServiceType(formData.serviceType || '');
      setSalesRepresentativeId(formData.salesRepresentativeId || report.sales_representative_id || '');
      setAdditionalNotes(formData.additionalNotes || '');
      setCustomerPrintName(formData.customerPrintName || '');
      
      // Populate equipment records if they exist
      if (formData.equipmentRecords && Array.isArray(formData.equipmentRecords)) {
        setEquipmentRecords(formData.equipmentRecords);
      }

      // Load signature if exists
      if (report.signature_url) {
        setCustomerSignature(report.signature_url);
      }

      // Load photos/videos
      const { data: photos, error: photosError } = await supabase
        .from('report_photos')
        .select('*')
        .eq('report_id', reportId);

      if (!photosError && photos) {
        // Group photos by equipment_reference_id
        const photosByEquipment: Record<string, UploadedFile[]> = {};
        
        photos.forEach(photo => {
          const equipmentId = photo.equipment_reference_id || '1';
          if (!photosByEquipment[equipmentId]) {
            photosByEquipment[equipmentId] = [];
          }
          
          photosByEquipment[equipmentId].push({
            id: photo.id,
            file_url: photo.file_url,
            thumbnail_url: photo.thumbnail_url,
            file_name: photo.file_name,
            file_size: photo.file_size,
            mime_type: photo.mime_type,
            type: photo.mime_type.startsWith('video/') ? 'video' : 'photo',
            duration: photo.duration,
          });
        });

        // Update equipment records with their files
        setEquipmentRecords(prev => prev.map(eq => ({
          ...eq,
          files: photosByEquipment[eq.id] || [],
        })));
      }

    } catch (error) {
      console.error('Error loading draft report:', error);
      await alert('Failed to load draft report. Please try again.', 'Error');
      navigate('../history');
    } finally {
      setLoading(false);
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

  function addEquipmentRecord() {
    const newRecord: EquipmentRecord = {
      id: Date.now().toString(),
      brand: '',
      model: '',
      serial: '',
      problem: '',
      work_performed: '',
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
          ? { ...r, parts_used: [...r.parts_used, { name: '', quantity: 1 }] }
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

  function updatePart(equipmentId: string, partIndex: number, field: 'name' | 'quantity', value: any) {
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

      let thumbnailUrl = urlData.publicUrl; // Default to video URL for photos

      // Generate and upload thumbnail for videos
      if (type === 'video') {
        try {
          console.log('🎬 Generating video thumbnail...');
          const thumbnailBlob = await generateVideoThumbnail(file, 0.5);
          const thumbnailFileName = fileName.replace(/\.(mp4|webm|mov)$/i, '_thumb.jpg');
          
          console.log('📤 Uploading thumbnail:', thumbnailFileName);
          const { error: thumbError } = await supabase.storage
            .from('service-photos')
            .upload(thumbnailFileName, thumbnailBlob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false,
            });

          if (thumbError) {
            console.warn('⚠️ Failed to upload thumbnail:', thumbError);
          } else {
            const { data: thumbUrlData } = supabase.storage
              .from('service-photos')
              .getPublicUrl(thumbnailFileName);
            thumbnailUrl = thumbUrlData.publicUrl;
            console.log('✅ Thumbnail uploaded:', thumbnailUrl);
          }
        } catch (thumbError) {
          console.warn('⚠️ Error generating video thumbnail:', thumbError);
          // Continue without thumbnail - will show video icon instead
        }
      }

      // Update file with URL, thumbnail URL, and remove uploading status
      setEquipmentRecords(prev =>
        prev.map(r =>
          r.id === equipmentId
            ? {
                ...r,
                files: r.files.map(f =>
                  f.id === fileId
                    ? { 
                        ...f, 
                        file_url: urlData.publicUrl, 
                        thumbnail_url: thumbnailUrl,
                        uploading: false 
                      }
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
  const totalParts = equipmentRecords.reduce((sum, r) => sum + r.parts_used.length, 0);

  async function handleSubmit(e: React.FormEvent, isDraft: boolean = false) {
    e.preventDefault();

    // In edit mode, use editReportId instead of companyId check
    if (!isEditMode && !companyId) {
      await alert('No company selected.', 'Error');
      return;
    }

    // Only require signature for final submission
    // Signature is now optional - customer can submit without signing
    // if (!isDraft && !customerSignature) {
    //   await alert('Customer signature is required.', 'Error');
    //   return;
    // }

    try {
      if (isDraft) {
        setSavingDraft(true);
      } else {
        setSubmitting(true);
      }

      // Capture technician's local time information
      const localDate = new Date();
      const localTimeString = localDate.toLocaleString('en-US', { 
        dateStyle: 'long', 
        timeStyle: 'long' 
      });
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const reportData = {
        serviceDate,
        technicianName,
        customerName,
        customerEmail,
        property,
        serviceType,
        additionalNotes,
        customerPrintName,
        customerSignature: customerSignature || null,
        technicianLocalTime: localTimeString,
        technicianTimeZone: timeZone,
        equipmentRecords: equipmentRecords.map(r => ({
          brand: r.brand,
          model: r.model,
          serial: r.serial,
          problem: r.problem,
          work_performed: r.work_performed,
          parts_used: r.parts_used,
          fileCount: r.files.length,
          photoCount: r.files.filter(f => f.type === 'photo').length,
          videoCount: r.files.filter(f => f.type === 'video').length,
        })),
        summary: {
          totalParts,
          equipmentCount: equipmentRecords.length,
        },
      };

      // Get technician ID (if user is a technician)
      // Admins/managers in technician mode won't have a technician record
      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', userProfile?.id)
        .single();

      const technicianId = techData?.id || null;
      const isAdminMode = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

      // Upload customer signature to storage
      let signatureUrl = '';
      if (customerSignature) {
        try {
          // Convert base64 to blob
          const base64Response = await fetch(customerSignature);
          const blob = await base64Response.blob();
          
          const timestamp = Date.now();
          const userId = userProfile?.id || 'unknown';
          const signatureFileName = `signature_${timestamp}_${userId}.png`;
          const signaturePath = `signatures/${signatureFileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('service-reports')
            .upload(signaturePath, blob, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Error uploading signature:', uploadError);
          } else if (uploadData) {
            const { data: urlData } = supabase.storage
              .from('service-reports')
              .getPublicUrl(signaturePath);
            signatureUrl = urlData.publicUrl;
          }
        } catch (error) {
          console.error('Error processing signature:', error);
        }
      }

      // Create or update service report
      let reportId: string;

      if (isEditMode && editReportId) {
        // UPDATE existing draft
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
        reportId = updateData.id;

        // When updating, we need to handle photos differently
        // Delete old photo records and re-insert new ones
        const { error: deletePhotosError } = await supabase
          .from('report_photos')
          .delete()
          .eq('report_id', reportId);

        if (deletePhotosError) {
          console.error('Error deleting old photo records:', deletePhotosError);
        }

      } else {
        // INSERT new report
        const { data: reportData2, error: reportError } = await supabase
          .from('service_reports')
          .insert({
            form_id: formId!,
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

        if (reportError) throw reportError;
        if (!reportData2) throw new Error('Failed to create report');
        reportId = reportData2.id;
      }

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

      // Send email notification only for final submission
      if (!isDraft) {
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
      console.error('Error submitting report:', error);
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
      {/* Edit Draft Banner */}
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
        {form.description && (
          <p className="text-gray-600 text-xs md:text-sm mt-0.5">{form.description}</p>
        )}
      </div>

      {/* Company Information Display */}
      {companyInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4">
          <h2 className="text-sm md:text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Company Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Company Name</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{companyInfo.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Contact Person</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{companyInfo.contact_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Contact Email</p>
              <p className="text-sm md:text-base text-gray-900">{companyInfo.contact_email}</p>
            </div>
            {companyInfo.phone && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-0.5">Phone</p>
                <p className="text-sm md:text-base text-gray-900">{companyInfo.phone}</p>
              </div>
            )}
            {companyInfo.address && (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-600 mb-0.5">Address</p>
                <p className="text-sm md:text-base text-gray-900">{companyInfo.address}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service Details */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4 mb-4">
          <h2 className="text-sm md:text-base font-semibold text-green-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Service Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Non-editable fields */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Date</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{serviceDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Technician</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{technicianName}</p>
            </div>
            
            {/* Editable fields */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-xs md:text-sm"
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
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-xs md:text-sm"
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
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-xs md:text-sm"
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

        {/* Equipment Service Records */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">Equipment Service Records</h2>
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
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Problem Description</label>
                      <textarea
                        value={equipment.problem}
                        onChange={(e) => updateEquipmentField(equipment.id, 'problem', e.target.value)}
                        placeholder="Describe the problem found"
                        className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xs"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Work Performed</label>
                      <textarea
                        value={equipment.work_performed}
                        onChange={(e) => updateEquipmentField(equipment.id, 'work_performed', e.target.value)}
                        placeholder="Describe what work was done"
                        className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xs"
                        rows={2}
                      />
                    </div>

                    {/* Parts Used */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs md:text-sm font-medium text-gray-700">Parts Used</label>
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
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                        {videosEnabled ? 'Photos & Videos' : 'Photos'}
                      </label>
                      
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
                                  {file.thumbnail_url ? (
                                    <img
                                      src={file.thumbnail_url}
                                      alt={`Video ${fileIdx + 1} thumbnail`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <video
                                      src={file.file_url}
                                      className="w-full h-full object-cover"
                                      muted
                                    />
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                                    <Video className="w-6 h-6 text-white opacity-80" />
                                  </div>
                                  {file.duration && (
                                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                      {Math.floor(file.duration)}s
                                    </div>
                                  )}
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
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(equipment.id, e)}
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

        {/* Additional Notes */}
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 md:p-3">
          <h2 className="text-xs md:text-sm font-semibold text-gray-900 mb-2">Additional Notes / Recommendations</h2>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Include any recommendations for future service, customer instructions, or additional observations"
            className="w-full px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xs md:text-sm"
            rows={4}
          />
        </div>

        {/* Customer Signature */}
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 md:p-3">
          <SignaturePad
            label="Customer Signature"
            value={customerSignature}
            onChange={setCustomerSignature}
          />
          
          <div className="mt-3">
            <Input
              label="Print Name"
              value={customerPrintName}
              onChange={(e) => setCustomerPrintName(e.target.value)}
              placeholder="Print customer name"
            />
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Customer acknowledges services performed
          </p>
        </div>

        {/* Summary */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-2.5 md:p-3">
          <h2 className="text-xs md:text-sm font-semibold text-gray-900 mb-2">Service Summary</h2>
          <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
            <div>
              <span className="text-gray-600">Equipment Serviced:</span>
              <span className="font-medium text-gray-900 ml-1">{equipmentRecords.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Parts Used:</span>
              <span className="font-medium text-gray-900 ml-1">{totalParts}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-16 z-10 mt-4 flex gap-2">
          {/* Save Draft Button */}
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            loading={savingDraft}
            disabled={submitting}
            variant="secondary"
            size="md"
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Draft</span>
          </Button>
          
          {/* Submit Report Button */}
          <Button
            type="submit"
            onClick={(e) => handleSubmit(e, false)}
            loading={submitting}
            disabled={savingDraft}
            size="md"
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Submit Report</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        </div>
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
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is unavailable. Use HTTPS and a supported browser.');
      }

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (cameraError: any) {
        // Some mobile browsers reject facingMode even when a camera is available.
        if (cameraError?.name !== 'OverconstrainedError' && cameraError?.name !== 'NotFoundError') {
          throw cameraError;
        }
        newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
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
