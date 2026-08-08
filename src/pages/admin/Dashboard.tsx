import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Building2, FileText, CheckCircle, Clock, TrendingUp, HardDrive, Image, Video, AlertTriangle, ExternalLink } from 'lucide-react';
import type { DashboardStats } from '@/types';
import { useReportStore } from '@/stores/reportStore';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface StorageMetrics {
  total_size_bytes: number;
  photo_count: number;
  video_count: number;
  report_count: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings, fetchSettings } = useSettingsStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);

  useEffect(() => {
    fetchSettings();
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
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
      const { data: recentReportsData } = await supabase
        .from('report_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentReports(recentReportsData || []);

      // Load storage metrics
      await loadStorageMetrics();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStorageMetrics() {
    try {
      // Calculate current metrics
      await supabase.rpc('calculate_storage_metrics');

      // Get latest metrics
      const { data } = await supabase
        .from('storage_metrics')
        .select('*')
        .order('measured_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setStorageMetrics(data);
      }
    } catch (error) {
      console.error('Error loading storage metrics:', error);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getStoragePercentage(): number {
    if (!storageMetrics || !settings) return 0;
    const limitBytes = (settings.storage_limit_gb || 50) * 1024 * 1024 * 1024;
    return (storageMetrics.total_size_bytes / limitBytes) * 100;
  }

  function getStorageLevel(): 'safe' | 'warning' | 'critical' {
    const percentage = getStoragePercentage();
    const warningPercent = settings?.storage_warning_percent || 70;
    const criticalPercent = settings?.storage_critical_percent || 85;
    
    if (percentage >= criticalPercent) return 'critical';
    if (percentage >= warningPercent) return 'warning';
    return 'safe';
  }

  function getStorageLevelColor(): string {
    const level = getStorageLevel();
    if (level === 'critical') return 'bg-red-500';
    if (level === 'warning') return 'bg-amber-500';
    return 'bg-green-500';
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
      name: 'Total Reports',
      value: stats?.total_reports || 0,
      icon: FileText,
      color: 'blue',
    },
    {
      name: 'Pending Reports',
      value: stats?.pending_reports || 0,
      icon: Clock,
      color: 'yellow',
    },
    {
      name: 'Completed Reports',
      value: stats?.completed_reports || 0,
      icon: CheckCircle,
      color: 'green',
    },
    {
      name: 'Active Technicians',
      value: stats?.total_technicians || 0,
      icon: Users,
      color: 'purple',
    },
    {
      name: 'Active Companies',
      value: stats?.total_companies || 0,
      icon: Building2,
      color: 'indigo',
    },
    {
      name: 'Trend',
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
        <p className="text-gray-600 mt-1">System activity summary</p>
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

      {/* Storage Monitor - Compact */}
      {storageMetrics && settings && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Storage Usage</h2>
                {getStorageLevel() === 'critical' && (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                {getStorageLevel() === 'warning' && (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <button
                onClick={() => navigate('/admin/storage')}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Details
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {/* Thermometer Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {formatBytes(storageMetrics.total_size_bytes)} used
                </span>
                <span className="text-gray-600">
                  {settings.storage_limit_gb} GB limit
                </span>
              </div>

              <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getStorageLevelColor()}`}
                  style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-900">
                    {getStoragePercentage().toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Image className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-900">
                  {storageMetrics.photo_count}
                </div>
                <div className="text-xs text-blue-700">Photos</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Video className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-purple-900">
                  {storageMetrics.video_count}
                </div>
                <div className="text-xs text-purple-700">Videos</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-900">
                  {storageMetrics.report_count}
                </div>
                <div className="text-xs text-green-700">Reports</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Reports
          </h2>
          {recentReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No recent reports
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Technician
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Form
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
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
                        {new Date(report.created_at).toLocaleDateString('en-US')}
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
