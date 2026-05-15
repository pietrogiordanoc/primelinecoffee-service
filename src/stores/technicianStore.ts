import { create } from 'zustand';
import type { Technician } from '@/types';
import { demoTechnicians } from '@/utils/demoData';

interface TechnicianState {
  technicians: Technician[];
  currentTechnician: Technician | null;
  loading: boolean;
  error: string | null;
  setTechnicians: (technicians: Technician[]) => void;
  setCurrentTechnician: (technician: Technician | null) => void;
  addTechnician: (technician: Technician) => void;
  updateTechnician: (id: string, technician: Partial<Technician>) => void;
  removeTechnician: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadDemoData: () => void;
}

export const useTechnicianStore = create<TechnicianState>((set) => ({
  technicians: [],
  currentTechnician: null,
  loading: false,
  error: null,

  setTechnicians: (technicians) => set({ technicians }),

  setCurrentTechnician: (technician) => set({ currentTechnician: technician }),

  addTechnician: (technician) =>
    set((state) => ({ technicians: [...state.technicians, technician] })),

  updateTechnician: (id, updatedData) =>
    set((state) => ({
      technicians: state.technicians.map((tech) =>
        tech.id === id ? { ...tech, ...updatedData } : tech
      ),
    })),

  removeTechnician: (id) =>
    set((state) => ({
      technicians: state.technicians.filter((tech) => tech.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
  
  loadDemoData: () => set({ technicians: demoTechnicians as Technician[] }),
}));
