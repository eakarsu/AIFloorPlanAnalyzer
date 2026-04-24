import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  Home, FileImage, Square, Lightbulb, Package, Calculator,
  Palette, Users, Brain, Menu, X, LogOut, User, ChevronDown, Settings,
  BarChart3, Maximize, DollarSign, Sparkles, ScanSearch, Sofa, Wrench, Zap, ClipboardCheck
} from 'lucide-react';
import { logout as logoutApi } from '../services/api';

const menuItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/floor-plans', icon: FileImage, label: 'Floor Plans' },
  { path: '/rooms', icon: Square, label: 'Rooms' },
  { path: '/suggestions', icon: Lightbulb, label: 'Suggestions' },
  { path: '/materials', icon: Package, label: 'Materials' },
  { path: '/estimates', icon: Calculator, label: 'Estimates' },
  { path: '/templates', icon: Palette, label: 'Templates' },
  { path: '/contractors', icon: Users, label: 'Contractors' },
  { type: 'divider', label: 'AI Features' },
  { path: '/ai-analysis', icon: Brain, label: 'AI Analysis' },
  { path: '/full-analysis', icon: Sparkles, label: 'Full Analysis' },
  { path: '/dimensions', icon: BarChart3, label: 'Dimensions' },
  { path: '/ai-suggestions', icon: Lightbulb, label: 'AI Suggestions' },
  { path: '/ai-materials', icon: Package, label: 'AI Materials' },
  { path: '/optimize-layout', icon: Maximize, label: 'Optimize Layout' },
  { path: '/cost-estimate', icon: DollarSign, label: 'Cost Estimate' },
  { type: 'divider', label: 'Real Estate AI' },
  { path: '/room-detector', icon: ScanSearch, label: 'Room Detector' },
  { path: '/home-staging', icon: Home, label: 'Home Staging' },
  { path: '/furniture-placer', icon: Sofa, label: 'Furniture Placer' },
  { path: '/maintenance-predictor', icon: Wrench, label: 'Maintenance' },
  { path: '/energy-auditor', icon: Zap, label: 'Energy Auditor' },
  { path: '/home-inspector', icon: ClipboardCheck, label: 'Home Inspector' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logoutApi(); } catch (e) { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-800">FloorPlan AI</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div key={index} className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              );
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 text-gray-600 hover:text-gray-800"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="hidden sm:block font-medium">{user?.name || user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
