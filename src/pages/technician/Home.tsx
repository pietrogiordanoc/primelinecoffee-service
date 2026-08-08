import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, ChevronRight, Plus, ChevronDown, Search, MapPin, Phone, Mail, User, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { DynamicForm, Company } from '@/types';

export default function TechnicianHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { alert } = useConfirm();
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      alert('Please select a company first.', 'Attention');
      return;
    }
    navigate(`/technician/report/${formId}?company=${selectedCompany.id}`);
  }

  // Filter companies by search query
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Search Bar - Fixed */}
      <div className="sticky top-0 z-20 bg-gray-50 pb-1.5 -mx-3 px-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs bg-white"
          />
        </div>
      </div>

      {/* Select Company */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Companies</h2>
          <Button
            onClick={() => setIsAddCompanyModalOpen(true)}
            variant="secondary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        {filteredCompanies.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">
                {searchQuery ? 'No companies found' : 'No companies available'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsAddCompanyModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Company
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-1">
            {filteredCompanies.map((company: any) => {
              const isExpanded = expandedCompany === company.id;
              const isSelected = selectedCompany?.id === company.id;
              
              return (
                <div
                  key={company.id}
                  className={`bg-white rounded border transition-all ${
                    isSelected
                      ? 'border-primary-500 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Company Header - Always Visible */}
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer"
                    onClick={() => {
                      setSelectedCompany(company);
                      setExpandedCompany(isExpanded ? null : company.id);
                    }}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                          {company.name}
                        </p>
                        {company.last_visit && (
                          <p className="text-xs text-gray-400 leading-none mt-0.5">
                            {new Date(company.last_visit).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Company Details - Expandable */}
                  {isExpanded && (
                    <div className="px-2 pb-1.5 space-y-1 border-t border-gray-100">
                      {company.address && (
                        <div className="flex items-start gap-1 pt-1.5">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 leading-tight">{company.address}</p>
                            <p className="text-xs text-gray-500 leading-tight">
                              {company.city}{company.state && `, ${company.state}`} {company.postal_code}
                            </p>
                          </div>
                        </div>
                      )}
                      {company.contact_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-900 leading-tight">{company.contact_name}</p>
                        </div>
                      )}
                      {company.contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <a href={`tel:${company.contact_phone}`} className="text-xs text-primary-600 hover:underline leading-tight">
                            {company.contact_phone}
                          </a>
                        </div>
                      )}
                      {company.contact_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <a href={`mailto:${company.contact_email}`} className="text-xs text-primary-600 hover:underline truncate leading-tight">
                            {company.contact_email}
                          </a>
                        </div>
                      )}
                      {company.last_visit && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-500 leading-tight">
                            {new Date(company.last_visit).toLocaleDateString('en-US', {
                              dateStyle: 'long',
                            })} at {new Date(company.last_visit).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Select Form */}
      {selectedCompany && (
        <div className="mt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Service Type
          </h2>
          <div className="space-y-1">
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
                  className="w-full text-left p-2 rounded border border-gray-200 bg-white hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0 gap-1.5">
                      <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                          {form.name}
                        </p>
                        {form.category && (
                          <p className="text-xs text-gray-500 truncate leading-none mt-0.5">{form.category}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
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
