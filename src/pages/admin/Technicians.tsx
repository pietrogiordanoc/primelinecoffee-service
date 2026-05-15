import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useDemoData } from '@/utils/useDemoData';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/utils/validationSchemas';
import type { Technician } from '@/types';

export default function TechniciansPage() {
  const { technicians, setTechnicians, loading, setLoading, loadDemoData } = useTechnicianStore();
  const { isDemoMode } = useDemoData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);

  useEffect(() => {
    loadTechnicians();
  }, [isDemoMode]);

  async function loadTechnicians() {
    try {
      setLoading(true);
      
      if (isDemoMode) {
        // Demo mode: load from store
        loadDemoData();
      } else {
        // Production mode: load from Supabase
        const { data, error } = await supabase
          .from('technicians')
          .select(`
            *,
            user:users(*)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTechnicians(data || []);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(technician: Technician) {
    if (isDemoMode) {
      // Demo mode: toggle in store
      const updatedTechs = technicians.map(t => 
        t.id === technician.id ? { ...t, is_active: !t.is_active } : t
      );
      setTechnicians(updatedTechs);
      return;
    }
    
    // Production mode
    try {
      const { error } = await supabase
        .from('technicians')
        .update({ is_active: !technician.is_active })
        .eq('id', technician.id);

      if (error) throw error;
      await loadTechnicians();
    } catch (error) {
      console.error('Error toggling technician status:', error);
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
        // Update existing technician
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: data.full_name,
            phone: data.phone,
          })
          .eq('id', technician.user_id);

        if (updateError) throw updateError;
      } else {
        // Create new technician
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            full_name: data.full_name,
            role: 'technician',
          },
        });

        if (authError) throw authError;

        // Create technician record
        const { error: techError } = await supabase.from('technicians').insert({
          user_id: authData.user.id,
        });

        if (techError) throw techError;
      }

      reset();
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar técnico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={technician ? 'Editar Técnico' : 'Agregar Técnico'}
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
          label="Nombre Completo"
          error={errors.full_name?.message}
          required
        />

        {!technician && (
          <>
            <Input
              {...register('email')}
              type="email"
              label="Correo Electrónico"
              error={errors.email?.message}
              required
            />

            <Input
              {...register('password')}
              type="password"
              label="Contraseña"
              error={errors.password?.message}
              required
            />
          </>
        )}

        <Input
          {...register('phone')}
          label="Teléfono"
          error={errors.phone?.message}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {technician ? 'Actualizar' : 'Crear'} Técnico
          </Button>
        </div>
      </form>
    </Modal>
  );
}
