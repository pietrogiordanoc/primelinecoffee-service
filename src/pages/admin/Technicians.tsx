import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTechnicianStore } from '@/stores/technicianStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Plus, Edit2, Trash2, UserCheck, UserX, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/utils/validationSchemas';
import type { Technician, Company } from '@/types';

export default function TechniciansPage() {
  const { technicians, setTechnicians, loading, setLoading } = useTechnicianStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTechnicianForAssign, setSelectedTechnicianForAssign] = useState<Technician | null>(null);

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('technicians')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(technician: Technician) {
    // Production mode: use Netlify function
    try {
      const response = await fetch('/.netlify/functions/toggle-technician-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: technician.id,
          is_active: !technician.is_active,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error toggling technician');

      await loadTechnicians();
    } catch (error) {
      console.error('Error toggling technician status:', error);
    }
  }

  async function handleDelete(technician: Technician) {
    if (!confirm(`Are you sure you want to delete ${technician.user?.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/delete-technician', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: technician.user_id,
          technician_id: technician.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error deleting technician');

      await loadTechnicians();
    } catch (error) {
      console.error('Error deleting technician:', error);
      alert('Failed to delete technician. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
          <p className="text-gray-600 mt-1">Manage system technicians</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Technician
        </Button>
      </div>

      {/* Technicians Table */}
      {technicians.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <p className="text-gray-500">No technicians registered</p>
            <Button onClick={() => setIsModalOpen(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add First Technician
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {technicians.map((technician) => (
                  <tr key={technician.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">
                            {technician.user?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {technician.user?.full_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{technician.employee_id}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">{technician.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">{technician.specialization}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          technician.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {technician.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedTechnicianForAssign(technician);
                            setIsAssignModalOpen(true);
                          }}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Assign Companies"
                        >
                          <Building2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(technician)}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                          title={technician.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {technician.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingTechnician(technician);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(technician)}
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
      )}

      {/* Add/Edit Modal */}
      <TechnicianModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTechnician(null);
        }}
        technician={editingTechnician}
        onSuccess={loadTechnicians}
      />

      {/* Assign Companies Modal */}
      <AssignCompaniesModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedTechnicianForAssign(null);
        }}
        technician={selectedTechnicianForAssign}
        onSuccess={loadTechnicians}
      />
    </div>
  );
}

interface TechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
  onSuccess: () => void;
}

function TechnicianModal({ isOpen, onClose, technician, onSuccess }: TechnicianModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'technician',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setLoading(true);
      setError(null);

      if (technician) {
        // Update existing technician via Netlify function
        const response = await fetch('/.netlify/functions/update-technician', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: technician.user_id,
            full_name: data.full_name,
            phone: data.phone || null,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error updating technician');
      } else {
        // Create new technician via Netlify function (requires service role key server-side)
        const response = await fetch('/.netlify/functions/create-technician', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: data.full_name,
            email: data.email,
            password: data.password,
            phone: data.phone || null,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error creating technician');
      }

      reset();
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error saving technician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={technician ? 'Edit Technician' : 'Add Technician'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          {...register('full_name')}
          label="Full Name"
          error={errors.full_name?.message}
          required
        />

        {!technician && (
          <>
            <Input
              {...register('email')}
              type="email"
              label="Email"
              error={errors.email?.message}
              required
            />

            <Input
              {...register('password')}
              type="password"
              label="Password"
              error={errors.password?.message}
              required
            />
          </>
        )}

        <Input
          {...register('phone')}
          label="Phone"
          error={errors.phone?.message}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {technician ? 'Update' : 'Create'} Technician
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface AssignCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
  onSuccess: () => void;
}

function AssignCompaniesModal({ isOpen, onClose, technician, onSuccess }: AssignCompaniesModalProps) {
  const [loading, setLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [assignedCompanyIds, setAssignedCompanyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && technician) {
      loadCompanies();
    }
  }, [isOpen, technician]);

  async function loadCompanies() {
    try {
      setLoading(true);

      // Load all companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (companiesError) throw companiesError;
      setAllCompanies(companies || []);

      // Load assigned companies for this technician
      const { data: assigned, error: assignedError } = await supabase
        .from('technician_companies')
        .select('company_id')
        .eq('technician_id', technician!.id);

      if (assignedError) throw assignedError;

      const assignedIds = new Set(assigned?.map(a => a.company_id) || []);
      setAssignedCompanyIds(assignedIds);
    } catch (err: any) {
      console.error('Error loading companies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCompany(companyId: string) {
    try {
      setError(null);
      const isAssigned = assignedCompanyIds.has(companyId);

      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('technician_companies')
          .delete()
          .eq('technician_id', technician!.id)
          .eq('company_id', companyId);

        if (error) throw error;

        setAssignedCompanyIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          return newSet;
        });
      } else {
        // Add assignment
        const { error } = await supabase
          .from('technician_companies')
          .insert({
            technician_id: technician!.id,
            company_id: companyId,
          });

        if (error) throw error;

        setAssignedCompanyIds(prev => new Set(prev).add(companyId));
      }
    } catch (err: any) {
      console.error('Error toggling company:', err);
      setError(err.message);
    }
  }

  function handleClose() {
    onSuccess();
    onClose();
  }

  if (!technician) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Assign Companies - ${technician.user?.full_name}`}
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Select which companies this technician can access. The technician will only see these companies in their mobile app.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : allCompanies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No companies available</p>
            <p className="text-sm text-gray-400 mt-2">Create companies first to assign them to technicians</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allCompanies.map((company) => {
              const isAssigned = assignedCompanyIds.has(company.id);
              return (
                <label
                  key={company.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                    isAssigned
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={() => handleToggleCompany(company.id)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    {(company.city || company.address) && (
                      <p className="text-xs text-gray-500">
                        {[company.address, company.city].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                  {isAssigned && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                      Assigned
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            <strong>{assignedCompanyIds.size}</strong> of <strong>{allCompanies.length}</strong> companies assigned
          </p>
          <Button onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
