import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, setUserProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      if (userProfile) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserProfile(data);
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [user, userProfile, setUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Allow admins and super_admins to access technician routes (for technician mode)
  const isAdminAccessingTechnicianMode = 
    allowedRoles.includes('technician') && 
    (userProfile.role === 'admin' || userProfile.role === 'super_admin');

  if (!allowedRoles.includes(userProfile.role) && !isAdminAccessingTechnicianMode) {
    // Redirect based on role
    if (userProfile.role === 'technician') {
      return <Navigate to="/technician" replace />;
    }
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
