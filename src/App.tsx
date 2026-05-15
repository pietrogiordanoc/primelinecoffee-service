import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// Layouts
import AdminLayout from '@/components/layouts/AdminLayout';
import TechnicianLayout from '@/components/layouts/TechnicianLayout';

// Pages
import Login from '@/pages/auth/Login';
import Setup from '@/pages/Setup';
import Dashboard from '@/pages/admin/Dashboard';
import TechniciansPage from '@/pages/admin/Technicians';
import CompaniesPage from '@/pages/admin/Companies';
import FormBuilderPage from '@/pages/admin/FormBuilder';
import ReportsPage from '@/pages/admin/Reports';
import SettingsPage from '@/pages/admin/Settings';
import TechnicianHome from '@/pages/technician/Home';
import FillReport from '@/pages/technician/FillReport';
import ReportHistory from '@/pages/technician/History';

// Components
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

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
    <Routes>
      {/* Public Routes */}
      <Route path="/setup" element={<Setup />} />
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/" replace />}
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
        <Route path="settings" element={<SettingsPage />} />
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
        <Route path="history" element={<ReportHistory />} />
      </Route>

      {/* Redirect based on role */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
