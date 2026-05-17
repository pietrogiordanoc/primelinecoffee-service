-- =====================================================
-- SEED CF103 - Coffee Equipment Service Form
-- Creates a complete service form with all necessary fields
-- =====================================================

-- Insert the CF103 form
INSERT INTO public.dynamic_forms (id, name, description, category, is_active, version)
VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'CF103 - Equipment Service Report',
  'Complete service report for coffee equipment maintenance and repair',
  'Service Reports',
  true,
  1
);

-- Insert form fields for CF103

-- 1. Service Date
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, default_value, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'service_date',
  'Service Date',
  'date',
  null,
  null,
  true,
  1,
  'Date when service was performed'
);

-- 2. Technician Name
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'technician_name',
  'Technician Name',
  'text',
  'Enter technician name',
  true,
  2
);

-- 3. Customer Name
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'customer_name',
  'Customer Name',
  'text',
  'Enter customer name',
  true,
  3
);

-- 4. Customer Email
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'customer_email',
  'Customer Email',
  'email',
  'customer@email.com',
  false,
  4
);

-- 5. Property (Select)
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'property',
  'Property',
  'select',
  '["PLD", "La Colombe", "Owner"]'::jsonb,
  true,
  5,
  'Select property type'
);

-- 6. Service Type (Select)
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'service_type',
  'Service Type',
  'select',
  '["Preventive Maintenance", "Repair", "Installation", "Emergency", "Inspection", "Other"]'::jsonb,
  true,
  6
);

-- EQUIPMENT RECORDS SECTION HEADER
-- 7. Equipment Section Header (using textarea as a visual separator)
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_section',
  '=== EQUIPMENT RECORDS ===',
  'textarea',
  false,
  7,
  'Add details for each piece of equipment serviced'
);

-- 8. Equipment Brand
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_brand',
  'Equipment Brand',
  'text',
  'e.g., La Marzocco, Mazzer, Grindmaster',
  true,
  8
);

-- 9. Equipment Model
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_model',
  'Model',
  'text',
  'Model number or name',
  true,
  9
);

-- 10. Serial Number
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_serial',
  'Serial Number',
  'text',
  'Serial number',
  false,
  10
);

-- 11. Problem Description
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_problem',
  'Problem / Issue Reported',
  'textarea',
  'Describe the problem or issue',
  true,
  11,
  'Detail what the customer reported or what you observed'
);

-- 12. Work Performed
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_work_performed',
  'Work Performed / Solution',
  'textarea',
  'Describe work performed',
  true,
  12,
  'Explain what repairs or maintenance you completed'
);

-- 13. Labor Hours
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, validation_rules, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_hours',
  'Labor Hours',
  'number',
  '0.0',
  '{"min": 0, "max": 24}'::jsonb,
  true,
  13
);

-- 14. Parts Used (as textarea for now, could be improved)
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_parts_used',
  'Parts Used',
  'textarea',
  'List parts used (one per line): Part Name - Quantity - Price',
  false,
  14,
  'Example: O-Ring Seal - 2 - $12.50'
);

-- 15. Equipment Photos
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'equipment_photos',
  'Equipment Photos',
  'file',
  false,
  15,
  'Take photos of equipment, work performed, and any issues'
);

-- ADDITIONAL NOTES SECTION
-- 16. Additional Notes
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'additional_notes',
  'Additional Notes / Recommendations',
  'textarea',
  'Any additional notes, recommendations, or follow-up needed',
  false,
  16,
  'Include any recommendations for future service or customer instructions'
);

-- 17. Technician Signature
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  'technician_signature',
  'Technician Signature',
  'signature',
  true,
  17,
  'Sign to confirm work completion'
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- The CF103 form has been created with 17 fields covering:
-- - General service information (date, names, emails)
-- - Service details (property, type)
-- - Equipment details (brand, model, serial)
-- - Problem and solution documentation
-- - Labor hours tracking
-- - Parts inventory
-- - Photo documentation
-- - Additional notes
-- - Signature
-- =====================================================
