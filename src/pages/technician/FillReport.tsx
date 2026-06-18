import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Camera, X, Check, Plus, Trash2, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { optimizeImages } from '@/utils/imageOptimization';
import type { DynamicForm, OptimizedPhoto } from '@/types';

interface EquipmentRecord {
  id: string;
  brand: string;
  model: string;
  serial: string;
  problem: string;
  work_performed: string;
  hours: number;
  parts_used: Array<{ name: string; quantity: number; cost: number }>;
  photos: OptimizedPhoto[];
  collapsed: boolean;
}

export default function FillReport() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const { userProfile } = useAuthStore();
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
      photos: [],
      collapsed: false,
    },
  ]);

  useEffect(() => {
    loadForm();
  }, [formId]);

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
      photos: [],
      collapsed: false,
    };
    setEquipmentRecords([...equipmentRecords, newRecord]);
  }

  function removeEquipmentRecord(id: string) {
    if (equipmentRecords.length === 1) {
      alert('Debe haber al menos un registro de equipo.', 'Atención');
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

  async function handlePhotoUpload(equipmentId: string, e: React.ChangeEvent<HTMLInputElement>) {
    console.log('📸 handlePhotoUpload called', { equipmentId, filesCount: e.target.files?.length });
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      console.log('❌ No files selected');
      return;
    }

    console.log('✅ Files selected:', files.length);
    try {
      const optimized = await optimizeImages(files);
      console.log('✅ Images optimized:', optimized.length);
      setEquipmentRecords(
        equipmentRecords.map(r =>
          r.id === equipmentId ? { ...r, photos: [...r.photos, ...optimized] } : r
        )
      );
      // Reset input para permitir seleccionar la misma imagen nuevamente
      e.target.value = '';
    } catch (error) {
      console.error('❌ Error optimizing images:', error);
      await alert('Error al optimizar imágenes. Por favor intenta de nuevo.', 'Error');
    }
  }

  function removePhoto(equipmentId: string, photoIndex: number) {
    setEquipmentRecords(
      equipmentRecords.map(r =>
        r.id === equipmentId
          ? { ...r, photos: r.photos.filter((_, idx) => idx !== photoIndex) }
          : r
      )
    );
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
      await alert('No hay empresa seleccionada.', 'Error');
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
          photoCount: r.photos.length,
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

      // Upload all photos to Supabase Storage
      const allPhotos = equipmentRecords.flatMap(r => r.photos);
      
      if (allPhotos.length > 0) {
        const photoRecords = [];
        
        for (let i = 0; i < allPhotos.length; i++) {
          const photo = allPhotos[i];
          const timestamp = Date.now();
          const fileName = `${reportId}_${timestamp}_${i}.webp`;
          const thumbFileName = `${reportId}_${timestamp}_${i}_thumb.webp`;
          
          try {
            // Upload main photo
            const { error: uploadError } = await supabase.storage
              .from('service-photos')
              .upload(fileName, photo.file, {
                contentType: 'image/webp',
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) throw uploadError;

            // Upload thumbnail
            let thumbnailUrl = '';
            if (photo.thumbnailFile) {
              const { error: thumbError } = await supabase.storage
                .from('service-photos')
                .upload(thumbFileName, photo.thumbnailFile, {
                  contentType: 'image/webp',
                  cacheControl: '3600',
                  upsert: false,
                });

              if (!thumbError) {
                const { data: thumbUrlData } = supabase.storage
                  .from('service-photos')
                  .getPublicUrl(thumbFileName);
                thumbnailUrl = thumbUrlData.publicUrl;
              }
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('service-photos')
              .getPublicUrl(fileName);

            photoRecords.push({
              report_id: reportId,
              file_url: urlData.publicUrl,
              thumbnail_url: thumbnailUrl || urlData.publicUrl,
              file_name: fileName,
              file_size: photo.optimizedSize,
              mime_type: 'image/webp',
              order_index: i,
            });
          } catch (photoError) {
            console.error(`Error uploading photo ${i}:`, photoError);
          }
        }

        // Insert photo records into database
        if (photoRecords.length > 0) {
          const { error: photosError } = await supabase
            .from('report_photos')
            .insert(photoRecords);

          if (photosError) {
            console.error('Error saving photo records:', photosError);
          }
        }
      }

      await alert('¡Reporte enviado exitosamente!', 'Éxito');
      navigate('/technician');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      await alert('Error al enviar el reporte: ' + error.message, 'Error');
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
        <h1 className="text-lg font-bold text-gray-900">{form.name}</h1>
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

                    {/* Photos */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
                      {equipment.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {equipment.photos.map((photo, photoIdx) => (
                            <div key={photoIdx} className="relative">
                              <img
                                src={photo.url}
                                alt={`Photo ${photoIdx + 1}`}
                                className="w-full h-20 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(equipment.id, photoIdx)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Botones para fotos - Solución simple según MDN */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Botón Cámara */}
                        <div>
                          <label 
                            htmlFor={`file-camera-${equipment.id}`}
                            className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition"
                          >
                            <Camera className="w-6 h-6 text-blue-600 mb-1" />
                            <span className="text-sm font-medium text-blue-700">Cámara</span>
                          </label>
                          <input
                            id={`file-camera-${equipment.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              console.log('📸 Camera onChange', e.target.files?.length);
                              handlePhotoUpload(equipment.id, e);
                            }}
                            style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                          />
                        </div>

                        {/* Botón Galería */}
                        <div>
                          <label 
                            htmlFor={`file-gallery-${equipment.id}`}
                            className="flex flex-col items-center justify-center h-20 w-full border-2 border-dashed border-green-300 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 active:bg-green-200 transition"
                          >
                            <Image className="w-6 h-6 text-green-600 mb-1" />
                            <span className="text-sm font-medium text-green-700">Galería</span>
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
    </div>
  );
}
