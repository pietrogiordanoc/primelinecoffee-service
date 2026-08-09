import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { User, Mail, Phone, Search, ArrowUpDown } from 'lucide-react';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: 'super_admin' | 'admin' | 'technician' | 'sales_representative';
  created_at: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  technician: 'Technician',
  sales_representative: 'Sales Rep',
};

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  technician: 'bg-green-100 text-green-700 border-green-200',
  sales_representative: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'name' | 'role'>('name');

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      setLoading(true);

      // Query all active users
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, is_active, created_at, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Query Error:', error);
        throw error;
      }

      setStaff(userData || []);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      alert('Error al cargar el directorio de staff.');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort staff
  const filteredStaff = staff
    .filter(member => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          member.full_name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          (member.phone && member.phone.includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'role') {
        // Sort by role first, then by name
        const roleOrder = ['super_admin', 'admin', 'technician', 'sales_representative'];
        const roleCompare = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
        if (roleCompare !== 0) {
          return sortOrder === 'asc' ? roleCompare : -roleCompare;
        }
        // If same role, sort by name
        return a.full_name.localeCompare(b.full_name);
      } else {
        // Sort by name
        if (sortOrder === 'asc') {
          return a.full_name.localeCompare(b.full_name);
        } else {
          return b.full_name.localeCompare(a.full_name);
        }
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Search Bar & Sort - FIXED below header */}
      <div className="fixed top-[52px] left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm px-3 py-2.5">
        <div className="max-w-full md:max-w-[80%] md:mx-auto space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white"
            />
          </div>

          {/* Sort Controls & Count */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
              <button
                onClick={() => setSortBy(sortBy === 'name' ? 'role' : 'name')}
                className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                  sortBy === 'role'
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                By Role
              </button>
            </div>
            <span className="text-xs font-medium text-gray-600">
              {filteredStaff.length} {filteredStaff.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>
      </div>

      {/* Content - Padding for fixed search */}
      <div className="pt-[110px] px-3">
        {filteredStaff.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No staff found' : 'No staff available'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
              >
                {/* Name & Role */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex-1">
                    {member.full_name}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${roleColors[member.role]}`}>
                    {roleLabels[member.role]}
                  </span>
                </div>

                {/* Contact Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <a 
                      href={`mailto:${member.email}`} 
                      className="text-xs text-primary-600 hover:underline truncate"
                    >
                      {member.email}
                    </a>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <a 
                        href={`tel:${member.phone}`} 
                        className="text-xs text-primary-600 hover:underline"
                      >
                        {member.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
