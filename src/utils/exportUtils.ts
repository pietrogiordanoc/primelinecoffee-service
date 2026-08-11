import * as XLSX from 'xlsx';
import type { ReportSummary } from '@/types';
import { format } from 'date-fns';

export interface ExportOptions {
  format: 'xlsx' | 'csv';
  filename?: string;
  includeHeaders?: boolean;
}

/**
 * Export reports to Excel or CSV (client-side, no backend needed)
 * @param reports - Array of ReportSummary to export
 * @param options - Export options (format, filename, etc.)
 */
export function exportReportsToFile(
  reports: ReportSummary[],
  options: ExportOptions = { format: 'xlsx', includeHeaders: true }
): void {
  if (!reports || reports.length === 0) {
    throw new Error('No reports to export');
  }

  // Transform data to flat structure for Excel/CSV
  const exportData = reports.map((report) => ({
    'Report Code': report.report_code || 'N/A',
    'Form Type': report.form_name || 'N/A',
    'Company': report.company_name || 'N/A',
    'Technician Name': report.technician_name || 'N/A',
    'Technician Email': report.technician_email || 'N/A',
    'Sales Rep Name': report.sales_rep_name || 'N/A',
    'Sales Rep Email': report.sales_rep_email || 'N/A',
    'Status': report.status || 'N/A',
    'Created Date': report.created_at 
      ? format(new Date(report.created_at), 'yyyy-MM-dd HH:mm:ss')
      : 'N/A',
    'Submitted Date': report.submitted_at
      ? format(new Date(report.submitted_at), 'yyyy-MM-dd HH:mm:ss')
      : 'Not Submitted',
    'Photo Count': report.photo_count || 0,
  }));

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // Report Code
    { wch: 30 }, // Form Type
    { wch: 25 }, // Company
    { wch: 20 }, // Technician Name
    { wch: 30 }, // Technician Email
    { wch: 20 }, // Sales Rep Name
    { wch: 30 }, // Sales Rep Email
    { wch: 12 }, // Status
    { wch: 20 }, // Created Date
    { wch: 20 }, // Submitted Date
    { wch: 12 }, // Photo Count
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Reports');

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  const defaultFilename = `Service_Reports_${timestamp}`;
  const filename = options.filename || defaultFilename;

  // Export file based on format
  if (options.format === 'csv') {
    XLSX.writeFile(workbook, `${filename}.csv`, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, `${filename}.xlsx`, { bookType: 'xlsx' });
  }
}

/**
 * Get unique values from reports for filter dropdowns
 */
export function getUniqueFilterValues(reports: ReportSummary[]): {
  companies: string[];
  technicians: string[];
  salesReps: string[];
  forms: string[];
} {
  const companies = new Set<string>();
  const technicians = new Set<string>();
  const salesReps = new Set<string>();
  const forms = new Set<string>();

  reports.forEach((report) => {
    if (report.company_name) companies.add(report.company_name);
    if (report.technician_name) technicians.add(report.technician_name);
    if (report.sales_rep_name) salesReps.add(report.sales_rep_name);
    if (report.form_name) forms.add(report.form_name);
  });

  return {
    companies: Array.from(companies).sort(),
    technicians: Array.from(technicians).sort(),
    salesReps: Array.from(salesReps).sort(),
    forms: Array.from(forms).sort(),
  };
}
