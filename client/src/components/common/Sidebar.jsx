import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  Boxes,
  Container,
  Rocket,
  Activity,
  BarChart3,
  Settings,
  Database,
} from 'lucide-react';
import Badge from './Badge';
import { getSystemHealth } from '../../services/projectService';

export const Sidebar = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getSystemHealth()
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
    { label: 'My Projects', to: '/dashboard/projects', icon: FolderGit2 },
    { label: 'Integrations', to: '/dashboard/integrations', icon: Boxes },
    { label: 'Docker Builds', to: '/dashboard/builds', icon: Container },
    { label: 'Deployments', to: '/dashboard/deployments', icon: Rocket },
    { label: 'Analytics', to: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Activity', to: '/dashboard/activity', icon: Activity },
    { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  ];

  const dbConnected = health?.databases?.postgresql?.status === 'connected';
  const dbMode = health?.databases?.postgresql?.mode || 'loading';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-40 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation list */}
        <div className="p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
            DevOps Console
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="comingSoon" size="xs">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom system health status */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-blue-600" /> Database
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {dbConnected ? 'PostgreSQL' : 'Resilient Mode'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Engine: <span className="font-mono text-slate-700 font-medium">{dbMode}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 px-1 flex items-center justify-between">
            <span>Pipeline One v5.0</span>
            <span className="text-emerald-600 font-semibold font-mono">Production Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
