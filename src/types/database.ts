// Generated types for Supabase database schema

export type UserRole = 'super_admin' | 'admin' | 'technician';
export type ReportStatus = 'draft' | 'submitted' | 'reviewed' | 'completed';
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'signature'
  | 'file';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      technicians: {
        Row: {
          id: string;
          user_id: string;
          employee_id: string | null;
          specialization: string | null;
          certifications: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_id?: string | null;
          specialization?: string | null;
          certifications?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          employee_id?: string | null;
          specialization?: string | null;
          certifications?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      technician_companies: {
        Row: {
          id: string;
          technician_id: string;
          company_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          technician_id: string;
          company_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          technician_id?: string;
          company_id?: string;
          assigned_at?: string;
        };
      };
      dynamic_forms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          is_active: boolean;
          version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?: string | null;
          is_active?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          is_active?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      form_fields: {
        Row: {
          id: string;
          form_id: string;
          field_name: string;
          field_label: string;
          field_type: FieldType;
          placeholder: string | null;
          default_value: string | null;
          options: Record<string, any> | null;
          validation_rules: Record<string, any> | null;
          conditional_logic: Record<string, any> | null;
          order_index: number;
          is_required: boolean;
          help_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          field_name: string;
          field_label: string;
          field_type: FieldType;
          placeholder?: string | null;
          default_value?: string | null;
          options?: Record<string, any> | null;
          validation_rules?: Record<string, any> | null;
          conditional_logic?: Record<string, any> | null;
          order_index?: number;
          is_required?: boolean;
          help_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          field_name?: string;
          field_label?: string;
          field_type?: FieldType;
          placeholder?: string | null;
          default_value?: string | null;
          options?: Record<string, any> | null;
          validation_rules?: Record<string, any> | null;
          conditional_logic?: Record<string, any> | null;
          order_index?: number;
          is_required?: boolean;
          help_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_reports: {
        Row: {
          id: string;
          form_id: string;
          technician_id: string;
          company_id: string;
          status: ReportStatus;
          form_data: Record<string, any>;
          signature_url: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          technician_id: string;
          company_id: string;
          status?: ReportStatus;
          form_data: Record<string, any>;
          signature_url?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          technician_id?: string;
          company_id?: string;
          status?: ReportStatus;
          form_data?: Record<string, any>;
          signature_url?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      report_photos: {
        Row: {
          id: string;
          report_id: string;
          file_url: string;
          thumbnail_url: string | null;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          caption: string | null;
          order_index: number;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          file_url: string;
          thumbnail_url?: string | null;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          caption?: string | null;
          order_index?: number;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          file_url?: string;
          thumbnail_url?: string | null;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          caption?: string | null;
          order_index?: number;
          uploaded_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Record<string, any> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Record<string, any> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Record<string, any> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          report_id: string | null;
          recipient_email: string;
          subject: string;
          sent_at: string;
          status: string;
          error_message: string | null;
          resend_id: string | null;
        };
        Insert: {
          id?: string;
          report_id?: string | null;
          recipient_email: string;
          subject: string;
          sent_at?: string;
          status?: string;
          error_message?: string | null;
          resend_id?: string | null;
        };
        Update: {
          id?: string;
          report_id?: string | null;
          recipient_email?: string;
          subject?: string;
          sent_at?: string;
          status?: string;
          error_message?: string | null;
          resend_id?: string | null;
        };
      };
      system_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: Record<string, any>;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: Record<string, any>;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: Record<string, any>;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      report_summary: {
        Row: {
          id: string;
          status: ReportStatus;
          created_at: string;
          submitted_at: string | null;
          form_name: string;
          company_name: string;
          technician_name: string;
          technician_email: string;
          photo_count: number;
        };
      };
    };
  };
}
