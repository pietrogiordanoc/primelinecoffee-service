import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Trash2, RotateCcw, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ReportSummary } from '@/types';
import { formatDate } from '@/utils/dateUtils';

export default function TrashPage() {
  const [trashedReports, setTrashedReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const { confirm, alert } = useConfirm();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  // Pagination
  const totalPages = Math.ceil(trashedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = trashedReports.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header & Pagination */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Trash
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Auto-deleted after 30 days
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-1.5 py-1 border border-gray-300 rounded bg-white"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-gray-500">
            {trashedReports.length} total
          </span>
        </div>
      </div>

      {/* Bulk Actions */}
      {trashedReports.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">
              Select All
            </span>
          </label>
          {selectedCount > 0 && (
            <>
              <span className="text-xs text-gray-600">
                {selectedCount} selected
              </span>
              <button
                onClick={() => handleRestore(Array.from(selectedReports))}
                disabled={processing}
                className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
              </button>
              <button
                onClick={() => handlePermanentDelete(Array.from(selectedReports))}
                disabled={processing}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Trashed Reports Table */}
      <Card>
        {trashedReports.length === 0 ? (
          <div className="py-8 md:py-12 text-center">
            <Trash2 className="w-10 md:w-12 h-10 md:h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm md:text-base text-gray-500">Trash is empty</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                {paginatedReports.map((report) => (
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {paginatedReports.map((report) => {
              const isExpanded = expandedReport === report.id;
              return (
                <div key={report.id} className="bg-white">
                  {/* Report Header */}
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-semibold text-gray-600 truncate leading-none">
                          {report.report_code || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 truncate leading-none mt-0.5">
                          {report.deleted_at ? formatDate(report.deleted_at, 'PP') : '-'}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1 border-t border-gray-100 bg-gray-50">
                      <div className="pt-1.5">
                        <p className="text-xs font-semibold text-gray-900 truncate">{report.company_name}</p>
                        <p className="text-xs text-gray-500 truncate">{report.form_name}</p>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Tech:</span> {report.technician_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Photos:</span> {report.photo_count || 0}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 pt-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore([report.id]);
                          }}
                          disabled={processing}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDelete([report.id]);
                          }}
                          disabled={processing}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Del
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between px-2 md:px-0">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
          </>
        )}
      </Card>
    </div>
  );
}
