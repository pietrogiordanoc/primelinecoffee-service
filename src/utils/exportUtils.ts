import * as XLSX from 'xlsx';
import type { ReportSummary, ServiceReport } from '@/types';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

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
 * Export reports with form data fields (requires specific form filter)
 * @param reportIds - Array of report IDs to export
 * @param formName - Name of the form (for filename)
 * @param options - Export options (format, filename, etc.)
 */
export async function exportReportsWithFormData(
  reportIds: string[],
  formName: string,
  options: ExportOptions = { format: 'xlsx', includeHeaders: true }
): Promise<void> {
  if (!reportIds || reportIds.length === 0) {
    throw new Error('No reports to export');
  }

  // Load complete reports with form_data
  const { data: reports, error } = await supabase
    .from('service_reports')
    .select(`
      *,
      form:dynamic_forms(name),
      company:companies(name),
      technician:technicians!left(user:users(full_name, email)),
      sales_representative:users!sales_representative_id(full_name, email)
    `)
    .in('id', reportIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!reports || reports.length === 0) {
    throw new Error('No reports found');
  }

  // Collect all unique form fields that have values across all reports
  const formFieldsSet = new Set<string>();
  reports.forEach((report) => {
    if (report.form_data && typeof report.form_data === 'object') {
      Object.entries(report.form_data).forEach(([key, value]) => {
        // Only include fields with non-empty values
        if (value !== null && value !== undefined && value !== '' && value !== false) {
          formFieldsSet.add(key);
        }
      });
    }
  });

  const formFields = Array.from(formFieldsSet).sort();

  // Transform data to flat structure for Excel/CSV
  const exportData = reports.map((report) => {
    const row: Record<string, any> = {
      'Report Code': report.report_code || 'N/A',
      'Form Type': report.form?.name || 'N/A',
      'Company': report.company?.name || 'N/A',
      'Technician Name': report.technician?.user?.full_name || 'N/A',
      'Technician Email': report.technician?.user?.email || 'N/A',
      'Sales Rep Name': report.sales_representative?.full_name || 'N/A',
      'Sales Rep Email': report.sales_representative?.email || 'N/A',
      'Status': report.status || 'N/A',
      'Created Date': report.created_at 
        ? format(new Date(report.created_at), 'yyyy-MM-dd HH:mm:ss')
        : 'N/A',
      'Submitted Date': report.submitted_at
        ? format(new Date(report.submitted_at), 'yyyy-MM-dd HH:mm:ss')
        : 'Not Submitted',
    };

    // Add form data fields
    formFields.forEach((field) => {
      const value = report.form_data?.[field];
      
      // Format value based on type
      if (value === null || value === undefined || value === '') {
        row[field] = '';
      } else if (typeof value === 'boolean') {
        row[field] = value ? 'Yes' : 'No';
      } else if (Array.isArray(value)) {
        row[field] = value.join(', ');
      } else if (typeof value === 'object') {
        row[field] = JSON.stringify(value);
      } else {
        row[field] = value;
      }
    });

    return row;
  });

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const baseColumnWidths = [
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
  ];

  // Add widths for form fields (default 20 characters)
  const formFieldWidths = formFields.map(() => ({ wch: 20 }));
  worksheet['!cols'] = [...baseColumnWidths, ...formFieldWidths];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Reports');

  // Generate filename with form name and timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  const sanitizedFormName = formName.replace(/[^a-zA-Z0-9]/g, '_');
  const defaultFilename = `${sanitizedFormName}_Reports_${timestamp}`;
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
