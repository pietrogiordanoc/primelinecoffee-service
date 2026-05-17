import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompanyStore } from '@/stores/companyStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Plus, Edit2, Building2, ArrowUpDown, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companySchema, type CompanyInput } from '@/utils/validationSchemas';
import type { Company } from '@/types';

type SortField = 'name' | 'contact_name' | 'city' | 'contact_email' | 'contact_phone';
type SortDirection = 'asc' | 'desc';

export default function CompaniesPage() {
  const { companies, setCompanies, loading, setLoading } = useCompanyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
    if (!confirm(`Are you sure you want to delete ${company.name}? This action cannot be undone.`)) {
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
      alert('Failed to delete company. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">Manage client companies</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Companies Table */}
      {sortedCompanies.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2">
                    <button
                      onClick={() => handleSort('city')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      City
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2">
                    <button
                      onClick={() => handleSort('contact_name')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Contact
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2">
                    <button
                      onClick={() => handleSort('contact_email')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Email
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2">
                    <button
                      onClick={() => handleSort('contact_phone')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Phone
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
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
                    <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-[200px]">
                      {company.contact_email || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {company.contact_phone || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          company.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
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
        </Card>
      ) : (
        <Card>
          <div className="p-12 text-center">
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
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: company || {},
  });

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
