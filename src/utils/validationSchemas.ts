import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'technician']),
});

// Company schemas
export const companySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Technician schemas
export const technicianSchema = z.object({
  user_id: z.string().uuid(),
  employee_id: z.string().optional(),
  specialization: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
});

// Form schemas
export const dynamicFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const formFieldSchema = z.object({
  form_id: z.string().uuid(),
  field_name: z.string().min(1, 'El nombre del campo es requerido'),
  field_label: z.string().min(1, 'La etiqueta es requerida'),
  field_type: z.enum([
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'date',
    'time',
    'datetime',
    'select',
    'radio',
    'checkbox',
    'signature',
    'file',
  ]),
  placeholder: z.string().optional(),
  default_value: z.string().optional(),
  options: z.any().optional(),
  validation_rules: z.any().optional(),
  conditional_logic: z.any().optional(),
  order_index: z.number().default(0),
  is_required: z.boolean().default(false),
  help_text: z.string().optional(),
});

// Report schemas
export const serviceReportSchema = z.object({
  form_id: z.string().uuid(),
  technician_id: z.string().uuid(),
  company_id: z.string().uuid(),
  status: z.enum(['draft', 'submitted', 'reviewed', 'completed']).default('draft'),
  form_data: z.record(z.any()),
  signature_url: z.string().optional(),
  notes: z.string().optional(),
});

// Settings schemas
export const systemSettingsSchema = z.object({
  setting_key: z.string(),
  setting_value: z.any(),
  description: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type TechnicianInput = z.infer<typeof technicianSchema>;
export type DynamicFormInput = z.infer<typeof dynamicFormSchema>;
export type FormFieldInput = z.infer<typeof formFieldSchema>;
export type ServiceReportInput = z.infer<typeof serviceReportSchema>;
