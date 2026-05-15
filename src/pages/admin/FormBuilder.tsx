import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFormStore } from '@/stores/formStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { Plus, Edit2, Trash2, GripVertical, Eye, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dynamicFormSchema, type DynamicFormInput } from '@/utils/validationSchemas';
import type { DynamicForm, FormField, FieldType } from '@/types';

export default function FormBuilderPage() {
  const { forms, setForms, loading, setLoading, formFields, setFormFields } = useFormStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<DynamicForm | null>(null);
  const [selectedForm, setSelectedForm] = useState<DynamicForm | null>(null);
  const [previewForm, setPreviewForm] = useState<DynamicForm | null>(null);
  const [newlyCreatedFormId, setNewlyCreatedFormId] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  async function loadForms() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dynamic_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteForm(form: DynamicForm) {
    if (!confirm(`Delete form "${form.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete from Supabase (cascade will delete fields)
      const { error } = await supabase
        .from('dynamic_forms')
        .delete()
        .eq('id', form.id);

      if (error) throw error;
      await loadForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Error deleting form');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-gray-600 mt-1">Create and manage dynamic forms</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Form
        </Button>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => {
          const fieldCount = formFields.filter(f => f.form_id === form.id).length;
          
          return (
          <Card key={form.id}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{form.name}</h3>
                  {form.description && (
                    <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {form.category && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {form.category}
                      </span>
                    )}
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    form.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedForm(form)}
                    variant="primary"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit Fields
                  </Button>
                  <button
                    onClick={() => setPreviewForm(form)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteForm(form)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      {forms.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 text-primary-600 mb-4">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start creating forms!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Custom forms allow technicians to capture specific information for each type of service.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-blue-800 text-left">
                <strong>📝 Step 1:</strong> Create a form (e.g., "Preventive Maintenance")<br/>
                <strong>➕ Step 2:</strong> Add fields (name, date, notes, etc.)<br/>
                <strong>👁️ Step 3:</strong> Preview how it will look for technicians
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create My First Form
            </Button>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingForm(null);
        }}
        form={editingForm}
        onSuccess={(newFormId) => {
          loadForms();
          // If it's a new form, open field editor
          if (newFormId && !editingForm) {
            setNewlyCreatedFormId(newFormId);
            // Give time for the form to load
            setTimeout(() => {
              const form = forms.find(f => f.id === newFormId);
              if (form) {
                setSelectedForm(form);
              }
            }, 100);
          }
        }}
      />

      {/* Field Builder Modal */}
      {selectedForm && (
        <FieldBuilderModal
          form={selectedForm}
          isOpen={!!selectedForm}
          onClose={() => setSelectedForm(null)}
        />
      )}

      {/* Preview Modal */}
      {previewForm && (
        <FormPreviewModal
          form={previewForm}
          isOpen={!!previewForm}
          onClose={() => setPreviewForm(null)}
        />
      )}
    </div>
  );
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: DynamicForm | null;
  onSuccess: (newFormId?: string) => void;
}

function FormModal({ isOpen, onClose, form, onSuccess }: FormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { forms, setForms } = useFormStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DynamicFormInput>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: form || {},
  });

  const onSubmit = async (data: DynamicFormInput) => {
    try {
      setLoading(true);
      setError(null);

      let newFormId: string | undefined;
      
      // Save to Supabase
      if (form) {
        const { error: updateError } = await supabase
          .from('dynamic_forms')
          .update(data)
          .eq('id', form.id);

        if (updateError) throw updateError;
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('dynamic_forms')
          .insert([data])
          .select()
          .single();

        if (insertError) throw insertError;
        if (insertedData) newFormId = insertedData.id;
      }

      reset();
      onClose();
      onSuccess(newFormId);
    } catch (err: any) {
      setError(err.message || 'Error saving form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={form ? 'Edit Form' : 'New Form'}
      size="md"
    >
      {!form && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl">💡</span>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">2-Step Process:</h4>
              <ol className="text-sm text-blue-800 space-y-1 mb-3">
                <li><strong>Step 1 (now):</strong> Define name and category</li>
                <li><strong>Step 2 (next):</strong> Add custom fields</li>
              </ol>
              <div className="flex flex-wrap gap-1 text-xs text-blue-700">
                <span className="px-2 py-1 bg-white rounded">📝 Text</span>
                <span className="px-2 py-1 bg-white rounded">📅 Date</span>
                <span className="px-2 py-1 bg-white rounded">✅ Checkbox</span>
                <span className="px-2 py-1 bg-white rounded">🖼️ Photo</span>
                <span className="px-2 py-1 bg-white rounded">✍️ Signature</span>
                <span className="px-2 py-1 bg-white rounded">+ more</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          {...register('name')}
          label="Form Name"
          error={errors.name?.message}
          required
        />

        <Textarea
          {...register('description')}
          label="Description"
          error={errors.description?.message}
        />

        <Input
          {...register('category')}
          label="Category"
          error={errors.category?.message}
          placeholder="e.g., Maintenance, Repair, Inspection"
        />

        <div className="flex items-center">
          <input
            {...register('is_active')}
            type="checkbox"
            id="is_active"
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
            Active form
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {form ? 'Update Form' : '✨ Create and Add Fields'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface FieldBuilderModalProps {
  form: DynamicForm;
  isOpen: boolean;
  onClose: () => void;
}

function FieldBuilderModal({ form, isOpen, onClose }: FieldBuilderModalProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingField, setIsAddingField] = useState(false);
  const { formFields, setFormFields } = useFormStore();

  useEffect(() => {
    if (isOpen) {
      loadFields();
    }
  }, [isOpen, form.id]);

  async function loadFields() {
    try {
      setLoading(true);
      
      // Load from Supabase
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error loading fields:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    if (!confirm('Are you sure you want to delete this field?')) return;

    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
      await loadFields();
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Fields: ${form.name}`} size="xl">
      <div className="space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Build your form:</strong> Add all necessary fields. Technicians will see them in this order when filling out the form.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {fields.length === 0 ? (
              <div className="text-center py-12 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 mb-3">
                    <Plus className="w-8 h-8" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Start building your form!</p>
                  <p className="text-sm text-gray-600 mb-4">This form has no fields yet. Add fields so technicians can fill in information.</p>
                </div>
                <Button onClick={() => setIsAddingField(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Add First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition"
                  >
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{field.field_label}</h4>
                        {field.is_required && (
                          <span className="text-xs text-red-600">*</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Type: {field.field_type} • Name: {field.field_name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isAddingField && fields.length > 0 && (
              <Button onClick={() => setIsAddingField(true)} fullWidth>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            )}

            {isAddingField && (
              <AddFieldForm
                formId={form.id}
                orderIndex={fields.length}
                onSuccess={() => {
                  setIsAddingField(false);
                  loadFields();
                }}
                onCancel={() => setIsAddingField(false)}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

interface AddFieldFormProps {
  formId: string;
  orderIndex: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddFieldForm({ formId, orderIndex, onSuccess, onCancel }: AddFieldFormProps) {
  const [loading, setLoading] = useState(false);
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const { formFields, setFormFields } = useFormStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const fieldData: FormField = {
        id: `field_${Date.now()}`,
        form_id: formId,
        field_name: data.field_name,
        field_label: data.field_label,
        field_type: fieldType,
        placeholder: data.placeholder || undefined,
        is_required: data.is_required || false,
        help_text: data.help_text || undefined,
        order_index: orderIndex,
      };

      // Save to Supabase
      const { error } = await supabase.from('form_fields').insert([fieldData]);
      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error adding field:', error);
    } finally {
      setLoading(false);
    }
  };

  const fieldTypes: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'select', label: 'Select' },
    { value: 'radio', label: 'Radio' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'signature', label: 'Signature' },
    { value: 'file', label: 'File' },
  ];

  return (
    <Card>
      <div className="p-6 bg-blue-50 border-2 border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">➕ Add New Field</h3>
        <p className="text-sm text-gray-600 mb-4">Define the fields that will appear in this form</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('field_name', { required: true })}
              label="Field Name"
              placeholder="e.g., customer_name"
              required
            />

            <Input
              {...register('field_label', { required: true })}
              label="Label"
              placeholder="e.g., Customer Name"
              required
            />
          </div>

          <Select
            label="Field Type"
            options={fieldTypes}
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            required
          />

          <Input
            {...register('placeholder')}
            label="Placeholder (optional)"
            placeholder="Help text"
          />

          <Input
            {...register('help_text')}
            label="Help Text (optional)"
            placeholder="Additional information"
          />

          <div className="flex items-center">
            <input
              {...register('is_required')}
              type="checkbox"
              id="is_required"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="is_required" className="ml-2 text-sm text-gray-700">
              Required field
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Field
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

interface FormPreviewModalProps {
  form: DynamicForm;
  isOpen: boolean;
  onClose: () => void;
}

function FormPreviewModal({ form, isOpen, onClose }: FormPreviewModalProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const { formFields } = useFormStore();

  useEffect(() => {
    if (isOpen) {
      loadFields();
    }
  }, [isOpen, form.id]);

  async function loadFields() {
    try {
      setLoading(true);
      
      // Load from Supabase
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error loading fields:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderField = (field: FormField) => {
    const baseClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent";
    
    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder || ''}
            className={`${baseClasses} resize-none`}
            rows={4}
          />
        );
      case 'select':
        return (
          <select className={baseClasses}>
            <option value="">Select an option</option>
          </select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              {field.placeholder || 'Option'}
            </label>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="radio"
                name={field.field_name}
                className="w-4 h-4 text-primary-600 border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700">Option 1</label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                name={field.field_name}
                className="w-4 h-4 text-primary-600 border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700">Option 2</label>
            </div>
          </div>
        );
      case 'signature':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500 text-sm">Signature area</p>
          </div>
        );
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500 text-sm">Upload file</p>
          </div>
        );
      default:
        return (
          <input
            type={field.field_type}
            placeholder={field.placeholder || ''}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${form.name}`} size="lg">
      <div className="space-y-6">
        {form.description && (
          <p className="text-gray-600 text-sm">{form.description}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No fields to display</p>
            <p className="text-sm text-gray-400 mt-1">Add fields to see the preview</p>
          </div>
        ) : (
          <form className="space-y-6">
            {fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.field_label}
                  {field.is_required && <span className="text-red-600 ml-1">*</span>}
                </label>
                {renderField(field)}
                {field.help_text && (
                  <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>Preview:</strong> This is an example of how the form will look for technicians.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
