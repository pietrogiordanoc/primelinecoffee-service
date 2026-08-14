import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  ClipboardList,
  Trash2,
  Settings,
  HardDrive,
  LogOut,
  Menu,
  X,
  Smartphone,
  Home,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/helpers';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isTechMode = location.pathname.startsWith('/admin/tech-mode');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'STAFF', href: '/admin/technicians', icon: Users },
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Forms', href: '/admin/forms', icon: FileText },
    { name: 'Reports', href: '/admin/reports', icon: ClipboardList },
    { name: 'Trash', href: '/admin/trash', icon: Trash2 },
    { name: 'Storage', href: '/admin/storage', icon: HardDrive },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile bottom sheet backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile bottom sheet menu */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 lg:hidden',
          sidebarOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="max-h-[80vh] overflow-y-auto">
          {/* Handle bar */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          {/* User info with logout */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary-700">
                    {userProfile?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {userProfile?.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation grid */}
          <div className="px-4 py-6">
            <div className="grid grid-cols-3 gap-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/admin'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center justify-center p-4 rounded-xl transition-all',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )
                  }
                >
                  <item.icon className="w-7 h-7 mb-2" strokeWidth={2} />
                  <span className="text-xs font-medium text-center">{item.name}</span>
                </NavLink>
              ))}
              <NavLink
                to={isTechMode ? '/admin' : '/admin/tech-mode'}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl transition-all',
                  isTechMode
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {isTechMode ? (
                  <>
                    <Home className="w-7 h-7 mb-2" strokeWidth={2} />
                    <span className="text-xs font-medium text-center">Version Admin</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-7 h-7 mb-2" strokeWidth={2} />
                    <span className="text-xs font-medium text-center">Version Tech</span>
                  </>
                )}
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:block fixed top-0 left-0 z-30 h-screen w-64 bg-white border-r border-gray-200"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.jpg" 
                alt="Icon" 
                className="h-10 w-10 object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <img 
                src="/logo.png" 
                alt="Prime Line Coffee Service" 
                className="h-8 w-auto"
              />
            </div>
          </div>

          {/* Version Switcher */}
          <div className="px-4 py-3 border-b border-gray-200">
            <NavLink
              to={isTechMode ? '/admin' : '/admin/tech-mode'}
              className={cn(
                'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isTechMode
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {isTechMode ? (
                <>
                  <Home className="w-5 h-5 mr-3" />
                  Version Admin
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5 mr-3" />
                  Version Tech
                </>
              )}
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {userProfile?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 flex-1 lg:ml-0 ml-4">
              <img 
                src="/favicon.jpg" 
                alt="Icon" 
                className="h-8 w-8 object-contain rounded-lg shadow-sm lg:hidden"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h1 className="text-xl font-semibold text-gray-900">
                Prime Line Coffee Service
              </h1>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 md:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation - Mobile only, app-style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg lg:hidden z-40">
        <div className="flex justify-around items-center h-16">
          <NavLink
            to="/admin"
            end
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
                <LayoutDashboard
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
                  Home
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/admin/companies"
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
                <Building2
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
                  Companies
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/admin/reports"
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
                <ClipboardList
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
                  Reports
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/admin/technicians"
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
                <Users
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
                  Staff
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to={isTechMode ? "/admin" : "/admin/tech-mode"}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full transition-all',
              isTechMode
                ? 'text-green-600'
                : 'text-gray-400 hover:text-green-500'
            )}
          >
            <>
              {isTechMode ? (
                <Home
                  className="w-6 h-6 mb-1 transition-all text-green-600 scale-110"
                  strokeWidth={2.5}
                />
              ) : (
                <Smartphone
                  className="w-6 h-6 mb-1 transition-all text-gray-400"
                  strokeWidth={2}
                />
              )}
              <span className={cn(
                'text-xs font-medium',
                isTechMode ? 'text-green-600' : 'text-gray-500'
              )}>
                {isTechMode ? 'Admin' : 'Tech'}
              </span>
            </>
          </NavLink>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-primary-500 transition-all"
          >
            <Menu className="w-6 h-6 mb-1" strokeWidth={2} />
            <span className="text-xs font-medium text-gray-500">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
