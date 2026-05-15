import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/utils/validationSchemas';
import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { loginDemo } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true);
      setError(null);

      // Use demo login
      const success = await loginDemo(data.email, data.password);

      if (!success) {
        throw new Error('Invalid credentials');
      }

      // Get profile to determine role
      const userProfile = useAuthStore.getState().userProfile;

      // Redirect by role
      if (userProfile?.role === 'technician') {
        navigate('/technician');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (email: string, password: string) => {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Prime Line Coffee Service
            </h1>
            <p className="text-gray-600 mt-2">Technical Service Management System</p>
          </div>

          {/* Demo Mode Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Mode</h3>
                <p className="text-xs text-blue-700 mb-3">Test the application with sample data:</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('admin@demo.com', 'admin123')}
                    className="w-full text-left px-3 py-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition text-xs"
                  >
                    <div className="font-medium text-blue-900">👤 Admin</div>
                    <div className="text-blue-600">admin@demo.com / admin123</div>
                  </button>
                  <div className="bg-white rounded border border-blue-200 px-3 py-2">
                    <div className="font-medium text-blue-900 text-xs mb-2">🔧 Technicians</div>
                    <select
                      onChange={(e) => {
                        const [email, password] = e.target.value.split('|');
                        if (email && password) fillDemoCredentials(email, password);
                      }}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1"
                      defaultValue=""
                    >
                      <option value="">Select a technician...</option>
                      <option value="andy.hernandez@primelinedist.com|tech123">Andy Hernandez</option>
                      <option value="sergio.tabares@primelinedist.com|tech123">Sergio Tabares</option>
                      <option value="neftali.borrero@primelinedist.com|tech123">Neftali Borrero</option>
                      <option value="Onier@primelinedist.com|tech123">Onier Guillen</option>
                      <option value="Ernesto@primelinedist.com|tech123">Ernesto Sanchez</option>
                      <option value="Alberto@primelinedist.com|tech123">Alberto Martinez</option>
                      <option value="oscar.encinas@primelinedist.com|tech123">Oscar Encinas</option>
                      <option value="alejandro@eliaontheriver.com|tech123">Alejandro</option>
                    </select>
                    <div className="text-blue-600 text-xs mt-1">Password: tech123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="user@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Forgot your password? Contact administrator</p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2026 Prime Line Coffee Service. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
