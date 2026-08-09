import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { User, Mail, Phone, CheckCircle, XCircle, Search, ArrowUpDown } from 'lucide-react';

interface Technician {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Staff() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    try {
      setLoading(true);

      // Direct query to users table - simple approach
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, is_active, created_at, role')
        .eq('role', 'technician')
        .order('full_name');

      if (error) {
        console.error('Query Error:', error);
        throw error;
      }

      // Map to technician format
      const techniciansFormatted = (userData || []).map((user: any) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at,
      }));

      setTechnicians(techniciansFormatted);
    } catch (error: any) {
      console.error('Error loading technicians:', error);
      alert('Error al cargar el directorio de staff.');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort technicians
  const filteredTechnicians = technicians
    .filter(tech =>
      tech.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.full_name.localeCompare(b.full_name);
      } else {
        return b.full_name.localeCompare(a.full_name);
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
      {/* Search Bar - FIXED below header */}
      <div className="fixed top-[52px] left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm px-3 py-2">
        <div className="max-w-full md:max-w-[80%] md:mx-auto space-y-1.5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-bold text-gray-900">Staff Directory</h1>
          </div>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
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
            <span className="text-xs text-gray-500">
              {filteredTechnicians.length} technicians
            </span>
          </div>
        </div>
      </div>

      {/* Content - Padding for fixed search */}
      <div className="pt-[120px]">
        {filteredTechnicians.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No staff found' : 'No technicians available'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-1">
            {filteredTechnicians.map((tech) => (
              <div
                key={tech.id}
                className="bg-white rounded border border-gray-200 p-2"
              >
                {/* Technician Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                          {tech.full_name}
                        </p>
                        {tech.is_active ? (
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-none mt-0.5">
                        {tech.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="mt-1.5 space-y-1 pl-10">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${tech.email}`} className="text-xs text-primary-600 hover:underline truncate leading-tight">
                      {tech.email}
                    </a>
                  </div>
                  {tech.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <a href={`tel:${tech.phone}`} className="text-xs text-primary-600 hover:underline leading-tight">
                        {tech.phone}
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
