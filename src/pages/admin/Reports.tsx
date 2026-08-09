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
import { FileText, Search, Download, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ReportSummary } from '@/types';
import { formatDate } from '@/utils/dateUtils';

export default function ReportsPage() {
  const { reportSummaries, setReportSummaries, loading, setLoading } = useReportStore();
  const { confirm, alert } = useConfirm();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

    return matchesSearch && matchesStatus && matchesDate;
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Search - takes more space */}
            <div className="lg:col-span-5">
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
            
            {/* Status Filter */}
            <div className="lg:col-span-2">
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
            
            {/* Date Filter */}
            <div className="lg:col-span-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            
            {/* Custom Date Inputs */}
            {dateFilter === 'custom' && (
              <>
                <div className="lg:col-span-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
                    placeholder="From"
                  />
                </div>
                <div className="lg:col-span-1.5">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
                    placeholder="To"
                  />
                </div>
              </>
            )}
            
            {/* Clear Button */}
            {(dateFilter !== 'all' || statusFilter || searchTerm) && (
              <div className={dateFilter === 'custom' ? 'lg:col-span-12' : 'lg:col-span-3'}>
                <button
                  onClick={() => {
                    setDateFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setStatusFilter('');
                    setSearchTerm('');
                  }}
                  className="w-full lg:w-auto px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {filteredReports.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filteredReports.length > 0 && selectedReports.size === filteredReports.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All
                </span>
              </label>
              {selectedReports.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedReports.size} selected
                </span>
              )}
            </div>

            {selectedReports.size > 0 && (
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                disabled={processing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Move to Trash ({selectedReports.size})
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Reports Table */}
      <Card>
        <div className="overflow-x-auto">
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
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                filteredReports.map((report) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.created_at, 'PP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
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
