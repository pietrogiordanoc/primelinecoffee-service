import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Building2, FileText, HardDrive, Image, Video, AlertTriangle, ExternalLink, BarChart3, Camera, Film } from 'lucide-react';
import type { DashboardStats } from '@/types';
import { useReportStore } from '@/stores/reportStore';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StorageMetrics {
  total_size_bytes: number;
  photo_count: number;
  video_count: number;
  report_count: number;
}

interface TechnicianStat {
  technician_id: string;
  technician_name: string;
  report_count: number;
  photo_count: number;
  video_count: number;
  total_size_bytes: number;
}

interface CompanyStat {
  company_id: string;
  company_name: string;
  report_count: number;
  photo_count: number;
  video_count: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings, fetchSettings } = useSettingsStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStat[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStat[]>([]);
  const [activeTab, setActiveTab] = useState<'technicians' | 'companies'>('technicians');

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

      // Load statistics
      await loadTechnicianStats();
      await loadCompanyStats();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTechnicianStats() {
    try {
      // Update stats first
      await supabase.rpc('update_technician_storage_stats');

      // Get technician stats
      const { data: stats } = await supabase
        .from('technician_storage_stats')
        .select(`
          *,
          technician:technician_id (
            user:user_id (
              full_name
            )
          )
        `)
        .order('report_count', { ascending: false })
        .limit(10);

      if (stats) {
        const formattedStats: TechnicianStat[] = stats.map((stat: any) => ({
          technician_id: stat.technician_id,
          technician_name: stat.technician?.user?.full_name || 'Unknown',
          report_count: stat.report_count || 0,
          photo_count: stat.photo_count || 0,
          video_count: stat.video_count || 0,
          total_size_bytes: stat.total_size_bytes || 0,
        }));
        setTechnicianStats(formattedStats);
      }
    } catch (error) {
      console.error('Error loading technician stats:', error);
    }
  }

  async function loadCompanyStats() {
    try {
      // Get company report stats
      const { data: stats } = await supabase
        .from('service_reports')
        .select(`
          company_id,
          company:companies(name),
          id
        `);

      if (stats) {
        // Group by company and count reports
        const companyMap = new Map<string, { name: string; count: number }>();
        
        stats.forEach((report: any) => {
          const companyId = report.company_id;
          const companyName = report.company?.name || 'Unknown';
          
          if (companyMap.has(companyId)) {
            companyMap.get(companyId)!.count++;
          } else {
            companyMap.set(companyId, { name: companyName, count: 1 });
          }
        });

        // Get photo and video counts per company
        const { data: photos } = await supabase
          .from('report_photos')
          .select(`
            service_report:service_reports(company_id),
            file_type
          `);

        const companyPhotos = new Map<string, { photos: number; videos: number }>();
        
        photos?.forEach((photo: any) => {
          const companyId = photo.service_report?.company_id;
          if (!companyId) return;
          
          if (!companyPhotos.has(companyId)) {
            companyPhotos.set(companyId, { photos: 0, videos: 0 });
          }
          
          const counts = companyPhotos.get(companyId)!;
          if (photo.file_type === 'photo') {
            counts.photos++;
          } else if (photo.file_type === 'video') {
            counts.videos++;
          }
        });

        // Combine data
        const formattedStats: CompanyStat[] = Array.from(companyMap.entries())
          .map(([companyId, data]) => {
            const mediaCounts = companyPhotos.get(companyId) || { photos: 0, videos: 0 };
            return {
              company_id: companyId,
              company_name: data.name,
              report_count: data.count,
              photo_count: mediaCounts.photos,
              video_count: mediaCounts.videos,
            };
          })
          .sort((a, b) => b.report_count - a.report_count)
          .slice(0, 10);

        setCompanyStats(formattedStats);
      }
    } catch (error) {
      console.error('Error loading company stats:', error);
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
      name: 'Reports',
      value: stats?.total_reports || 0,
      icon: FileText,
      color: 'blue',
    },
    {
      name: 'Technicians',
      value: stats?.total_technicians || 0,
      icon: Users,
      color: 'purple',
    },
    {
      name: 'Companies',
      value: stats?.total_companies || 0,
      icon: Building2,
      color: 'indigo',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">System activity summary</p>
      </div>

      {/* Stats Grid - Minimal */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">{stat.name}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Storage Monitor - Ultra Compact */}
      {storageMetrics && settings && (
        <Card>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">Storage</h2>
                {getStorageLevel() === 'critical' && (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                {getStorageLevel() === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <button
                onClick={() => navigate('/admin/storage')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Details
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Thermometer Bar */}
            <div className="space-y-1 mb-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-700">
                  {formatBytes(storageMetrics.total_size_bytes)}
                </span>
                <span className="text-gray-600">
                  {settings.storage_limit_gb} GB
                </span>
              </div>

              <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getStorageLevelColor()}`}
                  style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-gray-900">
                    {getStoragePercentage().toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats - Horizontal Compact */}
            <div className="flex items-center justify-around gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-blue-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-blue-900">{storageMetrics.photo_count}</span>
                  <span className="text-[10px] text-blue-700">Photos</span>
                </div>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-purple-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-purple-900">{storageMetrics.video_count}</span>
                  <span className="text-[10px] text-purple-700">Videos</span>
                </div>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-green-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-green-900">{storageMetrics.report_count}</span>
                  <span className="text-[10px] text-green-700">Reports</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Report Statistics - With Tabs */}
      <Card>
        <div className="p-4">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Report Statistics</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('technicians')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === 'technicians'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Technician
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === 'companies'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Company
              </button>
            </div>
          </div>

          {/* Technician Statistics */}
          {activeTab === 'technicians' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart - Reports Distribution */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Reports Distribution
                  </h3>
                  {technicianStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={technicianStats}
                          dataKey="report_count"
                          nameKey="technician_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.technician_name}: ${entry.report_count}`}
                        >
                          {technicianStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No data available</p>
                  )}
                </div>

                {/* Bar Chart - Photos & Videos */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Media Usage by Technician
                  </h3>
                  {technicianStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={technicianStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="technician_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="photo_count" fill="#3b82f6" name="Photos" />
                        <Bar dataKey="video_count" fill="#8b5cf6" name="Videos" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No data available</p>
                  )}
                </div>
              </div>

              {/* Detailed Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Technician
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reports
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Photos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Videos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Avg per Report
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {technicianStats.map((tech) => (
                      <tr key={tech.technician_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {tech.technician_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {tech.report_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {tech.photo_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                          {tech.video_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {tech.report_count > 0
                            ? `${((tech.photo_count + tech.video_count) / tech.report_count).toFixed(1)} files`
                            : '0 files'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Company Statistics */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart - Reports by Company */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Reports by Company
                  </h3>
                  {companyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={companyStats}
                          dataKey="report_count"
                          nameKey="company_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.company_name}: ${entry.report_count}`}
                        >
                          {companyStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No data available</p>
                  )}
                </div>

                {/* Bar Chart - Media by Company */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Media Usage by Company
                  </h3>
                  {companyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={companyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="company_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="photo_count" fill="#3b82f6" name="Photos" />
                        <Bar dataKey="video_count" fill="#8b5cf6" name="Videos" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No data available</p>
                  )}
                </div>
              </div>

              {/* Detailed Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reports
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Photos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Videos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Media
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companyStats.map((company) => (
                      <tr key={company.company_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {company.company_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {company.report_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {company.photo_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                          {company.video_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {company.photo_count + company.video_count} files
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
