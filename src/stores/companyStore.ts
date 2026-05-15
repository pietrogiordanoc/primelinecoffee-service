import { create } from 'zustand';
import type { Company } from '@/types';

interface CompanyState {
  companies: Company[];
  currentCompany: Company | null;
  loading: boolean;
  error: string | null;
  setCompanies: (companies: Company[]) => void;
  setCurrentCompany: (company: Company | null) => void;
  addCompany: (company: Company) => void;
  updateCompany: (id: string, company: Partial<Company>) => void;
  removeCompany: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  currentCompany: null,
  loading: false,
  error: null,

  setCompanies: (companies) => set({ companies }),

  setCurrentCompany: (company) => set({ currentCompany: company }),

  addCompany: (company) =>
    set((state) => ({ companies: [...state.companies, company] })),

  updateCompany: (id, updatedData) =>
    set((state) => ({
      companies: state.companies.map((comp) =>
        comp.id === id ? { ...comp, ...updatedData } : comp
      ),
    })),

  removeCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((comp) => comp.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
}));
