# Service Type Integration Guide

## Overview
The dashboard statistics module has been updated to track and display service types (Service, Tune up, Delivery, Pick up, Training, Other). This guide explains how to complete the integration.

## What's Already Done ✅

1. **Dashboard Statistics Module** - Updated to show:
   - Pie chart with global service type distribution
   - Tables showing service type counts per technician and company
   - Color-coded columns for each service type:
     - Service: Green (#10b981)
     - Tune up: Amber (#f59e0b)
     - Delivery: Blue (#3b82f6)
     - Pick up: Purple (#8b5cf6)
     - Training: Pink (#ec4899)
     - Other: Indigo (#6366f1)

2. **Database Schema** - SQL file created (`supabase/add-service-type-column.sql`):
   - Adds `service_type` column to `service_reports` table
   - Includes check constraint for valid values
   - Adds index for performance

3. **Data Loading Functions** - Updated to:
   - Count service types per technician
   - Count service types per company
   - Calculate global service type statistics

## Next Steps 🔧

### 1. Run Database Migration
Execute the SQL migration in Supabase:

```bash
# Navigate to Supabase dashboard SQL editor and run:
# supabase/add-service-type-column.sql
```

Or connect via terminal:
```bash
psql <your-database-connection-string> -f supabase/add-service-type-column.sql
```

### 2. Add Service Type Field to Report Form

Update `src/pages/technician/FillReport.tsx` to include a service type selector:

**Add to form state (around line 50):**
```typescript
const [serviceType, setServiceType] = useState<string>('Service');
```

**Add selector in the form (before company/form selectors):**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Service Type *
  </label>
  <Select
    value={serviceType}
    onChange={(e) => setServiceType(e.target.value)}
    options={[
      { value: 'Service', label: 'Service' },
      { value: 'Tune up', label: 'Tune up' },
      { value: 'Delivery', label: 'Delivery' },
      { value: 'Pick up', label: 'Pick up' },
      { value: 'Training', label: 'Training' },
      { value: 'Other', label: 'Other' },
    ]}
    required
  />
</div>
```

**Include in report submission (in `handleSubmit` function):**
```typescript
const { error } = await supabase
  .from('service_reports')
  .insert({
    technician_id: user.id,
    company_id: selectedCompanyId,
    form_id: selectedFormId,
    service_type: serviceType,  // Add this line
    form_data: reportData,
    status: 'submitted',
  });
```

### 3. Update Types (Optional but Recommended)

Update `src/types/index.ts` to include service_type:

```typescript
export interface ServiceReport {
  id: string;
  technician_id: string;
  company_id: string;
  form_id: string;
  service_type?: 'Service' | 'Tune up' | 'Delivery' | 'Pick up' | 'Training' | 'Other';  // Add this
  form_data: Record<string, any>;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}
```

### 4. Test the Integration

1. Run the database migration
2. Add the service type field to the form
3. Create a test report with each service type
4. Verify that:
   - Reports are saved with the service_type value
   - Dashboard statistics update correctly
   - Charts display the new data
   - Tables show correct counts per technician/company

## Dashboard Features 📊

The statistics module now displays:

### By Technician View:
- **3 Charts:**
  1. Reports Distribution (pie chart)
  2. Media Usage (bar chart with photos/videos)
  3. Service Types Distribution (pie chart)
  
- **Table Columns:**
  - Technician | Reports | Service | Tune up | Delivery | Pick up | Training | Other | Photos | Videos

### By Company View:
- **3 Charts:**
  1. Reports by Company (pie chart)
  2. Media Usage by Company (bar chart)
  3. Service Types (pie chart)
  
- **Table Columns:**
  - Company | Reports | Service | Tune up | Delivery | Pick up | Training | Other | Photos | Videos

## Color Scheme 🎨

Each service type has a distinct color for easy identification:
- 🟢 Service: Green
- 🟠 Tune up: Amber
- 🔵 Delivery: Blue
- 🟣 Pick up: Purple
- 🩷 Training: Pink
- 🟦 Other: Indigo

## Notes 📝

- The field accepts NULL values for existing reports (backward compatibility)
- Default value when creating new reports should be 'Service'
- The dashboard will show "No service type data yet" until reports with service_type are created
- All text is in English as per project requirements
