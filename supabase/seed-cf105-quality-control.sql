-- =====================================================
-- SEED CF105 - Quality Control Form
-- Quality control and evaluation form for coffee equipment
-- =====================================================

-- Insert the CF105 form
INSERT INTO public.dynamic_forms (id, name, description, category, is_active, version)
VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'CF105 - Quality Control',
  'Quality control and evaluation form for coffee equipment parameters',
  'Quality Control',
  true,
  1
);

-- ===== GENERAL INFORMATION SECTION =====

-- 1. Account Name
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'account_name',
  'Account Name',
  'text',
  'Enter account name',
  true,
  1
);

-- 2. Street Address
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'street_address',
  'Street Address',
  'text',
  'Street Address',
  true,
  2
);

-- 3. Street Address Line 2
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'street_address_2',
  'Street Address Line 2',
  'text',
  'Apt, Suite, Unit, etc.',
  false,
  3
);

-- 4. City
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'city',
  'City',
  'text',
  'City',
  true,
  4
);

-- 5. State
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'state',
  'State',
  'select',
  '["FL", "NY", "CA", "TX", "GA", "IL", "PA", "OH", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MD", "WI", "CO", "MN", "SC", "AL", "LA", "KY", "OR", "OK", "CT", "UT", "IA", "NV", "AR", "MS", "KS", "NM", "NE", "ID", "WV", "HI", "NH", "ME", "RI", "MT", "DE", "SD", "ND", "AK", "VT", "WY", "DC"]'::jsonb,
  true,
  5
);

-- 6. Postal/Zip Code
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'zip_code',
  'Postal / Zip Code',
  'text',
  'Zip Code',
  true,
  6
);

-- 7. Country
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, default_value, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'country',
  'Country',
  'select',
  '["United States", "Canada", "Mexico"]'::jsonb,
  'United States',
  true,
  7
);

-- 8. Equipment Location
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'equipment_location',
  'Equipment Location',
  'text',
  'Specific location within premises',
  true,
  8,
  'e.g., Front Counter, Kitchen, Cafe Area'
);

-- 9. Contact
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'contact_name',
  'Contact',
  'text',
  'Contact person name',
  false,
  9
);

-- 10. Phone
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'contact_phone',
  'Phone',
  'phone',
  '(555) 123-4567',
  false,
  10
);

-- ===== ESPRESSO SECTION =====

-- 11. Section Header - ESPRESSO
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_section_header',
  '=== ESPRESSO ===',
  'textarea',
  false,
  11,
  'Espresso machine quality control parameters'
);

-- 12. Espresso - Coffee Type
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_coffee_type',
  'Coffee Type',
  'select',
  '["Kimbo", "La Colombe", "Hausbrandt", "Beans", "Fractional Pack", "Capsules", "Paper Pods", "Cold Brew"]'::jsonb,
  false,
  12
);

-- 13. Espresso - Machine Model
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_machine_model',
  'Machine Model',
  'text',
  'Espresso machine model',
  false,
  13
);

-- 14. Espresso - Machine Serial
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_machine_serial',
  'Serial',
  'text',
  'Machine serial number',
  false,
  14
);

-- 15. Espresso - Grinder Model
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_grinder_model',
  'Grinder Model',
  'text',
  'Grinder model',
  false,
  15
);

-- 16. Espresso - Grinder Serial
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_grinder_serial',
  'Serial',
  'text',
  'Grinder serial number',
  false,
  16
);

-- 17. Grind Out Time - Single Seconds
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'grind_time_single',
  'Grind Out Time - Single (Seconds)',
  'number',
  '0',
  false,
  17,
  'Time in seconds for single shot grind'
);

-- 18. Grind Out Time - Double Seconds
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'grind_time_double',
  'Grind Out Time - Double (Seconds)',
  'number',
  '0',
  false,
  18,
  'Time in seconds for double shot grind'
);

-- 19. Coffee Dose - Status
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_dose_status',
  'Coffee Dose',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  19,
  'Ground Coffee Dose: 7g ±0.5g (single), 14g ±0.5g (double)'
);

-- 20. Water Temperature - Espresso
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_water_temp_status',
  'Water Temperature',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  20,
  'Water Temperature: 92°C ±2°C = 194°-201°F'
);

-- 21. Water Temperature Value
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_water_temp_value',
  'Temperature Reading',
  'text',
  'C/F',
  false,
  21,
  'Record actual temperature if adjusted'
);

