import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useTechnicianStore } from '@/stores/technicianStore';
import { useFormStore } from '@/stores/formStore';
import { useReportStore } from '@/stores/reportStore';

/**
 * Hook para cargar datos demo en todos los stores
 * Se ejecuta automáticamente cuando el usuario está en modo demo
 */
export function useDemoData() {
  const { isDemoMode } = useAuthStore();
  const { loadDemoData: loadCompanies, companies } = useCompanyStore();
  const { loadDemoData: loadTechnicians, technicians } = useTechnicianStore();
  const { loadDemoData: loadForms, forms } = useFormStore();
  const { loadDemoData: loadReports, reports } = useReportStore();

  useEffect(() => {
    if (isDemoMode) {
      // Cargar datos demo solo si no están ya cargados
      if (companies.length === 0) loadCompanies();
      if (technicians.length === 0) loadTechnicians();
      if (forms.length === 0) loadForms();
      if (reports.length === 0) loadReports();
    }
  }, [isDemoMode, companies.length, technicians.length, forms.length, reports.length, loadCompanies, loadTechnicians, loadForms, loadReports]);

  return { isDemoMode };
}
