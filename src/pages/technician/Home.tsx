import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useFormStore } from '@/stores/formStore';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, ChevronRight, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { DynamicForm, Company } from '@/types';
import { useDemoData } from '@/utils/useDemoData';

export default function TechnicianHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { companies: storeCompanies, setCompanies: setStoreCompanies } = useCompanyStore();
  const { forms: storeForms } = useFormStore();
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const { isDemoMode } = useDemoData();

  useEffect(() => {
    loadData();
  }, [userProfile, isDemoMode, storeCompanies, storeForms]);

  async function loadData() {
    try {
      setLoading(true);

      if (isDemoMode) {
        // Demo mode: load from store
        setCompanies(storeCompanies);
        // In demo, use forms from store (wait for them to load)
        if (storeForms.length > 0) {
          setForms(storeForms.filter(f => f.is_active));
        }
      } else {
        // Get technician ID
        const { data: techData } = await supabase
          .from('technicians')
          .select('id')
          .eq('user_id', userProfile?.id)
          .single();

        if (!techData) throw new Error('Technician not found');

        // Load assigned companies
        const { data: assignedCompanies } = await supabase
          .from('technician_companies')
          .select('company:companies(*)')
          .eq('technician_id', techData.id);

        const companyList = assignedCompanies?.map((ac: any) => ac.company) || [];
        setCompanies(companyList);

        // Load active forms
        const { data: formsData } = await supabase
          .from('dynamic_forms')
          .select('*')
          .eq('is_active', true)
          .order('name');

        setForms(formsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleStartReport(formId: string) {
    if (!selectedCompany) {
      alert('Please select a company first');
      return;
    }
    navigate(`/technician/report/${formId}?company=${selectedCompany.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Select Company */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-sm font-semibold text-gray-900 flex-shrink-0">Companies</label>
          <Button
            onClick={() => setIsAddCompanyModalOpen(true)}
            variant="secondary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        {companies.length === 0 ? (
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-2">No companies</p>
              <Button onClick={() => setIsAddCompanyModalOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Company
              </Button>
            </div>
          </Card>
        ) : (
          <select
            value={selectedCompany?.id || ''}
            onChange={(e) => {
              const company = companies.find(c => c.id === e.target.value);
              setSelectedCompany(company || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
          >
            <option value="">Select a company...</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.city && ` • ${company.city}`}
                {company.address && ` • ${company.address}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Select Form */}
      {selectedCompany && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Service Type
          </h2>
          <div className="space-y-2">
            {forms.length === 0 ? (
              <Card>
                <div className="p-4 text-center text-sm text-gray-500">
                  No forms available
                </div>
              </Card>
            ) : (
              forms.map((form) => (
                <button
                  key={form.id}
                  onClick={() => handleStartReport(form.id)}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 bg-white hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-7 h-7 rounded bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="ml-2 flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          <strong>{form.name}</strong>
                          {form.category && <span className="text-gray-500 font-normal"> • {form.category}</span>}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        onSuccess={(newCompany) => {
          setCompanies([...companies, newCompany]);
          setSelectedCompany(newCompany);
          setIsAddCompanyModalOpen(false);
        }}
        isDemoMode={isDemoMode}
      />
    </div>
  );
}

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company: Company) => void;
  isDemoMode?: boolean;
}

function AddCompanyModal({ isOpen, onClose, onSuccess, isDemoMode }: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { companies, setCompanies } = useCompanyStore();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      const newCompany: Company = {
        id: `company_${Date.now()}`,
        name: data.name,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        contact_name: data.contact_name || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        notes: data.notes || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      if (isDemoMode) {
        // Demo mode: add to store
        setCompanies([...companies, newCompany]);
        onSuccess(newCompany);
      } else {
        // Production mode: save to Supabase
        const { data: insertedData, error: insertError } = await supabase
          .from('companies')
          .insert([newCompany])
          .select()
          .single();

        if (insertError) throw insertError;
        onSuccess(insertedData);
      }

      reset();
    } catch (err: any) {
      setError(err.message || 'Error creating company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Company" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          {...register('name', { required: 'Name is required' })}
          label="Company Name"
          placeholder="Ex: Cafe Central"
          error={errors.name?.message as string}
          required
        />

        <Input
          {...register('address')}
          label="Address"
          placeholder="Street and number"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            {...register('city')}
            label="City"
            placeholder="City"
          />
          <Input
            {...register('postal_code')}
            label="ZIP"
            placeholder="00000"
          />
        </div>

        <Input
          {...register('contact_name')}
          label="Contact"
          placeholder="Name"
        />

        <Input
          {...register('contact_phone')}
          label="Phone"
          placeholder="555-1234"
        />

        <Input
          {...register('contact_email')}
          type="email"
          label="Email"
          placeholder="contact@company.com"
        />

        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="secondary" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button type="submit" loading={loading} size="sm">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
