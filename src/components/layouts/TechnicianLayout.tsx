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
    { name: 'Home', href: '/technician', icon: Home, end: true },
    { name: 'History', href: '/technician/history', icon: ClipboardList, end: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Ultra Compact */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Prime Line Coffee Service" 
              className="h-7 w-auto"
            />
            <div>
              <p className="text-xs font-medium text-gray-900 leading-tight">{userProfile?.full_name}</p>
              <p className="text-xs text-gray-500 leading-tight">Technician</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - Extra padding bottom for fixed nav */}
      <main className="flex-1 overflow-y-auto bg-gray-50 pb-20">
        <div className="w-full px-3 py-2 md:w-[80%] md:mx-auto md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation - Fixed on mobile, modern app style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:relative md:shadow-none">
        <div className="flex justify-around items-center h-16">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-all',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 hover:text-primary-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-6 h-6 mb-1 transition-all',
                      isActive ? 'text-primary-600 scale-110' : 'text-gray-400'
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-primary-600' : 'text-gray-500'
                  )}>
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-red-500 transition-all"
          >
            <LogOut className="w-6 h-6 mb-1" strokeWidth={2} />
            <span className="text-xs font-medium text-gray-500">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
