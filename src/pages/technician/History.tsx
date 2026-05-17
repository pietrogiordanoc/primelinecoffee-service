import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { Clock, FileText, Eye, Trash2, Building2 } from 'lucide-react';
import type { ReportSummary } from '@/types';

export default function ReportHistory() {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { confirm, alert } = useConfirm();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [userProfile]);

  async function loadReports() {
    try {
      setLoading(true);

      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', userProfile?.id)
        .single();

      if (!techData) return;

      const { data, error } = await supabase
        .from('report_summary')
        .select('*')
        .eq('technician_email', userProfile?.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
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

      // Reload reports
      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      await alert('Error al eliminar el reporte. Por favor intenta de nuevo.', 'Error');
    } finally {
      setDeleting(null);
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
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">Report History</h1>

      {reports.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">You have no reports yet</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Company
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Form
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Photos
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {report.company_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {report.form_name}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(report.created_at)}
                        </span>
                        {report.submitted_at && (
                          <span className="text-xs text-gray-400">
                            {formatDate(report.submitted_at, 'MMM d, HH:mm')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          report.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : report.status === 'reviewed'
                            ? 'bg-blue-100 text-blue-700'
                            : report.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {report.status === 'completed'
                          ? 'Completed'
                          : report.status === 'reviewed'
                          ? 'Reviewed'
                          : report.status === 'submitted'
                          ? 'Submitted'
                          : 'Draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {report.photo_count > 0 ? `${report.photo_count}` : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/technician/report/${report.id}/view`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id, report.company_name)}
                          disabled={deleting === report.id}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
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
        </Card>
      )}
    </div>
  );
}
