import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Plus, Edit2, Trash2, UserCheck, UserX, Building2, ArrowUpDown, ArrowUp, ArrowDown, CheckCheck, ChevronDown, ChevronRight, Phone as PhoneIcon, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Technician, Company } from '@/types';

// Schema for edit mode (password optional)
const editTechnicianSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'technician', 'sales_representative']),
});

// Schema for create mode (password required)
const createTechnicianSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'technician', 'sales_representative']),
});

type TechnicianFormInput = z.infer<typeof editTechnicianSchema> | z.infer<typeof createTechnicianSchema>;

export default function TechniciansPage() {
  const { technicians, setTechnicians, loading, setLoading } = useTechnicianStore();
  const { confirm, alert } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTechnicianForAssign, setSelectedTechnicianForAssign] = useState<Technician | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'technician' | 'sales_representative'>('all');
  const [sortField, setSortField] = useState<'name' | 'email' | 'role' | 'phone' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [assignmentStatus, setAssignmentStatus] = useState<Record<string, boolean>>({});
  const [expandedTechnician, setExpandedTechnician] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    loadTechnicians();
  }, []);

  useEffect(() => {
    // Check assignment status for all technicians
    checkAllAssignmentStatuses();
  }, [technicians]);

  async function checkAllAssignmentStatuses() {
    const statuses: Record<string, boolean> = {};
    
    // Get total number of active companies
    const { data: companies } = await supabase
      .from('companies')
      .select('id', { count: 'exact' })
      .eq('is_active', true);
    
    const totalCompanies = companies?.length || 0;
    if (totalCompanies === 0) return;

    // Check each technician
    for (const tech of technicians) {
      if (tech.user?.role === 'technician') {
        const { data: assignments } = await supabase
          .from('technician_companies')
          .select('company_id', { count: 'exact' })
          .eq('technician_id', tech.id);
        
        statuses[tech.id] = (assignments?.length || 0) === totalCompanies;
      }
    }
    
    setAssignmentStatus(statuses);
  }

  function handleSort(field: 'name' | 'email' | 'role' | 'phone' | 'status') {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getSortedTechnicians() {
    console.log('🔍 Filter:', roleFilter);
    console.log('🔍 Total technicians before filter:', technicians.length);
    
    const filtered = technicians.filter(t => {
      if (roleFilter === 'all') return true;
      const matches = t.user?.role === roleFilter;
      if (!matches) {
        console.log(`🔍 Filtered out: ${t.user?.full_name} (role: ${t.user?.role})`);
      }
      return matches;
    });
    
    console.log('🔍 Filtered technicians:', filtered.length);
    console.log('🔍 Filtered users:', filtered.map(t => ({ name: t.user?.full_name, role: t.user?.role })));
    
    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.user?.full_name?.toLowerCase() || '';
          bValue = b.user?.full_name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.user?.email?.toLowerCase() || '';
          bValue = b.user?.email?.toLowerCase() || '';
          break;
        case 'role':
          aValue = a.user?.role || '';
          bValue = b.user?.role || '';
          break;
        case 'phone':
          aValue = a.user?.phone || '';
          bValue = b.user?.phone || '';
          break;
        case 'status':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const sortedTechnicians = getSortedTechnicians();
  const totalPages = Math.ceil(sortedTechnicians.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTechnicians = sortedTechnicians.slice(startIndex, endIndex);

  // Reset to page 1 when filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, sortField, sortDirection]);

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1 text-primary-600" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 text-primary-600" />
    );
  }

  async function loadTechnicians() {
    try {
      setLoading(true);
      
      // Use RPC function to load all staff (bypasses RLS)
      const { data: staffData, error: staffError } = await supabase
        .rpc('get_all_staff');

      if (staffError) {
        console.error('Error loading staff:', staffError);
        await alert(`Failed to load staff: ${staffError.message}`, 'Error');
        return;
      }

      console.log('📊 Raw staff data from RPC:', staffData);
      console.log('📊 Total records:', staffData?.length);
      
      // Log role distribution
      const roleCount = (staffData || []).reduce((acc: any, staff: any) => {
        acc[staff.role] = (acc[staff.role] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Role distribution:', roleCount);

      // Map the data to the expected format
      const techniciansWithData = (staffData || []).map((staff: any) => ({
        id: staff.id,
        user_id: staff.user_id,
        is_active: staff.is_active,
        user: {
          id: staff.user_id,
          email: staff.email,
          full_name: staff.full_name,
          phone: staff.phone,
          role: staff.role,
          is_active: staff.is_active,
          created_at: staff.created_at,
        },
      }));

      console.log('📊 Mapped technicians:', techniciansWithData);
      setTechnicians(techniciansWithData);
    } catch (error) {
      console.error('Error loading staff:', error);
      await alert('An error occurred while loading staff. Please try again.', 'Error');
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
    const confirmed = await confirm({
      title: 'Delete Staff',
      message: `Are you sure you want to delete ${technician.user?.full_name}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) {
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
      await alert('Error deleting staff. Please try again.', 'Error');
    }
  }

  async function handleToggleAllCompanies(technician: Technician) {
    try {
      const isCurrentlyAssignedAll = assignmentStatus[technician.id];

      if (isCurrentlyAssignedAll) {
        // Remove all assignments
        await supabase
          .from('technician_companies')
          .delete()
          .eq('technician_id', technician.id);
      } else {
        // Load all active companies
        const { data: companies } = await supabase
          .from('companies')
          .select('id')
          .eq('is_active', true);

        if (!companies || companies.length === 0) return;

        // Check existing assignments
        const { data: existingAssignments } = await supabase
          .from('technician_companies')
          .select('company_id')
          .eq('technician_id', technician.id);

        const existingCompanyIds = new Set(existingAssignments?.map(a => a.company_id) || []);
        const companiesToAssign = companies.filter(c => !existingCompanyIds.has(c.id));

        if (companiesToAssign.length > 0) {
          // Insert all assignments in bulk
          await supabase
            .from('technician_companies')
            .insert(
              companiesToAssign.map(company => ({
                technician_id: technician.id,
                company_id: company.id,
              }))
            );
        }
      }

      // Update status
      await checkAllAssignmentStatuses();
    } catch (error: any) {
      console.error('Error toggling company assignments:', error);
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">STAFF</h1>
        <Button onClick={() => setIsModalOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Role Filters & Pagination */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-2 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
            roleFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setRoleFilter('super_admin')}
          className={`px-2 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
            roleFilter === 'super_admin'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Super
        </button>
        <button
          onClick={() => setRoleFilter('admin')}
          className={`px-2 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
            roleFilter === 'admin'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Admins
        </button>
        <button
          onClick={() => setRoleFilter('technician')}
          className={`px-2 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
            roleFilter === 'technician'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Techs
        </button>
        <button
          onClick={() => setRoleFilter('sales_representative')}
          className={`px-2 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
            roleFilter === 'sales_representative'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sales
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
          <span className="text-xs text-gray-500">
            {sortedTechnicians.length} total
          </span>
        </div>
      </div>

      {/* Staff Table */}
      {sortedTechnicians.length === 0 ? (
        <Card>
          <div className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base text-gray-500">No staff members found</p>
            <Button onClick={() => setIsModalOpen(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      Email
                      <SortIcon field="email" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center">
                      Role
                      <SortIcon field="role" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center">
                      Phone
                      <SortIcon field="phone" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTechnicians.map((technician) => (
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
                      <p className="text-sm text-gray-600">{technician.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        technician.user?.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                        technician.user?.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        technician.user?.role === 'sales_representative' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {technician.user?.role === 'super_admin' ? 'Super Admin' :
                         technician.user?.role === 'admin' ? 'Admin' :
                         technician.user?.role === 'sales_representative' ? 'Sales Rep' :
                         'Technician'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">{technician.user?.phone || '-'}</p>
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
                        {technician.user?.role === 'technician' && (
                          <>
                            <button
                              onClick={() => handleToggleAllCompanies(technician)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
                                assignmentStatus[technician.id]
                                  ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                              }`}
                              title={assignmentStatus[technician.id] ? 'Unassign All Companies' : 'Assign All Companies'}
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              {assignmentStatus[technician.id] ? 'All Assigned' : 'Assign All'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTechnicianForAssign(technician);
                                setIsAssignModalOpen(true);
                              }}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Manage Company Assignments"
                            >
                              <Building2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {paginatedTechnicians.map((technician) => {
              const isExpanded = expandedTechnician === technician.id;
              return (
                <div key={technician.id} className="bg-white">
                  {/* Staff Header */}
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedTechnician(isExpanded ? null : technician.id)}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {technician.user?.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                          {technician.user?.full_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate leading-none mt-0.5">
                          {technician.user?.role === 'super_admin' ? 'Super' :
                           technician.user?.role === 'admin' ? 'Admin' :
                           technician.user?.role === 'sales_representative' ? 'Sales' :
                           'Tech'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          technician.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {technician.is_active ? 'On' : 'Off'}
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
                      {/* Email & Phone */}
                      <div className="flex items-center gap-1 pt-1.5">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${technician.user?.email}`} className="text-xs text-primary-600 hover:underline truncate">
                          {technician.user?.email}
                        </a>
                      </div>
                      {technician.user?.phone && (
                        <div className="flex items-center gap-1">
                          <PhoneIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <a href={`tel:${technician.user.phone}`} className="text-xs text-primary-600 hover:underline">
                            {technician.user.phone}
                          </a>
                        </div>
                      )}

                      {/* Company Assignment for Technicians */}
                      {technician.user?.role === 'technician' && (
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAllCompanies(technician);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition ${
                              assignmentStatus[technician.id]
                                ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <CheckCheck className="w-3 h-3" />
                            {assignmentStatus[technician.id] ? 'All' : 'Assign'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTechnicianForAssign(technician);
                              setIsAssignModalOpen(true);
                            }}
                            className="px-2 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded transition"
                          >
                            <Building2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(technician);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition"
                        >
                          {technician.is_active ? (
                            <>
                              <UserX className="w-3 h-3" />
                              Off
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              On
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTechnician(technician);
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
                            handleDelete(technician);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          Del
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
        onSuccess={() => {
          loadTechnicians();
          checkAllAssignmentStatuses();
        }}
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
    setValue,
  } = useForm<TechnicianFormInput>({
    resolver: zodResolver(technician ? editTechnicianSchema : createTechnicianSchema),
  });

  // Load technician data when modal opens in edit mode
  useEffect(() => {
    if (isOpen) {
      if (technician?.user) {
        console.log('Loading technician data:', technician.user);
        // Set values one by one for edit mode
        setValue('full_name', technician.user.full_name || '');
        setValue('email', technician.user.email || '');
        setValue('phone', technician.user.phone || '');
        setValue('role', technician.user.role || 'technician');
      } else {
        // Reset form for create mode
        reset({
          full_name: '',
          email: '',
          password: '',
          phone: '',
          role: 'technician',
        });
      }
    }
  }, [isOpen, technician, setValue, reset]);

  const onSubmit = async (data: TechnicianFormInput) => {
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
            email: data.email,
            phone: data.phone || null,
            role: data.role,
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
            role: data.role,
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
      title={technician ? 'Edit Staff Member' : 'Add Staff Member'}
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

        <Input
          {...register('email')}
          type="email"
          label="Email"
          error={errors.email?.message}
          required
        />

        {!technician && (
          <Input
            {...register('password')}
            type="password"
            label="Password"
            error={errors.password?.message}
            required
          />
        )}

        <Input
          {...register('phone')}
          label="Phone"
          error={errors.phone?.message}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            {...register('role')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
            <option value="sales_representative">Sales Rep</option>
            <option value="super_admin">Super Admin</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {technician ? 'Update' : 'Create'}
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

  async function handleAssignAll() {
    try {
      setError(null);
      
      // Get all company IDs that are not yet assigned
      const unassignedCompanyIds = allCompanies
        .filter(c => !assignedCompanyIds.has(c.id))
        .map(c => c.id);

      if (unassignedCompanyIds.length === 0) return;

      // Insert all assignments in bulk
      const { error } = await supabase
        .from('technician_companies')
        .insert(
          unassignedCompanyIds.map(companyId => ({
            technician_id: technician!.id,
            company_id: companyId,
          }))
        );

      if (error) throw error;

      // Update state
      setAssignedCompanyIds(new Set(allCompanies.map(c => c.id)));
    } catch (err: any) {
      console.error('Error assigning all companies:', err);
      setError(err.message);
    }
  }

  async function handleUnassignAll() {
    try {
      setError(null);
      
      // Delete all assignments for this technician
      const { error } = await supabase
        .from('technician_companies')
        .delete()
        .eq('technician_id', technician!.id);

      if (error) throw error;

      // Update state
      setAssignedCompanyIds(new Set());
    } catch (err: any) {
      console.error('Error unassigning all companies:', err);
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

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Select which companies this technician can access.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleAssignAll}
              variant="secondary"
              size="sm"
              disabled={assignedCompanyIds.size === allCompanies.length || loading}
            >
              Assign All
            </Button>
            <Button
              onClick={handleUnassignAll}
              variant="secondary"
              size="sm"
              disabled={assignedCompanyIds.size === 0 || loading}
            >
              Clear All
            </Button>
          </div>
        </div>

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
