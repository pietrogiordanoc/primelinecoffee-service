import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, ChevronRight, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { DynamicForm, Company } from '@/types';

export default function TechnicianHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  async function loadData() {
    try {
      setLoading(true);

      if (!userProfile?.id) {
        setLoading(false);
        return;
      }

      // Load ALL active companies (available to all technicians)
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Get last visit dates for each company
      if (companiesData) {
        const companiesWithVisits = await Promise.all(
          companiesData.map(async (company) => {
            const { data: lastReport } = await supabase
              .from('service_reports')
              .select('created_at')
              .eq('company_id', company.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...company,
              last_visit: lastReport?.created_at || null,
            };
          })
        );
        setCompanies(companiesWithVisits as any);
      } else {
        setCompanies([]);
      }

      // Load active forms
      const { data: formsData } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setForms(formsData || []);
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Companies</h2>
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
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Address
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      City / State
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Visit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company: any) => (
                    <tr
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                      className={`cursor-pointer transition-colors ${
                        selectedCompany?.id === company.id
                          ? 'bg-primary-50 border-l-4 border-l-primary-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {selectedCompany?.id === company.id && (
                            <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center mr-2 flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-900">
                            {company.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm text-gray-600">{company.address || '-'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {company.city}
                          {company.state && `, ${company.state}`}
                        </p>
                        {company.postal_code && (
                          <p className="text-xs text-gray-400">{company.postal_code}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{company.contact_name || '-'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{company.contact_phone || '-'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{company.contact_email || '-'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {company.last_visit ? (
                          <div>
                            <p className="text-sm text-gray-900">
                              {new Date(company.last_visit).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(company.last_visit).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Never</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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
      />
    </div>
  );
}

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company: Company) => void;
}

function AddCompanyModal({ isOpen, onClose, onSuccess }: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      // Use Netlify function to create company
      const response = await fetch('/.netlify/functions/upsert-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
          contact_name: data.contact_name || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          notes: data.notes || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error creating company');

      // Fetch the created company
      const { data: newCompanyData, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', result.id)
        .single();

      if (fetchError) throw fetchError;

      onSuccess(newCompanyData);
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
