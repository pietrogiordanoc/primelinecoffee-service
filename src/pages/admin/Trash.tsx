import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import type { ReportSummary } from '@/types';
import { formatDate } from '@/utils/dateUtils';

export default function TrashPage() {
  const [trashedReports, setTrashedReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const { confirm, alert } = useConfirm();

  useEffect(() => {
    loadTrashedReports();
  }, []);

  async function loadTrashedReports() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_trash')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setTrashedReports(data || []);
    } catch (error) {
      console.error('Error loading trash:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(reportIds: string[]) {
    const confirmed = await confirm({
      title: 'Restore Reports',
      message: `Are you sure you want to restore ${reportIds.length} report(s)?`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('service_reports')
        .update({ deleted_at: null })
        .in('id', reportIds);

      if (error) throw error;

      await alert('Reports restored successfully', 'Success');
      setSelectedReports(new Set());
      await loadTrashedReports();
    } catch (error) {
      console.error('Error restoring reports:', error);
      await alert('Error restoring reports. Please try again.', 'Error');
    } finally {
      setProcessing(false);
    }
  }

  async function handlePermanentDelete(reportIds: string[]) {
    const confirmed = await confirm({
      title: 'Permanently Delete Reports',
      message: `⚠️ This will PERMANENTLY delete ${reportIds.length} report(s) and all associated photos/videos. This action CANNOT be undone!`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) return;

    // Double confirmation for permanent delete
    const doubleConfirmed = await confirm({
      title: 'Final Confirmation',
      message: 'Are you absolutely sure? This is your last chance to cancel.',
      confirmText: 'Yes, Delete Forever',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!doubleConfirmed) return;

    try {
      setProcessing(true);

      // Delete photos from storage for each report
      for (const reportId of reportIds) {
        const { data: photos } = await supabase
          .from('report_photos')
          .select('file_name')
          .eq('report_id', reportId);

        if (photos && photos.length > 0) {
          const allFiles: string[] = [];
          photos.forEach(photo => {
            allFiles.push(photo.file_name);
            const thumbName = photo.file_name.replace('.webp', '_thumb.webp');
            allFiles.push(thumbName);
          });

          const { error: storageError } = await supabase.storage
            .from('service-photos')
            .remove(allFiles);

          if (storageError) {
            console.error('Error deleting photos from storage:', storageError);
          }
        }
      }

      // Permanently delete reports
      const { error } = await supabase
        .from('service_reports')
        .delete()
        .in('id', reportIds);

      if (error) throw error;

      await alert('Reports permanently deleted', 'Success');
      setSelectedReports(new Set());
      await loadTrashedReports();
    } catch (error) {
      console.error('Error deleting reports:', error);
      await alert('Error deleting reports. Please try again.', 'Error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleEmptyTrash() {
    if (trashedReports.length === 0) return;

    const confirmed = await confirm({
      title: 'Empty Trash',
      message: `⚠️ This will PERMANENTLY delete ALL ${trashedReports.length} report(s) in the trash and their associated media. This CANNOT be undone!`,
      confirmText: 'Empty Trash',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) return;

    const reportIds = trashedReports.map(r => r.id);
    await handlePermanentDelete(reportIds);
  }

  function toggleSelectAll() {
    if (selectedReports.size === trashedReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(trashedReports.map(r => r.id)));
    }
  }

  function toggleSelect(reportId: string) {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  }

  const selectedCount = selectedReports.size;
  const allSelected = trashedReports.length > 0 && selectedReports.size === trashedReports.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trash2 className="w-6 h-6" />
          Trash
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Deleted reports are kept here for 30 days before automatic permanent deletion
        </p>
      </div>

      {/* Bulk Actions */}
      {trashedReports.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({trashedReports.length})
                </span>
              </label>
              {selectedCount > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedCount} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleRestore(Array.from(selectedReports))}
                    disabled={processing}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore Selected
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handlePermanentDelete(Array.from(selectedReports))}
                    disabled={processing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Forever
                  </Button>
                </>
              )}
              {trashedReports.length > 0 && (
                <Button
                  variant="danger"
                  onClick={handleEmptyTrash}
                  disabled={processing}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Empty Trash
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Trashed Reports Table */}
      <Card>
        {trashedReports.length === 0 ? (
          <div className="py-12 text-center">
            <Trash2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Trash is empty</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deleted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trashedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono font-semibold text-gray-600">
                        {report.report_code || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.company_name}
                      </div>
                      <div className="text-xs text-gray-500">{report.technician_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.form_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.photo_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.deleted_at ? formatDate(report.deleted_at, 'PPp') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore([report.id])}
                          disabled={processing}
                          className="text-primary-600 hover:text-primary-900 disabled:opacity-50"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete([report.id])}
                          disabled={processing}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete Forever"
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
        )}
      </Card>
    </div>
  );
}
