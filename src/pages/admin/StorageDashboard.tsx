import { useEffect, useState } from 'react';
import { HardDrive, TrendingUp, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettingsStore } from '@/stores/settingsStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StorageMetrics {
  total_size_bytes: number;
  photo_count: number;
  video_count: number;
  report_count: number;
  measured_at: string;
}

interface TechnicianStats {
  technician_id: string;
  technician_name: string;
  total_size_bytes: number;
  photo_count: number;
  video_count: number;
  report_count: number;
  avg_photos_per_report: number;
  avg_videos_per_report: number;
  avg_report_size_mb: number;
  last_report_at: string;
}

interface StoragePrediction {
  daysUntilFull: number;
  estimatedFullDate: Date | null;
  avgDailyGrowthMB: number;
  confidence: 'high' | 'medium' | 'low';
}

export default function StorageDashboard() {
  const { settings, fetchSettings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [currentMetrics, setCurrentMetrics] = useState<StorageMetrics | null>(null);
  const [historicalMetrics, setHistoricalMetrics] = useState<StorageMetrics[]>([]);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [prediction, setPrediction] = useState<StoragePrediction | null>(null);

  // Get storage limits from settings
  const STORAGE_LIMIT_GB = settings?.storage_limit_gb || 50;
  const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;
  const WARNING_PERCENT = settings?.storage_warning_percent || 70;
  const CRITICAL_PERCENT = settings?.storage_critical_percent || 85;

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      loadStorageData();
    }
  }, [settings]);

  async function loadStorageData() {
    try {
      setLoading(true);

      // Calculate and update metrics
      await supabase.rpc('calculate_storage_metrics');
      await supabase.rpc('update_technician_storage_stats');

      // Get current metrics
      const { data: metrics } = await supabase
        .from('storage_metrics')
        .select('*')
        .order('measured_at', { ascending: false })
        .limit(30);

      if (metrics && metrics.length > 0) {
        setCurrentMetrics(metrics[0]);
        setHistoricalMetrics(metrics);
        calculatePrediction(metrics);
      }

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
        .order('total_size_bytes', { ascending: false });

      if (stats) {
        const formattedStats: TechnicianStats[] = stats.map((stat: any) => ({
          technician_id: stat.technician_id,
          technician_name: stat.technician?.user?.full_name || 'Unknown',
          total_size_bytes: stat.total_size_bytes,
          photo_count: stat.photo_count,
          video_count: stat.video_count,
          report_count: stat.report_count,
          avg_photos_per_report: stat.avg_photos_per_report || 0,
          avg_videos_per_report: stat.avg_videos_per_report || 0,
          avg_report_size_mb: stat.avg_report_size_mb || 0,
          last_report_at: stat.last_report_at,
        }));
        setTechnicianStats(formattedStats);
      }
    } catch (error) {
      console.error('Error loading storage data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculatePrediction(metrics: StorageMetrics[]) {
    if (metrics.length < 2) {
      setPrediction(null);
      return;
    }

    // Calculate daily growth rate
    const sortedMetrics = [...metrics].sort(
      (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    );

    const first = sortedMetrics[0];
    const last = sortedMetrics[sortedMetrics.length - 1];

    const daysDiff = Math.max(
      1,
      (new Date(last.measured_at).getTime() - new Date(first.measured_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const bytesDiff = last.total_size_bytes - first.total_size_bytes;
    const avgDailyGrowthBytes = bytesDiff / daysDiff;
    const avgDailyGrowthMB = avgDailyGrowthBytes / (1024 * 1024);

    const remainingBytes = STORAGE_LIMIT_BYTES - last.total_size_bytes;
    const daysUntilFull = Math.ceil(remainingBytes / avgDailyGrowthBytes);

    const estimatedFullDate =
      daysUntilFull > 0 && daysUntilFull < 10000
        ? new Date(Date.now() + daysUntilFull * 24 * 60 * 60 * 1000)
        : null;

    const confidence =
      metrics.length >= 14 ? 'high' : metrics.length >= 7 ? 'medium' : 'low';

    setPrediction({
      daysUntilFull,
      estimatedFullDate,
      avgDailyGrowthMB,
      confidence,
    });
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getStoragePercentage(): number {
    if (!currentMetrics) return 0;
    return (currentMetrics.total_size_bytes / STORAGE_LIMIT_BYTES) * 100;
  }

  function getStorageLevel(): 'safe' | 'warning' | 'critical' {
    const percentage = getStoragePercentage();
    if (percentage >= CRITICAL_PERCENT) return 'critical';
    if (percentage >= WARNING_PERCENT) return 'warning';
    return 'safe';
  }

  function getStorageLevelColor(): string {
    const level = getStorageLevel();
    if (level === 'critical') return 'bg-red-500';
    if (level === 'warning') return 'bg-amber-500';
    return 'bg-green-500';
  }

  function getStorageLevelIcon() {
    const level = getStorageLevel();
    if (level === 'critical') return <XCircle className="w-6 h-6 text-red-600" />;
    if (level === 'warning') return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    return <CheckCircle className="w-6 h-6 text-green-600" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const percentage = getStoragePercentage();
  const usedGB = currentMetrics ? currentMetrics.total_size_bytes / (1024 ** 3) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Storage Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Monitor and manage storage usage</p>
      </div>

      {/* Storage Overview */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Storage Usage</h2>
          </div>
          {getStorageLevelIcon()}
        </div>

        {/* Thermometer Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs md:text-sm">
            <span className="font-medium text-gray-700">
              {formatBytes(currentMetrics?.total_size_bytes || 0)} used
            </span>
            <span className="text-gray-600">
              {STORAGE_LIMIT_GB} GB limit
            </span>
          </div>

          <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getStorageLevelColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs md:text-sm font-semibold text-gray-900">
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Level indicators */}
          <div className="flex justify-between text-xs text-gray-600">
            <span>0%</span>
            <span className="text-amber-600">{WARNING_PERCENT}% Warning</span>
            <span className="text-red-600">{CRITICAL_PERCENT}% Critical</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6">
          <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
            <div className="text-lg md:text-2xl font-bold text-blue-900">
              {currentMetrics?.photo_count || 0}
            </div>
            <div className="text-xs md:text-sm text-blue-700">Photos</div>
          </div>
          <div className="text-center p-3 md:p-4 bg-purple-50 rounded-lg">
            <div className="text-lg md:text-2xl font-bold text-purple-900">
              {currentMetrics?.video_count || 0}
            </div>
            <div className="text-xs md:text-sm text-purple-700">Videos</div>
          </div>
          <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
            <div className="text-lg md:text-2xl font-bold text-green-900">
              {currentMetrics?.report_count || 0}
            </div>
            <div className="text-xs md:text-sm text-green-700">Reports</div>
          </div>
        </div>
      </div>

      {/* Prediction */}
      {prediction && prediction.estimatedFullDate && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <TrendingUp className="w-5 md:w-6 h-5 md:h-6 text-blue-600 flex-shrink-0" />
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Storage Forecast</h2>
            <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
              prediction.confidence === 'high' ? 'bg-green-100 text-green-700' :
              prediction.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {prediction.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div>
              <div className="text-xs md:text-sm text-gray-600">Avg Daily Growth</div>
              <div className="text-base md:text-xl font-bold text-gray-900">
                {prediction.avgDailyGrowthMB.toFixed(2)} MB/day
              </div>
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-600">Days Until Full</div>
              <div className="text-base md:text-xl font-bold text-gray-900">
                {prediction.daysUntilFull > 0 ? prediction.daysUntilFull : '∞'} days
              </div>
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-600">Estimated Full Date</div>
              <div className="text-base md:text-xl font-bold text-gray-900">
                {prediction.estimatedFullDate
                  ? prediction.estimatedFullDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technician Stats */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Storage by Technician</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Photos/Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Videos/Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Size/Report
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {technicianStats.map((stat) => (
                <tr key={stat.technician_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.technician_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatBytes(stat.total_size_bytes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.report_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.avg_photos_per_report.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.avg_videos_per_report.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.avg_report_size_mb.toFixed(2)} MB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {technicianStats.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No technician data available
            </div>
          ) : (
            technicianStats.map((stat) => (
              <div key={stat.technician_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                {/* Name */}
                <div className="font-semibold text-sm text-gray-900 mb-2">
                  {stat.technician_name}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Storage Used</div>
                    <div className="font-semibold text-gray-900">{formatBytes(stat.total_size_bytes)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Reports</div>
                    <div className="font-semibold text-gray-900">{stat.report_count}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Avg Photos/Report</div>
                    <div className="font-semibold text-gray-900">{stat.avg_photos_per_report.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Avg Videos/Report</div>
                    <div className="font-semibold text-gray-900">{stat.avg_videos_per_report.toFixed(1)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Avg Size/Report</div>
                    <div className="font-semibold text-gray-900">{stat.avg_report_size_mb.toFixed(2)} MB</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
