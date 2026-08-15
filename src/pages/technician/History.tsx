import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { Clock, FileText, Eye, Trash2, Building2, ChevronRight, ChevronDown, Search, Calendar, Image as ImageIcon, ArrowUpDown, ChevronLeft, ChevronRight as ChevronRightIcon, Edit, FilePlus } from 'lucide-react';
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadReports();
  }, [userProfile]);

  async function loadReports() {
    try {
      setLoading(true);

      const { data: techData } = await supabase
        .from('technicians')
        .select('id, can_view_all_reports')
        .eq('user_id', userProfile?.id)
        .single();

      if (!techData) return;

      // Build query based on permission
      let query = supabase
        .from('report_summary')
        .select('*');

      // Only filter by technician email if they can't view all reports
      if (!techData.can_view_all_reports) {
        query = query.eq('technician_email', userProfile?.email);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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

  // Filter and sort reports
  const filteredReports = reports
    .filter(report => {
      // Search filter
      const matchesSearch = report.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.form_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const reportDate = new Date(report.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter === 'today') {
          matchesDate = reportDate >= today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = reportDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = reportDate >= monthAgo;
        } else if (dateFilter === 'custom' && (startDate || endDate)) {
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = reportDate >= start && reportDate <= end;
          } else if (startDate) {
            const start = new Date(startDate);
            matchesDate = reportDate >= start;
          } else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = reportDate <= end;
          }
        }
      }
      
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.company_name.localeCompare(b.company_name);
      } else {
        return b.company_name.localeCompare(a.company_name);
      }
    });

  // Separate drafts and submitted reports
  const draftReports = filteredReports.filter(r => r.status === 'draft');
  const submittedReports = filteredReports.filter(r => r.status !== 'draft');

  // Pagination (currently only for submitted reports)
  const totalPages = Math.ceil(submittedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = submittedReports.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder, itemsPerPage, dateFilter, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Search Bar - FIXED below header */}
      <div className="fixed top-[52px] left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm px-3 py-2">
        <div className="max-w-full md:max-w-[80%] md:mx-auto space-y-1.5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-bold text-gray-900">Reports</h1>
          </div>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs bg-white"
            />
          </div>
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  placeholder="To"
                />
              </>
            )}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-gray-500">
              {draftReports.length + submittedReports.length} total ({draftReports.length} drafts, {submittedReports.length} submitted)
            </span>
          </div>
        </div>
      </div>

      {/* Content - Padding for fixed search */}
      <div className="pt-[120px]">
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
        <>
          {/* DRAFTS SECTION */}
          {draftReports.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <FilePlus className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-semibold text-gray-900">Drafts ({draftReports.length})</h2>
              </div>
              <div className="space-y-1">
                {draftReports.map((report) => {
                  const isExpanded = expandedReport === report.id;
                  
                  return (
                    <div
                      key={report.id}
                      className="bg-amber-50 rounded border border-amber-200 hover:border-amber-300 transition-all"
                    >
                      {/* Draft Header */}
                      <div
                        className="flex items-center justify-between p-2 cursor-pointer"
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                              {report.company_name}
                            </p>
                            <p className="text-xs text-amber-600 leading-none mt-0.5">
                              Draft • {formatRelativeTime(report.created_at)}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1.5" />
                        )}
                      </div>

                      {/* Draft Details */}
                      {isExpanded && (
                        <div className="px-2 pb-1.5 space-y-1 border-t border-amber-200">
                          <div className="flex items-center gap-1 pt-1.5">
                            <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <p className="text-xs text-gray-900 leading-tight">{report.form_name}</p>
                          </div>
                          
                          {/* Action Buttons for Drafts */}
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`../report/${report.id}/edit`);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-xs font-medium"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Continue
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(report.id, report.company_name);
                              }}
                              disabled={deleting === report.id}
                              className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 hover:border-red-300 transition text-xs font-medium disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBMITTED REPORTS SECTION */}
          {submittedReports.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <FileText className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-semibold text-gray-900">Submitted Reports ({submittedReports.length})</h2>
              </div>
          <div className="space-y-1">
            {paginatedReports.map((report) => {
            const isExpanded = expandedReport === report.id;
            
            return (
              <div
                key={report.id}
                className="bg-white rounded border border-gray-200 hover:border-gray-300 transition-all"
              >
                {/* Report Header - Always Visible */}
                <div
                  className="flex items-center justify-between p-2 cursor-pointer"
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                        {report.company_name}
                      </p>
                      <p className="text-xs text-gray-400 leading-none mt-0.5">
                        {formatRelativeTime(report.created_at)}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
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
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1.5" />
                  )}
                </div>

                {/* Report Details - Expandable */}
                {isExpanded && (
                  <div className="px-2 pb-1.5 space-y-1 border-t border-gray-100">
                    <div className="flex items-center gap-1 pt-1.5">
                      <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-900 leading-tight">{report.form_name}</p>
                    </div>
                    {report.submitted_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 leading-tight">
                          {new Date(report.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })} {new Date(report.submitted_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    {report.photo_count > 0 && (
                      <div className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 leading-tight">
                          {report.photo_count} {report.photo_count === 1 ? 'photo' : 'photos'}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`../report/${report.id}/view`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`../report/${report.id}/amend`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-xs font-medium"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Amend
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
            </div>
          )}
        </>
      )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" />
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
              <ChevronRightIcon className="w-3 h-3" />
            </button>
          </div>
        )}
        </>
      )}
      </div> {/* End pt-16 wrapper */}
    </div>
  );
}
