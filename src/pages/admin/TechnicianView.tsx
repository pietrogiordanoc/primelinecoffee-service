import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Eye, Calendar } from 'lucide-react';
import type { Company } from '@/types';

interface CompanyWithVisit extends Company {
  last_visit?: string;
}

export default function TechnicianViewPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyWithVisit[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Load all active companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (companiesError) throw companiesError;

      // Add last visit info for each company
      const companiesWithVisits = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { data: lastReport } = await supabase
            .from('service_reports')
            .select('submitted_at')
            .eq('company_id', company.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...company,
            last_visit: lastReport?.submitted_at,
          };
        })
      );

      setCompanies(companiesWithVisits);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      {/* Preview Notice */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <Eye className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-green-800">
              Technician View Preview
            </h3>
            <p className="text-sm text-green-700 mt-1">
              This is how technicians see their mobile interface. You are viewing as{' '}
              <span className="font-medium">{userProfile?.full_name}</span> (
              {userProfile?.role === 'super_admin' ? 'Super Admin' : 'Manager'}).
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hi, {userProfile?.full_name?.split(' ')[0] || 'Admin'}! Select company
        </h1>
        <p className="text-gray-600 mt-1">
          Choose a company to create a service report
        </p>
      </div>

      {/* Companies Table */}
      {companies.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <p className="text-gray-500">No companies available</p>
            <p className="text-sm text-gray-400 mt-2">
              Add companies in the admin panel first
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City / State
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className="hover:bg-primary-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {company.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {company.address || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {company.city && company.state
                          ? `${company.city}, ${company.state}`
                          : company.city || company.state || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {company.contact_name || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {company.contact_phone || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {company.contact_email || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                        {formatDate(company.last_visit)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Technician Interface Features
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <span>
                <strong>Company List:</strong> Technicians see all active companies with full details
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <span>
                <strong>Last Visit Tracking:</strong> Shows when each company was last serviced
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <span>
                <strong>Click to Select:</strong> Clicking a company would normally take them to form selection
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <span>
                <strong>Service History:</strong> Technicians can view their own service report history
              </span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
