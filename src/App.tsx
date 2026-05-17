import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ConfirmProvider } from '@/contexts/ConfirmContext';

// Layouts
import AdminLayout from '@/components/layouts/AdminLayout';
import TechnicianLayout from '@/components/layouts/TechnicianLayout';

// Pages
import Login from '@/pages/auth/Login';
import Dashboard from '@/pages/admin/Dashboard';
import TechniciansPage from '@/pages/admin/Technicians';
import CompaniesPage from '@/pages/admin/Companies';
import FormBuilderPage from '@/pages/admin/FormBuilder';
import ReportsPage from '@/pages/admin/Reports';
import SettingsPage from '@/pages/admin/Settings';
import TechnicianViewPage from '@/pages/admin/TechnicianView';
import TechnicianHome from '@/pages/technician/Home';
import FillReport from '@/pages/technician/FillReport';
import ReportHistory from '@/pages/technician/History';
import ViewReport from '@/pages/technician/ViewReport';

// Components
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function RoleBasedRedirect() {
  const { user, userProfile, setUserProfile } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function redirect() {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      // Load profile if not loaded
      if (!userProfile) {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (data) {
            setUserProfile(data);
            if (data.role === 'technician') {
              navigate('/technician', { replace: true });
            } else {
              navigate('/admin', { replace: true });
            }
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          navigate('/login', { replace: true });
        }
      } else {
        // Profile already loaded
        if (userProfile.role === 'technician') {
          navigate('/technician', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      }
    }

    redirect();
  }, [user, userProfile, navigate, setUserProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Get session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ConfirmProvider>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={!user ? <Login /> : <RoleBasedRedirect />}
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="technicians" element={<TechniciansPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="forms" element={<FormBuilderPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:reportId" element={<ViewReport />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="technician-view" element={<TechnicianViewPage />} />
        </Route>

        {/* Protected Technician Routes */}
        <Route
          path="/technician/*"
          element={
            <ProtectedRoute allowedRoles={['technician']}>
              <TechnicianLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TechnicianHome />} />
          <Route path="report/:formId" element={<FillReport />} />
          <Route path="report/:reportId/view" element={<ViewReport />} />
          <Route path="history" element={<ReportHistory />} />
        </Route>

        {/* Redirect based on role */}
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfirmProvider>
  );
}

export default App;
