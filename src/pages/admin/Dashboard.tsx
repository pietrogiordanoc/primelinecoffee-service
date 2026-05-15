import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Building2, FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { DashboardStats } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useDemoData } from '@/utils/useDemoData';
import { useReportStore } from '@/stores/reportStore';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useAuthStore } from '@/stores/authStore';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  
  const { isDemoMode } = useDemoData();
  const { reports, reportSummaries } = useReportStore();
  const { technicians } = useTechnicianStore();
  const { companies } = useCompanyStore();

  useEffect(() => {
    loadDashboardData();
  }, [isDemoMode, reports, technicians, companies]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      if (isDemoMode) {
        // Usar datos demo
        const totalReports = reports.length;
        const completedReports = reports.filter(r => r.status === 'completed').length;
        const pendingReports = reports.filter(r => ['draft', 'submitted'].includes(r.status)).length;
        
        setStats({
          total_reports: totalReports,
          pending_reports: pendingReports,
          completed_reports: completedReports,
          total_technicians: technicians.filter(t => t.is_active).length,
          total_companies: companies.filter(c => c.is_active).length,
          monthly_trend: 15.5,
        });
        
        setRecentReports(reportSummaries.slice(0, 5));
        setLoading(false);
        return;
      }

      // Load stats from Supabase
      const [
        { count: totalReports },
        { count: totalTechnicians },
        { count: totalCompanies },
        { count: completedReports },
        { count: pendingReports },
      ] = await Promise.all([
        supabase.from('service_reports').select('*', { count: 'exact', head: true }),
        supabase.from('technicians').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('service_reports').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('service_reports').select('*', { count: 'exact', head: true }).in('status', ['draft', 'submitted']),
      ]);

      setStats({
        total_reports: totalReports || 0,
        pending_reports: pendingReports || 0,
        completed_reports: completedReports || 0,
        total_technicians: totalTechnicians || 0,
        total_companies: totalCompanies || 0,
        reports_this_month: 0,
        reports_this_week: 0,
      });

      // Load recent reports
      const { data: reports } = await supabase
        .from('report_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentReports(reports || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Reportes',
      value: stats?.total_reports || 0,
      icon: FileText,
      color: 'blue',
    },
    {
      name: 'Reportes Pendientes',
      value: stats?.pending_reports || 0,
      icon: Clock,
      color: 'yellow',
    },
    {
      name: 'Reportes Completados',
      value: stats?.completed_reports || 0,
      icon: CheckCircle,
      color: 'green',
    },
    {
      name: 'Técnicos Activos',
      value: stats?.total_technicians || 0,
      icon: Users,
      color: 'purple',
    },
    {
      name: 'Empresas Activas',
      value: stats?.total_companies || 0,
      icon: Building2,
      color: 'indigo',
    },
    {
      name: 'Tendencia',
      value: '+12%',
      icon: TrendingUp,
      color: 'green',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen de actividades del sistema</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorMap[stat.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Reportes Recientes
          </h2>
          {recentReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay reportes recientes
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Técnico
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Formulario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.company_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.technician_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.form_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            report.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : report.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
