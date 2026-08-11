# Fix Public Link Access in Incognito Mode

## Problem
The public report link (`/report-photos/:id`) doesn't work in incognito mode because Supabase Row Level Security (RLS) policies require authentication.

## Solution
Add RLS policies that allow anonymous (unauthenticated) users to read service reports and photos.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/add-public-report-access.sql`
5. Click **Run** (or press Ctrl+Enter)
6. You should see success message with the policy list

### Option 2: Supabase CLI
```bash
supabase db push --include-all
```

## What This Does
- Adds a policy: "Public can view service reports" - allows anonymous SELECT on service_reports
- Adds a policy: "Public can view report photos" - allows anonymous SELECT on report_photos
- These policies have `USING (true)` which means they apply to all rows
- **Important:** These are READ-ONLY (SELECT) policies, anonymous users CANNOT:
  - Create reports
  - Update reports
  - Delete reports
  - Upload photos

## Security
✅ Safe - Only allows reading public data
✅ No write access for anonymous users
✅ Existing authentication policies still apply for authenticated users
✅ Admins and technicians keep all their existing permissions

## Testing
After applying the policy:
1. Copy a report public link: `https://your-site.com/report-photos/report-id`
2. Open an **Incognito/Private** browser window
3. Paste the link
4. The report should load with all photos visible ✓

## Rollback
If you need to remove these policies:
```sql
DROP POLICY "Public can view service reports" ON public.service_reports;
DROP POLICY "Public can view report photos" ON public.report_photos;
```