-- 22. Pump Pressure
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'pump_pressure_status',
  'Pump Pressure',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  22,
  'Pump Pressure: 9 Bar ±0.5 bar = 8.5-9.5 bar'
);

-- 23. Pump Pressure Value
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'pump_pressure_value',
  'Bar Reading',
  'text',
  'Bar.',
  false,
  23
);

-- 24. Extraction Time
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'extraction_time_status',
  'Extraction Time',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  24,
  '5" + 25-30" (25-30 seconds after pre-infusion)'
);

-- 25. Espresso Volume
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_volume_status',
  'Espresso Volume',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  25,
  '25 ml ±5 ml = 20-30 ml'
);

-- 26. Water Filter Date - Espresso
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_filter_date',
  'Water Filter Date',
  'date',
  'MM/DD/YYYY',
  false,
  26
);

-- 27. Water Filter Status - Espresso
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'espresso_filter_status',
  'Filter Status',
  'select',
  '["Ok", "Need Replacement"]'::jsonb,
  false,
  27
);

-- ===== COFFEE (BATCH BREWER) SECTION =====

-- 28. Section Header - COFFEE
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_section_header',
  '=== COFFEE (Batch Brewer) ===',
  'textarea',
  false,
  28,
  'Coffee/batch brewer quality control parameters'
);

-- 29. Coffee - Coffee Type
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_type',
  'Coffee Type',
  'select',
  '["Kimbo", "La Colombe", "Hausbrandt", "Beans", "Fractional Pack", "Cold Brew"]'::jsonb,
  false,
  29
);

-- 30. Coffee - Machine Model
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_machine_model',
  'Machine Model',
  'text',
  'Coffee machine model',
  false,
  30
);

-- 31. Coffee - Machine Serial
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_machine_serial',
  'Serial',
  'text',
  'Machine serial number',
  false,
  31
);

-- 32. Coffee - Grinder Model
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_grinder_model',
  'Grinder Model',
  'text',
  'Grinder model',
  false,
  32
);

-- 33. Coffee - Grinder Serial
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_grinder_serial',
  'Serial',
  'text',
  'Grinder serial number',
  false,
  33
);

-- 34. Water Temperature - Coffee
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_water_temp_status',
  'Water Temperature',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  34,
  'Water Temperature: 200°-205°F from water spout'
);

-- 35. Coffee Water Temperature Value
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_water_temp_value',
  'Temperature Reading',
  'text',
  'C/F',
  false,
  35
);

-- 36. Water Volume
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'water_volume_status',
  'Water Volume',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  36,
  'Measured in ounces. Refer to quality parameter sheet for batch volumes'
);

-- 37. Coffee Dose - Batch
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'batch_coffee_dose_status',
  'Coffee Dose',
  'select',
  '["Ok", "Adjusted"]'::jsonb,
  false,
  37,
  'Measured in seconds/grams. Refer to quality parameter sheets for batch volumes'
);

-- 38. Water Filter Date - Coffee
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_filter_date',
  'Water Filter Date',
  'date',
  'MM/DD/YYYY',
  false,
  38
);

-- 39. Water Filter Status - Coffee
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  options, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'coffee_filter_status',
  'Filter Status',
  'select',
  '["Ok", "Need Replacement"]'::jsonb,
  false,
  39
);

-- ===== FINAL SECTION =====

-- 40. Prime Line Representative
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  placeholder, is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'representative_name',
  'Prime Line Representative',
  'text',
  'Technician name',
  false,
  40
);

-- 41. Date
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'service_date',
  'Date',
  'date',
  true,
  41
);

-- 42. Upload Photos
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'photos',
  'Upload Photos',
  'file',
  false,
  42,
  'Take photos of equipment and readings'
);

-- 43. Customer Signature
INSERT INTO public.form_fields (
  form_id, field_name, field_label, field_type, 
  is_required, order_index, help_text
) VALUES (
  '00000000-0000-0000-0000-000000000105'::uuid,
  'customer_signature',
  'Customer Signature',
  'signature',
  true,
  43,
  'Customer signature to acknowledge quality control evaluation'
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- The CF105 Quality Control form has been created with 43 fields:
-- - General information (account, address, contact)
-- - Espresso machine parameters (12 fields)
-- - Coffee/batch brewer parameters (12 fields)
-- - Representative info, date, photos, and signature
-- =====================================================
