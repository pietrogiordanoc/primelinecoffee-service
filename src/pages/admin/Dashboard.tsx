import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { Users, Building2, FileText, HardDrive, Image, Video, AlertTriangle, ExternalLink, BarChart3, Camera, Film, X } from 'lucide-react';
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

interface ServiceTypeCounts {
  delivery: number;
  pickup: number;
  service: number;
  tuneup: number;
  training: number;
  other: number;
}

interface TechnicianStat {
  technician_id: string;
  technician_name: string;
  report_count: number;
  photo_count: number;
  video_count: number;
  total_size_bytes: number;
  service_types: ServiceTypeCounts;
}

interface CompanyStat {
  company_id: string;
  company_name: string;
  report_count: number;
  photo_count: number;
  video_count: number;
  service_types: ServiceTypeCounts;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];
const SERVICE_TYPE_COLORS = {
  delivery: '#3b82f6',    // blue
  pickup: '#8b5cf6',      // purple
  service: '#10b981',     // green
  tuneup: '#f59e0b',      // amber
  training: '#ec4899',    // pink
  other: '#6366f1'        // indigo
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings, fetchSettings } = useSettingsStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStat[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStat[]>([]);
  const [serviceTypeStats, setServiceTypeStats] = useState<ServiceTypeCounts>({
    delivery: 0,
    pickup: 0,
    service: 0,
    tuneup: 0,
    training: 0,
    other: 0
  });
  const [activeTab, setActiveTab] = useState<'technicians' | 'customers'>('technicians');
  const [showChartsModal, setShowChartsModal] = useState(false);

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

      // Get service type counts per technician
      const { data: reports } = await supabase
        .from('service_reports')
        .select('technician_id, service_type');

      const techServiceTypes = new Map<string, ServiceTypeCounts>();
      const globalServiceTypes: ServiceTypeCounts = {
        delivery: 0,
        pickup: 0,
        service: 0,
        tuneup: 0,
        training: 0,
        other: 0
      };

      reports?.forEach((report: any) => {
        // Process per-technician stats (skip if technician_id is NULL - admin reports)
        if (report.technician_id) {
          if (!techServiceTypes.has(report.technician_id)) {
            techServiceTypes.set(report.technician_id, {
              delivery: 0,
              pickup: 0,
              service: 0,
              tuneup: 0,
              training: 0,
              other: 0
            });
          }
          
          const counts = techServiceTypes.get(report.technician_id)!;
          const serviceType = report.service_type?.toLowerCase() || 'other';
          
          // Count for technician
          if (serviceType === 'delivery') counts.delivery++;
          else if (serviceType === 'pick up' || serviceType === 'pickup') counts.pickup++;
          else if (serviceType === 'service') counts.service++;
          else if (serviceType === 'tune up' || serviceType === 'tuneup') counts.tuneup++;
          else if (serviceType === 'training') counts.training++;
          else counts.other++;
        }
        
        // Count for global stats (include ALL reports, even admin-created ones)
        const serviceType = report.service_type?.toLowerCase() || 'other';
        if (serviceType === 'delivery') globalServiceTypes.delivery++;
        else if (serviceType === 'pick up' || serviceType === 'pickup') globalServiceTypes.pickup++;
        else if (serviceType === 'service') globalServiceTypes.service++;
        else if (serviceType === 'tune up' || serviceType === 'tuneup') globalServiceTypes.tuneup++;
        else if (serviceType === 'training') globalServiceTypes.training++;
        else globalServiceTypes.other++;
      });

      setServiceTypeStats(globalServiceTypes);

      if (stats) {
        const formattedStats: TechnicianStat[] = stats.map((stat: any) => {
          const serviceCounts = techServiceTypes.get(stat.technician_id) || {
            delivery: 0,
            pickup: 0,
            service: 0,
            tuneup: 0,
            training: 0,
            other: 0
          };
          
          return {
            technician_id: stat.technician_id,
            technician_name: stat.technician?.user?.full_name || 'Unknown',
            report_count: stat.report_count || 0,
            photo_count: stat.photo_count || 0,
            video_count: stat.video_count || 0,
            total_size_bytes: stat.total_size_bytes || 0,
            service_types: serviceCounts
          };
        });
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
          id,
          service_type
        `);

      if (stats) {
        // Group by company and count reports
        const companyMap = new Map<string, { name: string; count: number }>();
        const companyServiceTypes = new Map<string, ServiceTypeCounts>();
        
        stats.forEach((report: any) => {
          const companyId = report.company_id;
          const companyName = report.company?.name || 'Unknown';
          
          if (companyMap.has(companyId)) {
            companyMap.get(companyId)!.count++;
          } else {
            companyMap.set(companyId, { name: companyName, count: 1 });
          }
          
          // Count service types
          if (!companyServiceTypes.has(companyId)) {
            companyServiceTypes.set(companyId, {
              delivery: 0,
              pickup: 0,
              service: 0,
              tuneup: 0,
              training: 0,
              other: 0
            });
          }
          
          const counts = companyServiceTypes.get(companyId)!;
          const serviceType = report.service_type?.toLowerCase() || 'other';
          
          if (serviceType === 'delivery') counts.delivery++;
          else if (serviceType === 'pick up' || serviceType === 'pickup') counts.pickup++;
          else if (serviceType === 'service') counts.service++;
          else if (serviceType === 'tune up' || serviceType === 'tuneup') counts.tuneup++;
          else if (serviceType === 'training') counts.training++;
          else counts.other++;
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
            const serviceCounts = companyServiceTypes.get(companyId) || {
              delivery: 0,
              pickup: 0,
              service: 0,
              tuneup: 0,
              training: 0,
              other: 0
            };
            
            return {
              company_id: companyId,
              company_name: data.name,
              report_count: data.count,
              photo_count: mediaCounts.photos,
              video_count: mediaCounts.videos,
              service_types: serviceCounts
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
      name: 'Customers',
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
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs md:text-sm text-gray-600">System activity summary</p>
      </div>

      {/* Stats Grid - Ultra Minimal */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <div className="p-2 md:p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs font-medium text-gray-600">{stat.name}</p>
                    <p className="text-lg md:text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
                  </div>
                  <div className={`hidden md:block p-2 rounded-lg ${colorMap[stat.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Storage Monitor - Mobile Optimized */}
      {storageMetrics && settings && (
        <Card>
          <div className="p-2 md:p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-600" />
                <h2 className="text-xs md:text-sm font-semibold text-gray-900">Storage</h2>
                {getStorageLevel() === 'critical' && (
                  <AlertTriangle className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-600" />
                )}
                {getStorageLevel() === 'warning' && (
                  <AlertTriangle className="w-3.5 md:w-4 h-3.5 md:h-4 text-amber-600" />
                )}
              </div>
              <button
                onClick={() => navigate('/admin/storage')}
                className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <span className="hidden sm:inline">Details</span>
                <ExternalLink className="w-3 md:w-3.5 h-3 md:h-3.5" />
              </button>
            </div>

            {/* Thermometer Bar */}
            <div className="space-y-1 mb-2">
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="font-medium text-gray-700">
                  {formatBytes(storageMetrics.total_size_bytes)}
                </span>
                <span className="text-gray-600">
                  {settings.storage_limit_gb} GB
                </span>
              </div>

              <div className="relative w-full h-3 md:h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getStorageLevelColor()}`}
                  style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] md:text-[10px] font-semibold text-gray-900">
                    {getStoragePercentage().toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats - More Compact Mobile */}
            <div className="flex items-center justify-around gap-1 md:gap-2 pt-2 border-t border-gray-100">
              <div className="flex flex-col md:flex-row items-center md:gap-1.5">
                <Image className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-600" />
                <div className="flex flex-col md:flex-row items-center md:items-baseline md:gap-1">
                  <span className="text-xs md:text-sm font-bold text-blue-900">{storageMetrics.photo_count}</span>
                  <span className="text-[8px] md:text-[10px] text-blue-700">Photos</span>
                </div>
              </div>
              <div className="w-px h-6 md:h-4 bg-gray-200"></div>
              <div className="flex flex-col md:flex-row items-center md:gap-1.5">
                <Video className="w-3 md:w-3.5 h-3 md:h-3.5 text-purple-600" />
                <div className="flex flex-col md:flex-row items-center md:items-baseline md:gap-1">
                  <span className="text-xs md:text-sm font-bold text-purple-900">{storageMetrics.video_count}</span>
                  <span className="text-[8px] md:text-[10px] text-purple-700">Videos</span>
                </div>
              </div>
              <div className="w-px h-6 md:h-4 bg-gray-200"></div>
              <div className="flex flex-col md:flex-row items-center md:gap-1.5">
                <FileText className="w-3 md:w-3.5 h-3 md:h-3.5 text-green-600" />
                <div className="flex flex-col md:flex-row items-center md:items-baseline md:gap-1">
                  <span className="text-xs md:text-sm font-bold text-green-900">{storageMetrics.report_count}</span>
                  <span className="text-[8px] md:text-[10px] text-green-700">Reports</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Report Statistics - Mobile Optimized */}
      <Card>
        <div className="p-2 md:p-4">
          {/* Header with Tabs */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 md:mb-4">
            <div className="flex items-center gap-1.5 md:gap-2">
              <BarChart3 className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
              <h2 className="text-sm md:text-lg font-semibold text-gray-900">Statistics</h2>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <button
                onClick={() => setActiveTab('technicians')}
                className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition ${
                  activeTab === 'technicians'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="md:hidden">Techs</span>
                <span className="hidden md:inline">By Technician</span>
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition ${
                  activeTab === 'companies'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="md:hidden">Companies</span>
                <span className="hidden md:inline">By Company</span>
              </button>
            </div>
          </div>

          {/* Technician Statistics */}
          {activeTab === 'technicians' && (
            <div className="space-y-3 md:space-y-6">
              {/* Mobile: View Charts Button */}
              <button
                onClick={() => setShowChartsModal(true)}
                className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm transition"
              >
                <BarChart3 className="w-4 h-4" />
                View Charts
              </button>

              {/* Desktop: Charts Grid */}
              <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          outerRadius={70}
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

                {/* Pie Chart - Service Types Distribution */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Service Types
                  </h3>
                  {serviceTypeStats && (serviceTypeStats.delivery + serviceTypeStats.pickup + serviceTypeStats.service + serviceTypeStats.tuneup + serviceTypeStats.training + serviceTypeStats.other) > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Delivery', value: serviceTypeStats.delivery },
                            { name: 'Pick up', value: serviceTypeStats.pickup },
                            { name: 'Service', value: serviceTypeStats.service },
                            { name: 'Tune up', value: serviceTypeStats.tuneup },
                            { name: 'Training', value: serviceTypeStats.training },
                            { name: 'Other', value: serviceTypeStats.other }
                          ].filter(item => item.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {[
                            { name: 'Delivery', value: serviceTypeStats.delivery, color: SERVICE_TYPE_COLORS.delivery },
                            { name: 'Pick up', value: serviceTypeStats.pickup, color: SERVICE_TYPE_COLORS.pickup },
                            { name: 'Service', value: serviceTypeStats.service, color: SERVICE_TYPE_COLORS.service },
                            { name: 'Tune up', value: serviceTypeStats.tuneup, color: SERVICE_TYPE_COLORS.tuneup },
                            { name: 'Training', value: serviceTypeStats.training, color: SERVICE_TYPE_COLORS.training },
                            { name: 'Other', value: serviceTypeStats.other, color: SERVICE_TYPE_COLORS.other }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No service type data yet</p>
                  )}
                </div>
              </div>

              {/* Desktop Table - Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
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
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tune up
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Delivery
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pick up
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Training
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Other
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Photos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Videos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {technicianStats.map((tech) => (
                      <tr key={tech.technician_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {tech.technician_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-bold">
                          {tech.report_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          {tech.service_types.service}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-600 font-medium">
                          {tech.service_types.tuneup}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {tech.service_types.delivery}
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                          {tech.service_types.pickup}
                        </td>
                        <td className="px-4 py-3 text-sm text-pink-600 font-medium">
                          {tech.service_types.training}
                        </td>
                        <td className="px-4 py-3 text-sm text-indigo-600 font-medium">
                          {tech.service_types.other}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {tech.photo_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {tech.video_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {technicianStats.slice(0, 5).map((tech) => (
                  <div key={tech.technician_id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                    <div className="font-semibold text-xs text-gray-900 mb-2">
                      {tech.technician_name}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-gray-500">Reports</div>
                        <div className="font-bold text-gray-900">{tech.report_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Photos</div>
                        <div className="font-bold text-blue-600">{tech.photo_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Videos</div>
                        <div className="font-bold text-purple-600">{tech.video_count}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] mt-2 pt-2 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{tech.service_types.service}</div>
                        <div className="text-gray-500">Service</div>
                      </div>
                      <div className="text-center">
                        <div className="text-amber-600 font-semibold">{tech.service_types.tuneup}</div>
                        <div className="text-gray-500">Tune up</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{tech.service_types.delivery}</div>
                        <div className="text-gray-500">Delivery</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company Statistics */}
          {activeTab === 'companies' && (
            <div className="space-y-3 md:space-y-6">
              {/* Mobile: View Charts Button */}
              <button
                onClick={() => setShowChartsModal(true)}
                className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm transition"
              >
                <BarChart3 className="w-4 h-4" />
                View Charts
              </button>

              {/* Desktop: Charts Grid */}
              <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          outerRadius={70}
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

                {/* Pie Chart - Service Types */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Service Types
                  </h3>
                  {serviceTypeStats && (serviceTypeStats.delivery + serviceTypeStats.pickup + serviceTypeStats.service + serviceTypeStats.tuneup + serviceTypeStats.training + serviceTypeStats.other) > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Delivery', value: serviceTypeStats.delivery },
                            { name: 'Pick up', value: serviceTypeStats.pickup },
                            { name: 'Service', value: serviceTypeStats.service },
                            { name: 'Tune up', value: serviceTypeStats.tuneup },
                            { name: 'Training', value: serviceTypeStats.training },
                            { name: 'Other', value: serviceTypeStats.other }
                          ].filter(item => item.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {[
                            { name: 'Delivery', value: serviceTypeStats.delivery, color: SERVICE_TYPE_COLORS.delivery },
                            { name: 'Pick up', value: serviceTypeStats.pickup, color: SERVICE_TYPE_COLORS.pickup },
                            { name: 'Service', value: serviceTypeStats.service, color: SERVICE_TYPE_COLORS.service },
                            { name: 'Tune up', value: serviceTypeStats.tuneup, color: SERVICE_TYPE_COLORS.tuneup },
                            { name: 'Training', value: serviceTypeStats.training, color: SERVICE_TYPE_COLORS.training },
                            { name: 'Other', value: serviceTypeStats.other, color: SERVICE_TYPE_COLORS.other }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No service type data yet</p>
                  )}
                </div>
              </div>

              {/* Desktop Table - Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
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
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tune up
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Delivery
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pick up
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Training
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Other
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Photos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Videos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companyStats.map((company) => (
                      <tr key={company.company_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {company.company_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-bold">
                          {company.report_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          {company.service_types.service}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-600 font-medium">
                          {company.service_types.tuneup}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {company.service_types.delivery}
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                          {company.service_types.pickup}
                        </td>
                        <td className="px-4 py-3 text-sm text-pink-600 font-medium">
                          {company.service_types.training}
                        </td>
                        <td className="px-4 py-3 text-sm text-indigo-600 font-medium">
                          {company.service_types.other}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {company.photo_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {company.video_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {companyStats.slice(0, 5).map((company) => (
                  <div key={company.company_id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                    <div className="font-semibold text-xs text-gray-900 mb-2">
                      {company.company_name}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-gray-500">Reports</div>
                        <div className="font-bold text-gray-900">{company.report_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Photos</div>
                        <div className="font-bold text-blue-600">{company.photo_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Videos</div>
                        <div className="font-bold text-purple-600">{company.video_count}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] mt-2 pt-2 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{company.service_types.service}</div>
                        <div className="text-gray-500">Service</div>
                      </div>
                      <div className="text-center">
                        <div className="text-amber-600 font-semibold">{company.service_types.tuneup}</div>
                        <div className="text-gray-500">Tune up</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{company.service_types.delivery}</div>
                        <div className="text-gray-500">Delivery</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Mobile Charts Modal */}
      <Modal
        isOpen={showChartsModal}
        onClose={() => setShowChartsModal(false)}
        title="Statistics Charts"
        size="lg"
      >
        <div className="space-y-6">
          {/* Reports Distribution */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {activeTab === 'technicians' ? 'Reports by Technician' : 'Reports by Company'}
            </h3>
            {(activeTab === 'technicians' ? technicianStats : companyStats).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={activeTab === 'technicians' ? technicianStats : companyStats}
                    dataKey="report_count"
                    nameKey={activeTab === 'technicians' ? 'technician_name' : 'company_name'}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={false}
                  >
                    {(activeTab === 'technicians' ? technicianStats : companyStats).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px' }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No data available</p>
            )}
          </div>

          {/* Media Usage */}
          {activeTab === 'technicians' && technicianStats.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Media Usage
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={technicianStats.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="technician_name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                  <Bar dataKey="photo_count" fill="#3b82f6" name="Photos" />
                  <Bar dataKey="video_count" fill="#8b5cf6" name="Videos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Service Types */}
          {serviceTypeStats && (serviceTypeStats.delivery + serviceTypeStats.pickup + serviceTypeStats.service + serviceTypeStats.tuneup + serviceTypeStats.training + serviceTypeStats.other) > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Service Types
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Delivery', value: serviceTypeStats.delivery },
                      { name: 'Pick up', value: serviceTypeStats.pickup },
                      { name: 'Service', value: serviceTypeStats.service },
                      { name: 'Tune up', value: serviceTypeStats.tuneup },
                      { name: 'Training', value: serviceTypeStats.training },
                      { name: 'Other', value: serviceTypeStats.other }
                    ].filter(item => item.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={false}
                  >
                    {[
                      { name: 'Delivery', value: serviceTypeStats.delivery, color: SERVICE_TYPE_COLORS.delivery },
                      { name: 'Pick up', value: serviceTypeStats.pickup, color: SERVICE_TYPE_COLORS.pickup },
                      { name: 'Service', value: serviceTypeStats.service, color: SERVICE_TYPE_COLORS.service },
                      { name: 'Tune up', value: serviceTypeStats.tuneup, color: SERVICE_TYPE_COLORS.tuneup },
                      { name: 'Training', value: serviceTypeStats.training, color: SERVICE_TYPE_COLORS.training },
                      { name: 'Other', value: serviceTypeStats.other, color: SERVICE_TYPE_COLORS.other }
                    ].filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px' }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
