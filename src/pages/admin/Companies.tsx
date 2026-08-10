import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompanyStore } from '@/stores/companyStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Plus, Edit2, Building2, ArrowUpDown, Trash2, ChevronDown, ChevronRight, MapPin, Phone, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companySchema, type CompanyInput } from '@/utils/validationSchemas';
import type { Company } from '@/types';

type SortField = 'name' | 'contact_name' | 'city' | 'contact_email' | 'contact_phone';
type SortDirection = 'asc' | 'desc';

export default function CompaniesPage() {
  const { companies, setCompanies, loading, setLoading } = useCompanyStore();
  const { confirm, alert } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return aVal.toString().localeCompare(bVal.toString()) * modifier;
  });

  // Pagination
  const totalPages = Math.ceil(sortedCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompanies = sortedCompanies.slice(startIndex, endIndex);

  // Reset to page 1 when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortDirection]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(company: Company) {
    const confirmed = await confirm({
      title: 'Delete Company',
      message: `Are you sure you want to delete ${company.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error deleting company');

      await loadCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      await alert('Error deleting company. Please try again.', 'Error');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Companies</h1>
        <Button onClick={() => setIsModalOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Sort Controls & Pagination */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          onClick={() => handleSort('name')}
          className={`flex items-center gap-0.5 px-2 py-1 border rounded transition ${
            sortField === 'name'
              ? 'bg-primary-50 border-primary-500 text-primary-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Name
          {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <button
          onClick={() => handleSort('city')}
          className={`flex items-center gap-0.5 px-2 py-1 border rounded transition ${
            sortField === 'city'
              ? 'bg-primary-50 border-primary-500 text-primary-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          City
          {sortField === 'city' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <button
          onClick={() => handleSort('contact_name')}
          className={`flex items-center gap-0.5 px-2 py-1 border rounded transition ${
            sortField === 'contact_name'
              ? 'bg-primary-50 border-primary-500 text-primary-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Contact
          {sortField === 'contact_name' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-gray-500">
            {sortedCompanies.length} total
          </span>
        </div>
      </div>

      {/* Companies Table - Desktop */}
      {sortedCompanies.length > 0 ? (
        <Card>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 w-[20%]">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 w-[12%]">
                    <button
                      onClick={() => handleSort('city')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      City
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 w-[15%]">
                    <button
                      onClick={() => handleSort('contact_name')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Contact
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 w-[20%]">
                    <button
                      onClick={() => handleSort('contact_email')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Email
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 w-[13%]">
                    <button
                      onClick={() => handleSort('contact_phone')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Phone
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 w-[10%] text-xs font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-right px-3 py-2 w-[10%] text-xs font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {company.city || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {company.contact_name || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      <div className="truncate" title={company.contact_email}>
                        {company.contact_email || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {company.contact_phone || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          company.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCompany(company);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {paginatedCompanies.map((company) => {
              const isExpanded = expandedCompany === company.id;
              return (
                <div key={company.id} className="bg-white">
                  {/* Company Header */}
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                          {company.name}
                        </p>
                        {company.city && (
                          <p className="text-xs text-gray-400 truncate leading-none mt-0.5">{company.city}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          company.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1.5 border-t border-gray-100 bg-gray-50">
                      {/* Contact Info */}
                      {company.contact_name && (
                        <div className="flex items-center gap-1 pt-1.5">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-900 truncate">{company.contact_name}</p>
                        </div>
                      )}
                      {company.contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <a href={`tel:${company.contact_phone}`} className="text-xs text-primary-600 hover:underline">
                            {company.contact_phone}
                          </a>
                        </div>
                      )}
                      {company.contact_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <a href={`mailto:${company.contact_email}`} className="text-xs text-primary-600 hover:underline truncate">
                            {company.contact_email}
                          </a>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-600">
                            {company.address}, {company.city}{company.state && `, ${company.state}`} {company.postal_code}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCompany(company);
                            setIsModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(company);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between px-2 md:px-0">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
              </button>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="p-8 md:p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No companies registered</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Company
            </Button>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCompany(null);
        }}
        company={editingCompany}
        onSuccess={loadCompanies}
      />
    </div>
  );
}

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: () => void;
}

function CompanyModal({ isOpen, onClose, company, onSuccess }: CompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: company || {},
  });

  // Load company data when editing
  useEffect(() => {
    if (company && isOpen) {
      setValue('name', company.name || '');
      setValue('address', company.address || '');
      setValue('city', company.city || '');
      setValue('state', company.state || '');
      setValue('postal_code', company.postal_code || '');
      setValue('contact_name', company.contact_name || '');
      setValue('contact_email', company.contact_email || '');
      setValue('contact_phone', company.contact_phone || '');
      setValue('notes', company.notes || '');
    } else if (!company && isOpen) {
      reset();
    }
  }, [company, isOpen, setValue, reset]);

  const onSubmit = async (data: CompanyInput) => {
    try {
      setLoading(true);
      setError(null);

      const payload = company ? { ...data, id: company.id } : data;

      const response = await fetch('/.netlify/functions/upsert-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error saving company');
      }

      reset();
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error saving company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? 'Edit Company' : 'Add Company'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              {...register('name')}
              label="Company Name"
              error={errors.name?.message}
              required
            />
          </div>

          <Input
            {...register('address')}
            label="Address"
            error={errors.address?.message}
          />

          <Input
            {...register('city')}
            label="City"
            error={errors.city?.message}
          />

          <Input
            {...register('state')}
            label="State/Province"
            error={errors.state?.message}
          />

          <Input
            {...register('postal_code')}
            label="Postal Code"
            error={errors.postal_code?.message}
          />

          <Input
            {...register('contact_name')}
            label="Contact Name"
            error={errors.contact_name?.message}
          />

          <Input
            {...register('contact_email')}
            type="email"
            label="Contact Email"
            error={errors.contact_email?.message}
          />

          <Input
            {...register('contact_phone')}
            label="Contact Phone"
            error={errors.contact_phone?.message}
          />

          <div className="md:col-span-2">
            <Textarea
              {...register('notes')}
              label="Notes"
              error={errors.notes?.message}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {company ? 'Update' : 'Create'} Company
          </Button>
        </div>
      </form>
    </Modal>
  );
}
