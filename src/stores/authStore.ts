import { create } from 'zustand';
import { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: SupabaseUser | null;
  userProfile: User | null;
  loading: boolean;
  setUser: (user: SupabaseUser | null) => void;
  setUserProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  isRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  loading: false,

  setUser: (user) => set({ user }),
  
  setUserProfile: (profile) => set({ userProfile: profile }),
  
  setLoading: (loading) => set({ loading }),
  
  logout: () => {
    set({ user: null, userProfile: null });
  },

  isRole: (role) => {
    const { userProfile } = get();
    if (!userProfile) return false;
    if (Array.isArray(role)) {
      return role.includes(userProfile.role);
    }
    return userProfile.role === role;
  },
}));
