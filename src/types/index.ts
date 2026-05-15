import type { UserRole, ReportStatus, FieldType } from './database';

// Extended types for application use

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: string;
  user_id: string;
  employee_id?: string;
  specialization?: string;
  certifications?: string[];
  is_active: boolean;
  user?: User;
  assigned_companies?: Company[];
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DynamicForm {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  version: number;
  created_by?: string;
  fields?: FormField[];
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  form_id: string;
  field_name: string;
  field_label: string;
  field_type: FieldType;
  placeholder?: string;
  default_value?: string;
  options?: SelectOption[] | string[];
  validation_rules?: ValidationRules;
  conditional_logic?: ConditionalLogic;
  order_index: number;
  is_required: boolean;
  help_text?: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
}

export interface ConditionalLogic {
  show_if?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

export interface ServiceReport {
  id: string;
  form_id: string;
  technician_id: string;
  company_id: string;
  status: ReportStatus;
  form_data: Record<string, any>;
  signature_url?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  form?: DynamicForm;
  technician?: Technician;
  company?: Company;
  photos?: ReportPhoto[];
}

export interface ReportPhoto {
  id: string;
  report_id: string;
  file_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  caption?: string;
  order_index: number;
  uploaded_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
  user?: User;
}

export interface DashboardStats {
  total_reports: number;
  pending_reports: number;
  completed_reports: number;
  total_technicians: number;
  total_companies: number;
  reports_this_month: number;
  reports_this_week: number;
}

export interface ReportSummary {
  id: string;
  status: ReportStatus;
  created_at: string;
  submitted_at?: string;
  form_name: string;
  company_name: string;
  technician_name: string;
  technician_email: string;
  photo_count: number;
}

// Form Builder types
export interface FormBuilderField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  options?: SelectOption[];
  required: boolean;
  helpText?: string;
  validation?: ValidationRules;
  conditional?: ConditionalLogic;
}

// Photo optimization settings
export interface PhotoOptimizationSettings {
  max_width: number;
  max_height: number;
  quality: number;
  max_size_mb: number;
}

export interface OptimizedPhoto {
  file: File;
  url: string;
  thumbnail?: string;
  originalSize: number;
  optimizedSize: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  per_page: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Email types
export interface EmailTemplate {
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: string;
  path?: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  report_id?: string;
}

export * from './database';
