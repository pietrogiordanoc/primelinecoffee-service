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
import { FileText, ChevronRight, Plus, ChevronDown, Search, MapPin, Phone, Mail, User, Calendar, ArrowUpDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
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
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
    navigate(`report/${formId}?company=${selectedCompany.id}`);
  }

  // Filter and sort companies
  const filteredCompanies = companies
    .filter(company =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Search Bar - FIXED below header */}
      <div className="fixed top-[52px] left-0 right-0 lg:left-64 z-20 bg-white border-b border-gray-200 shadow-sm px-3 py-2">
        <div className="max-w-full md:max-w-[80%] md:mx-auto space-y-1.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs bg-white"
            />
          </div>
          {/* Filters Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-gray-500">
              {filteredCompanies.length} total
            </span>
          </div>
        </div>
      </div>

      {/* Content - Padding for fixed search */}
      <div className="pt-[100px]">{/* Increased padding for larger search area */}
        {/* Select Company */}
        <div className="mt-1">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Customers</h2>
          {/* Only show New button for admins in technician mode */}
          {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
            <Button
              onClick={() => setIsAddCompanyModalOpen(true)}
              variant="secondary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          )}
        </div>
        {filteredCompanies.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">
                {searchQuery ? 'No customers found' : 'No customers available'}
              </p>
              {!searchQuery && (userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
                <Button onClick={() => setIsAddCompanyModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Customer
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-1">
              {paginatedCompanies.map((company: any) => {
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
                      setIsServiceTypeModalOpen(true);
                      setExpandedCompany(null); // Close expanded view
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
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono font-semibold text-indigo-600">
                            {company.customer_code}
                          </span>
                          {(company.city || company.last_visit) && (
                            <>
                              <span className="text-xs text-gray-300">•</span>
                              <span className="text-xs text-gray-400 truncate">
                                {company.city || (company.last_visit && new Date(company.last_visit).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }))}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Info button to expand details */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCompany(isExpanded ? null : company.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    </div>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
                Prev
              </button>
              <span className="text-xs text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          </>
        )}
      </div>
      </div> {/* End pt-[100px] wrapper */}

      {/* Service Type Modal - Bottom Sheet */}
      {isServiceTypeModalOpen && selectedCompany && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsServiceTypeModalOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center py-3 border-b border-gray-200">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* Selected Company Info */}
            <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Service for:</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedCompany.name}</p>
              {selectedCompany.address && (
                <div className="flex items-start gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{selectedCompany.address}, {selectedCompany.city}</p>
                </div>
              )}
            </div>

            {/* Service Types List */}
            <div className="p-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Select Service Type
              </h3>
              {forms.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No service types available
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {forms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => {
                        handleStartReport(form.id);
                        setIsServiceTypeModalOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg border-2 border-gray-200 bg-white hover:border-primary-500 hover:bg-primary-50 transition-all active:scale-98"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0 gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {form.name}
                            </p>
                            {form.category && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{form.category}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Cancel Button */}
              <button
                onClick={() => setIsServiceTypeModalOpen(false)}
                className="w-full mt-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
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
