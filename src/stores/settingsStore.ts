import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface SystemSettings {
  id: string;
  // Email Configuration
  email_notifications_enabled: boolean;
  notify_technician: boolean;
  notify_super_admins: boolean;
  additional_notification_emails: string[];
  email_sender_name: string;
  email_sender_email: string | null;
  
  // Company Information
  company_name: string;
  company_logo_url: string | null;
  company_phone: string | null;
  company_address: string | null;
  
  // System Configuration
  default_language: string;
  timezone: string;
  date_format: string;
  
  // Report Settings
  require_photos: boolean;
  max_photos_per_report: number;
  auto_compress_images: boolean;
  
  created_at: string;
  updated_at: string;
}

interface SettingsState {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SystemSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) throw error;

      set({ settings: data, loading: false });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      set({ error: error.message, loading: false });
    }
  },

  updateSettings: async (updates) => {
    set({ loading: true, error: null });
    try {
      const { settings } = get();
      if (!settings) throw new Error('Settings not loaded');

      const { data, error } = await supabase
        .from('system_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      set({ settings: data, loading: false });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));
