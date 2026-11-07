import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Github, LogOut, Settings, User, Menu, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from './Badge';
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
    <header className="sticky top-0 z-30 h-16 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">
            Pipeline<span className="text-blue-500">One</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30">
            DevOps
          </span>
        </Link>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* GitHub status pill */}
        <Link
          to="/dashboard/integrations"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
        >
          <Github className="w-3.5 h-3.5 text-white" />
          {isGitHubConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              @{githubUsername}
            </span>
          ) : (
            <span className="text-slate-400 hover:text-white">Connect GitHub</span>
          )}
        </Link>

        {/* Notifications Bell */}
        <NotificationBell />

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-blue-400">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.name?.slice(0, 2).toUpperCase() || 'PO'
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-white truncate max-w-[120px]">{user?.name}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</div>
            </div>
          </button>

          {profileDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-52 bg-[#111827] border border-slate-800 rounded-xl shadow-xl py-1.5 z-50 text-xs"
              onClick={() => setProfileDropdownOpen(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800 text-slate-400">
                Signed in as <span className="font-semibold text-white block truncate">{user?.email}</span>
              </div>
              <Link
                to="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-slate-800 hover:text-rose-300 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-400" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

