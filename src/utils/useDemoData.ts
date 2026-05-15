import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useFormStore } from '@/stores/formStore';
import { useReportStore } from '@/stores/reportStore';

/**
 * Hook to load demo data into all stores
 * Runs automatically when the user is in demo mode
 */
export function useDemoData() {
  const { isDemoMode } = useAuthStore();
  const { loadDemoData: loadCompanies, companies } = useCompanyStore();
  const { loadDemoData: loadTechnicians, technicians } = useTechnicianStore();
  const { loadDemoData: loadForms, forms } = useFormStore();
  const { loadDemoData: loadReports, reports } = useReportStore();

  useEffect(() => {
    if (isDemoMode) {
      // Load demo data only if not already loaded
      if (companies.length === 0) loadCompanies();
      if (technicians.length === 0) loadTechnicians();
      if (forms.length === 0) loadForms();
      if (reports.length === 0) loadReports();
    }
  }, [isDemoMode, companies.length, technicians.length, forms.length, reports.length, loadCompanies, loadTechnicians, loadForms, loadReports]);

  return { isDemoMode };
}
