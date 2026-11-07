import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Database,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getSystemHealth } from '../services/projectService';
import Badge from '../components/common/Badge';

export const SettingsPage = () => {
  const { user, updateSettings } = useAuth();
  const notify = useNotification();

  const [theme, setTheme] = useState(user?.settings?.theme || 'arctic');
  const [notifications, setNotifications] = useState(user?.settings?.notifications_enabled ?? true);
  const [autoDeploy, setAutoDeploy] = useState(user?.settings?.auto_deploy_enabled ?? false);
  const [saving, setSaving] = useState(false);

  const [systemHealth, setSystemHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      setHealthLoading(true);
      const data = await getSystemHealth();
      setSystemHealth(data);
    } catch {
      // Ignore
    } finally {
      setHealthLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateSettings({
        theme,
        notifications_enabled: notifications,
        auto_deploy_enabled: autoDeploy,
      });

      if (res.success) {
        notify.success('Preferences updated successfully!');
      } else {
        notify.error(res.error);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const pgStatus = systemHealth?.databases?.postgresql;
  const mongoStatus = systemHealth?.databases?.mongodb_atlas;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure application preferences, notification options, and inspect database infrastructure health.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" /> Account Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Full Name:</span>
            <span className="font-semibold text-slate-900">{user?.name}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Email Address:</span>
            <span className="font-semibold text-slate-900">{user?.email}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Account ID:</span>
            <span className="font-mono text-slate-700">{user?.id}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Account Created:</span>
            <span className="text-slate-700">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSaveSettings} className="p-6 bg-white rounded-2xl border border-slate-200/80 space-y-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-blue-600" /> Platform Preferences
        </h2>

        {/* Theme */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 block">Dashboard Theme</label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'arctic', label: 'Arctic Professional (Active)', icon: Sun },
              { id: 'dark', label: 'Dark Charcoal', icon: Moon, disabled: true },
              { id: 'system', label: 'System', icon: Laptop, disabled: true },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  type="button"
                  key={t.id}
                  disabled={t.disabled}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    theme === t.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                      : t.disabled
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.disabled && <span className="text-[10px] text-slate-400">(Legacy)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-900 block">Email & In-App Notifications</span>
              <span className="text-[11px] text-slate-500">Receive alerts when new builds complete or repositories sync.</span>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-900 block">Automatic Deployment on Git Push</span>
              <span className="text-[11px] text-slate-500">Trigger continuous delivery pipeline when new commits are detected.</span>
            </div>
            <input
              type="checkbox"
              checked={autoDeploy}
              onChange={(e) => setAutoDeploy(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </form>

      {/* Database & Infrastructure Health */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" /> Database & System Health
          </h2>
          <button
            onClick={loadHealth}
            disabled={healthLoading}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            Refresh Health
          </button>
        </div>

        {healthLoading ? (
          <div className="py-6 text-center text-slate-500 text-xs">Loading health metrics...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* PostgreSQL status */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="font-semibold text-slate-900">PostgreSQL (Primary DB)</span>
                <Badge
                  variant={pgStatus?.status === 'connected' ? 'success' : 'primary'}
                  size="xs"
                >
                  {pgStatus?.status === 'connected' ? 'Connected' : 'Resilient Mode'}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1 pt-1 font-mono">
                <div>Engine: {pgStatus?.engine}</div>
                <div>Operational Mode: {pgStatus?.mode}</div>
                {pgStatus?.error && (
                  <div className="text-amber-800 text-[10px]">Notice: {pgStatus.error}</div>
                )}
              </div>
            </div>

            {/* MongoDB Atlas status */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="font-semibold text-slate-900">MongoDB Atlas (Secondary DB)</span>
                <Badge
                  variant={mongoStatus?.isConnected ? 'success' : 'default'}
                  size="xs"
                >
                  {mongoStatus?.status}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1 pt-1 font-mono">
                <div>Configured: {mongoStatus?.configured ? 'Yes' : 'Not configured'}</div>
                <div>Status: {mongoStatus?.status}</div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Secondary store for flexible scan ASTs
                </div>
              </div>
            </div>

            {/* Server runtime info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2 space-y-1 text-slate-600 text-[11px]">
              <div>API Server: <span className="text-slate-900 font-semibold">{systemHealth?.service}</span></div>
              <div>Node Version: <span className="text-slate-900 font-semibold">{systemHealth?.system?.nodeVersion}</span></div>
              <div>Process Memory: <span className="text-slate-900 font-semibold">{systemHealth?.system?.memoryUsageMb} MB</span></div>
              <div>Server Uptime: <span className="text-slate-900 font-semibold">{systemHealth?.uptimeSeconds} seconds</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
