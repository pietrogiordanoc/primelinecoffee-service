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
import { FileText, Search, Download, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import type { ReportSummary } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { exportReportsToFile, exportReportsWithFormData, getUniqueFilterValues } from '@/utils/exportUtils';

export default function ReportsPage() {
  const { reportSummaries, setReportSummaries, loading, setLoading } = useReportStore();
  const { confirm, alert } = useConfirm();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    loadReports();
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    }
    
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

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
      title: 'Move to Trash',
      message: `Move the report from ${companyName} to trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      danger: true,
    });
    
    if (!confirmed) return;

    try {
      setDeleting(reportId);

      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('service_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      await alert('Error moving report to trash. Please try again.', 'Error');
    } finally {
      setDeleting(null);
    }
  }

  async function handleBulkDelete() {
    if (selectedReports.size === 0) return;

    const confirmed = await confirm({
      title: 'Move to Trash',
      message: `Move ${selectedReports.size} report(s) to trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('service_reports')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', Array.from(selectedReports));

      if (error) throw error;

      await alert(`${selectedReports.size} report(s) moved to trash`, 'Success');
      setSelectedReports(new Set());
      await loadReports();
    } catch (error) {
      console.error('Error bulk deleting reports:', error);
      await alert('Error moving reports to trash. Please try again.', 'Error');
    } finally {
      setProcessing(false);
    }
  }

  function toggleSelectAll() {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map(r => r.id)));
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

  function handleView(reportId: string) {
    navigate(`/admin/reports/${reportId}`);
  }

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  function getSortIcon(column: string) {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-primary-600" />
      : <ArrowDown className="w-4 h-4 text-primary-600" />;
  }

  const filteredReports = reportSummaries.filter((report) => {
    const matchesSearch =
      report.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.report_code && report.report_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || report.status === statusFilter;
    const matchesCompany = !companyFilter || report.company_name === companyFilter;
    const matchesTechnician = !technicianFilter || report.technician_name === technicianFilter;
    const matchesSalesRep = !salesRepFilter || report.sales_rep_name === salesRepFilter;
    const matchesForm = !formFilter || report.form_name === formFilter;

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

    return matchesSearch && matchesStatus && matchesCompany && matchesTechnician && matchesSalesRep && matchesForm && matchesDate;
  })
  .sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'report_code':
        aValue = a.report_code || '';
        bValue = b.report_code || '';
        break;
      case 'company_name':
        aValue = a.company_name.toLowerCase();
        bValue = b.company_name.toLowerCase();
        break;
      case 'technician_name':
        aValue = a.technician_name.toLowerCase();
        bValue = b.technician_name.toLowerCase();
        break;
      case 'sales_rep_name':
        aValue = (a.sales_rep_name || '').toLowerCase();
        bValue = (b.sales_rep_name || '').toLowerCase();
        break;
      case 'form_name':
        aValue = a.form_name.toLowerCase();
        bValue = b.form_name.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, companyFilter, technicianFilter, salesRepFilter, formFilter, dateFilter, sortColumn, sortDirection]);

  // Get unique values for filter dropdowns
  const filterOptions = getUniqueFilterValues(reportSummaries);

  // Export handlers
  async function handleExportExcel() {
    try {
      // If a specific form is filtered, export with form data fields
      if (formFilter) {
        const reportIds = filteredReports.map(r => r.id);
        await exportReportsWithFormData(reportIds, formFilter, { format: 'xlsx' });
      } else {
        // Otherwise, export summary only
        exportReportsToFile(filteredReports, { format: 'xlsx' });
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export reports', 'Error');
    }
  }

  async function handleExportCSV() {
    try {
      // If a specific form is filtered, export with form data fields
      if (formFilter) {
        const reportIds = filteredReports.map(r => r.id);
        await exportReportsWithFormData(reportIds, formFilter, { format: 'csv' });
      } else {
        // Otherwise, export summary only
        exportReportsToFile(filteredReports, { format: 'csv' });
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export reports', 'Error');
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Service Reports</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Review and manage technical reports</p>
        </div>
      </div>

      {/* Filters & Pagination */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500"
          />
        </div>
        
        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
        >
          <option value="">Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="completed">Completed</option>
        </select>
        
        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        
        {/* Company Filter */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
        >
          <option value="">All Customers</option>
          {filterOptions.companies.map((company) => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>
        
        {/* Technician Filter */}
        <select
          value={technicianFilter}
          onChange={(e) => setTechnicianFilter(e.target.value)}
          className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
        >
          <option value="">All Technicians</option>
          {filterOptions.technicians.map((tech) => (
            <option key={tech} value={tech}>{tech}</option>
          ))}
        </select>
        
        {/* Sales Rep Filter */}
        <select
          value={salesRepFilter}
          onChange={(e) => setSalesRepFilter(e.target.value)}
          className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
        >
          <option value="">All Sales Reps</option>
          {filterOptions.salesReps.map((rep) => (
            <option key={rep} value={rep}>{rep}</option>
          ))}
        </select>
        
        {/* Form Filter */}
        <select
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value)}
          className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
        >
          <option value="">All Forms</option>
          {filterOptions.forms.map((form) => (
            <option key={form} value={form}>{form}</option>
          ))}
        </select>
        
        {/* Export Button with Dropdown */}
        <div className="relative export-menu-container">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={filteredReports.length === 0}
            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium"
          >
            <FileSpreadsheet className="w-3 h-3" />
            Export
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <button
                onClick={handleExportExcel}
                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-3 h-3" />
                Excel (.xlsx)
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2 border-t"
              >
                <FileText className="w-3 h-3" />
                CSV (.csv)
              </button>
            </div>
          )}
        </div>
        
        {/* Items per page & count */}
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-1.5 py-1 border border-gray-300 rounded bg-white text-xs"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-gray-500">
            {filteredReports.length} total
          </span>
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredReports.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filteredReports.length > 0 && selectedReports.size === filteredReports.length}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">
              Select All
            </span>
          </label>
          {selectedReports.size > 0 && (
            <>
              <span className="text-xs text-gray-600">
                {selectedReports.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={processing}
                className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Reports Table */}
      <Card>
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No reports found
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
                    checked={filteredReports.length > 0 && selectedReports.size === filteredReports.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('report_code')}
                >
                  <div className="flex items-center gap-2">
                    Code
                    {getSortIcon('report_code')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-2">
                    Company
                    {getSortIcon('company_name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('technician_name')}
                >
                  <div className="flex items-center gap-2">
                    Technician
                    {getSortIcon('technician_name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('sales_rep_name')}
                >
                  <div className="flex items-center gap-2">
                    Sales Rep
                    {getSortIcon('sales_rep_name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('form_name')}
                >
                  <div className="flex items-center gap-2">
                    Form
                    {getSortIcon('form_name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photos
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No reports found
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => (
                  <tr 
                    key={report.id} 
                    onClick={() => handleView(report.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(report.id)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id, report.company_name)}
                          disabled={deleting === report.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.created_at, 'PP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono font-semibold text-primary-600">
                        {report.report_code || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.technician_name}</div>
                      <div className="text-sm text-gray-500">{report.technician_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.sales_rep_name ? (
                        <>
                          <div className="text-sm text-gray-900">{report.sales_rep_name}</div>
                          <div className="text-sm text-gray-500">{report.sales_rep_email}</div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {paginatedReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No reports found
            </div>
          ) : (
            paginatedReports.map((report) => {
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
                        <p className="text-xs font-mono font-semibold text-primary-600 truncate leading-none">
                          {report.report_code || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 truncate leading-none mt-0.5">
                          {formatDate(report.created_at, 'PP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          report.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : report.status === 'reviewed'
                            ? 'bg-blue-100 text-blue-700'
                            : report.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {report.status.slice(0,3)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
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
                      {report.sales_rep_name && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Sales:</span> {report.sales_rep_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Photos:</span> {report.photo_count || 0}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 pt-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(report.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id, report.company_name);
                          }}
                          disabled={deleting === report.id}
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
            })
          )}
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
