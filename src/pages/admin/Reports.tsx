import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useReportStore } from '@/stores/reportStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { FileText, Search, Download, Eye, Trash2 } from 'lucide-react';
import type { ReportSummary } from '@/types';
import { formatDate } from '@/utils/dateUtils';

export default function ReportsPage() {
  const { reportSummaries, setReportSummaries, loading, setLoading } = useReportStore();
  const { confirm, alert } = useConfirm();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReportSummaries(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reportId: string, companyName: string) {
    const confirmed = await confirm({
      title: 'Eliminar Reporte',
      message: `¿Estás seguro de que quieres eliminar el reporte de ${companyName}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(reportId);

      // Get report photos to delete from storage
      const { data: photos } = await supabase
        .from('report_photos')
        .select('file_name')
        .eq('report_id', reportId);

      // Delete photos and thumbnails from storage
      if (photos && photos.length > 0) {
        const allFiles: string[] = [];
        photos.forEach(photo => {
          allFiles.push(photo.file_name); // Main photo
          // Add thumbnail (replace .webp with _thumb.webp)
          const thumbName = photo.file_name.replace('.webp', '_thumb.webp');
          allFiles.push(thumbName);
        });
        
        // Remove all files from storage
        const { error: storageError } = await supabase.storage
          .from('service-photos')
          .remove(allFiles);
        
        if (storageError) {
          console.error('Error deleting photos from storage:', storageError);
        }
      }

      // Delete report (cascade will delete photos records)
      const { error } = await supabase
        .from('service_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      await alert('Error al eliminar el reporte. Por favor intenta de nuevo.', 'Error');
    } finally {
      setDeleting(null);
    }
  }

  function handleView(reportId: string) {
    navigate(`/admin/reports/${reportId}`);
  }

  const filteredReports = reportSummaries.filter((report) => {
    const matchesSearch =
      report.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.form_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Service Reports</h1>
          <p className="text-gray-600 mt-1">Review and manage technical reports</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by company, technician or form..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'reviewed', label: 'Reviewed' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Reports Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No reports found
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.technician_name}</div>
                      <div className="text-sm text-gray-500">{report.technician_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.form_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          report.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : report.status === 'reviewed'
                            ? 'bg-blue-100 text-blue-700'
                            : report.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.photo_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.created_at, 'PP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(report.id)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id, report.company_name)}
                          disabled={deleting === report.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Eliminar reporte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
