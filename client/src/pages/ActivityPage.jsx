import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldCheck, Github, UploadCloud, Trash2, Settings, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { getUserActivity } from '../services/projectService';
import Badge from '../components/common/Badge';

export const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await getUserActivity(50);
      setActivities(data.activities || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'USER_REGISTERED':
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case 'USER_LOGIN':
        return <LogIn className="w-4 h-4 text-blue-600" />;
      case 'GITHUB_CONNECTED':
      case 'GITHUB_DISCONNECTED':
        return <Github className="w-4 h-4 text-slate-800" />;
      case 'PROJECT_CREATED_ZIP':
      case 'PROJECT_CREATED_REPO':
        return <UploadCloud className="w-4 h-4 text-blue-600" />;
      case 'PROJECT_DELETED':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'SETTINGS_UPDATED':
        return <Settings className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-blue-600" /> Activity Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete, immutable timeline of account actions, repository links, project creations, and deployments.
        </p>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Loading activity history...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No activity records found. Actions performed across Pipeline One will appear here.
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200">
            {activities.map((act) => (
              <div key={act.id} className="relative flex items-start gap-4 text-xs pl-2">
                <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center shrink-0 z-10 shadow-xs">
                  {getEventIcon(act.event_type)}
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{act.event_type}</span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
