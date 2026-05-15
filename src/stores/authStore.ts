import { create } from 'zustand';
import { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, UserRole } from '@/types';
import { demoUsers } from '@/utils/demoData';

interface AuthState {
  user: SupabaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isDemoMode: boolean;
  setUser: (user: SupabaseUser | null) => void;
  setUserProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  loginDemo: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  loading: false,
  isDemoMode: false,

  setUser: (user) => set({ user }),
  
  setUserProfile: (profile) => set({ userProfile: profile }),
  
  setLoading: (loading) => set({ loading }),
  
  loginDemo: async (email: string, password: string) => {
    const demoUser = demoUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (demoUser) {
      // Create a mock SupabaseUser object
      const mockUser = {
        id: demoUser.id,
        email: demoUser.email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: demoUser.created_at,
      } as SupabaseUser;

      set({
        user: mockUser,
        userProfile: demoUser as User,
        isDemoMode: true,
      });
      
      // Save to localStorage
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      
      return true;
    }
    
    return false;
  },
  
  logout: () => {
    set({ user: null, userProfile: null, isDemoMode: false });
    localStorage.removeItem('demo_user');
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
