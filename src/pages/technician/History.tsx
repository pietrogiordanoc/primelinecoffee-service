import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { Clock, FileText, Eye, Trash2, Building2, ChevronRight, ChevronDown, Search, Calendar, Image as ImageIcon } from 'lucide-react';
import type { ReportSummary } from '@/types';

export default function ReportHistory() {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { confirm, alert } = useConfirm();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      title: 'Delete Report',
      message: `Are you sure you want to delete the report from ${companyName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
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
      await alert('Error deleting report. Please try again.', 'Error');
    } finally {
      setDeleting(null);
    }
  }

  // Filter reports by search query
  const filteredReports = reports.filter(report =>
    report.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.form_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-xl font-bold text-gray-900">Report History</h1>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
      </div>

      {filteredReports.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No reports found' : 'You have no reports yet'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredReports.map((report) => {
            const isExpanded = expandedReport === report.id;
            
            return (
              <div
                key={report.id}
                className="bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all"
              >
                {/* Report Header - Always Visible */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {report.company_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(report.created_at)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
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
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </div>

                {/* Report Details - Expandable */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 pt-3">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-900">{report.form_name}</p>
                    </div>
                    {report.submitted_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                          {new Date(report.submitted_at).toLocaleDateString('en-US', {
                            dateStyle: 'long',
                          })} at {new Date(report.submitted_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    {report.photo_count > 0 && (
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                          {report.photo_count} {report.photo_count === 1 ? 'photo' : 'photos'}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/technician/report/${report.id}/view`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View Report
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(report.id, report.company_name);
                        }}
                        disabled={deleting === report.id}
                        className="px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition text-sm font-medium disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
