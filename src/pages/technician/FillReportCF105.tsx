import { useEffect, useState } from 'react';
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
import { Coffee, Building2, Upload, X, Edit } from 'lucide-react';
import { optimizeImages } from '@/utils/imageOptimization';
import type { DynamicForm } from '@/types';

export const CF105_FORM_ID = '00000000-0000-0000-0000-000000000105';

const ESPRESSO_COFFEE_TYPES = ['Kimbo', 'La Colombe', 'Hausbrandt', 'Beans', 'Fractional Pack', 'Capsules', 'Paper Pods', 'Cold Brew'];
const BATCH_COFFEE_TYPES = ['Kimbo', 'La Colombe', 'Hausbrandt', 'Beans', 'Fractional Pack', 'Cold Brew'];

interface UploadedFile {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploading?: boolean;
}

interface EquipmentQuality {
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
  const [primeLineRepresentative, setPrimeLineRepresentative] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [equipmentLocation, setEquipmentLocation] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

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

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    loadForm();
  }, []);

  useEffect(() => {
    loadCompanyAndTechnicianData();
  }, [companyId, userProfile]);

  async function loadCompanyAndTechnicianData() {
    if (userProfile?.full_name) {
      setPrimeLineRepresentative(userProfile.full_name);
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
        setContactName(companyData.contact_name || '');
        setContactPhone(companyData.contact_phone || '');
      }
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
      setPrimeLineRepresentative(d.primeLineRepresentative || userProfile?.full_name || '');
      setContactName(d.contactName || '');
      setContactPhone(d.contactPhone || '');
      setEquipmentLocation(d.equipmentLocation || '');
      setAdditionalNotes(d.additionalNotes || '');
      setEspresso({ ...emptyQuality(), ...(d.espresso || {}) });
      setCoffee({ ...emptyQuality(), ...(d.coffee || {}) });

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
            file_name: p.file_name,
            file_size: p.file_size,
            mime_type: p.mime_type,
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
          { id: fileId, file_url: '', file_name: fileName, file_size: photo.file.size, mime_type: 'image/webp', uploading: true },
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
        primeLineRepresentative,
        contactName,
        contactPhone,
        equipmentLocation,
        additionalNotes,
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
        reportRecordId = updateData.id;

        await supabase.from('report_photos').delete().eq('report_id', reportRecordId);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('service_reports')
          .insert({
            form_id: CF105_FORM_ID,
            technician_id: technicianId,
            company_id: companyId,
            status: isDraft ? 'draft' : 'submitted',
            form_data: reportData,
            signature_url: signatureUrl || null,
            submitted_at: isDraft ? null : new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
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
        if (filesError) console.error('Error saving photo records:', filesError);
      }

      if (!isDraft) {
        try {
          const emailResponse = await fetch('/.netlify/functions/send-report-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId: reportRecordId }),
          });
          if (!emailResponse.ok) console.warn('Error sending email, but report was saved correctly');
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      const successMessage = isEditMode
        ? isDraft
          ? 'Draft updated successfully!'
          : 'Draft submitted successfully!'
        : isDraft
        ? 'Draft saved successfully! You can continue it later from History.'
        : 'Report submitted successfully!';

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
          <h2 className="text-sm md:text-base font-semibold text-green-900 mb-3">Visit Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Date</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{serviceDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-0.5">Prime Line Representative</p>
              <p className="text-sm md:text-base font-semibold text-gray-900">{primeLineRepresentative}</p>
            </div>
            <Input
              label="Equipment Location"
              value={equipmentLocation}
              onChange={(e) => setEquipmentLocation(e.target.value)}
              placeholder="e.g., Front Counter, Kitchen"
            />
            <Input
              label="On-site Contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Contact person name"
            />
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
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Photos</h2>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 cursor-pointer hover:border-primary-400 hover:text-primary-600 transition">
            <Upload className="w-4 h-4" />
            Choose files or drag here
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handlePhotoUpload} />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                  {photo.uploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    <img src={photo.file_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <SignaturePad
          label="Customer Signature"
          value={customerSignature}
          onChange={setCustomerSignature}
          required
        />

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
