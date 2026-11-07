import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Github, LogOut, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';

export const Navbar = ({ onToggleSidebar, isMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isGitHubConnected = user?.integrations?.github?.connected;
  const githubUsername = user?.integrations?.github?.username;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">
            Pipeline<span className="text-blue-600">One</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
            Enterprise
          </span>
        </Link>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* GitHub status pill */}
        <Link
          to="/dashboard/integrations"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs text-slate-700 transition-colors"
        >
          <Github className="w-3.5 h-3.5 text-slate-800" />
          {isGitHubConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              @{githubUsername}
            </span>
          ) : (
            <span className="text-slate-600 hover:text-slate-900 font-medium">Connect GitHub</span>
          )}
        </Link>

        {/* Notifications Bell */}
        <NotificationBell />

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-semibold text-blue-700">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.name?.slice(0, 2).toUpperCase() || 'PO'
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{user?.name}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{user?.email}</div>
            </div>
          </button>

          {profileDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs"
              onClick={() => setProfileDropdownOpen(false)}
            >
              <div className="px-3 py-2 border-b border-slate-100 text-slate-500">
                Signed in as <span className="font-semibold text-slate-900 block truncate">{user?.email}</span>
              </div>
              <Link
                to="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
              >
                <LogOut className="w-4 h-4 text-red-500" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
