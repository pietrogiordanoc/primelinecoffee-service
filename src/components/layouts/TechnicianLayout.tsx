import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/helpers';

export default function TechnicianLayout() {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Home', href: '/technician', icon: Home },
    { name: 'History', href: '/technician/history', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="Prime Line Coffee Service" 
                  className="h-8 w-auto"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-600 truncate">Hi, {userProfile?.full_name}! Select company</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded transition flex-shrink-0"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="w-full px-3 py-4 md:w-[80%] md:mx-auto md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="bg-white border-t border-gray-200">
        <div className="flex justify-around">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center flex-1 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-primary-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 mb-1',
                      isActive ? 'text-primary-600' : 'text-gray-400'
                    )}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
