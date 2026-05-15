import { create } from 'zustand';
import type { ServiceReport, ReportSummary } from '@/types';
import { demoReports, getReportSummaries } from '@/utils/demoData';

interface ReportState {
  reports: ServiceReport[];
  reportSummaries: ReportSummary[];
  currentReport: ServiceReport | null;
  loading: boolean;
  error: string | null;
  setReports: (reports: ServiceReport[]) => void;
  setReportSummaries: (summaries: ReportSummary[]) => void;
  setCurrentReport: (report: ServiceReport | null) => void;
  addReport: (report: ServiceReport) => void;
  updateReport: (id: string, report: Partial<ServiceReport>) => void;
  removeReport: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadDemoData: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  reportSummaries: [],
  currentReport: null,
  loading: false,
  error: null,

  setReports: (reports) => set({ reports }),

  setReportSummaries: (summaries) => set({ reportSummaries: summaries }),

  setCurrentReport: (report) => set({ currentReport: report }),

  addReport: (report) =>
    set((state) => ({ reports: [...state.reports, report] })),

  updateReport: (id, updatedData) =>
    set((state) => ({
      reports: state.reports.map((report) =>
        report.id === id ? { ...report, ...updatedData } : report
      ),
    })),

  removeReport: (id) =>
    set((state) => ({
      reports: state.reports.filter((report) => report.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
  
  loadDemoData: () => set({ 
    reports: demoReports as ServiceReport[], 
    reportSummaries: getReportSummaries() as ReportSummary[] 
  }),
}));
