import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Box,
  ExternalLink,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../services/notificationService';

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnread = async () => {
    try {
      const data = await getUnreadCount();
      if (data && typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    }
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(15, 0);
      if (data && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchList();
      fetchUnread();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      }
    } catch {
      // ignore
    }

    setIsOpen(false);
    if (notification.execution_id) {
      navigate(`/dashboard/pipelines/${notification.execution_id}`);
    } else {
      navigate('/dashboard/deployments');
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'pipeline_started':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'build_success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'build_failed':
      case 'pipeline_failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'docker_publish':
        return <Box className="w-4 h-4 text-blue-600" />;
      case 'vercel_ready':
        return <ExternalLink className="w-4 h-4 text-indigo-600" />;
      case 'pipeline_cancelled':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors font-medium"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Pipeline execution events will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                    !n.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5 border border-slate-200">
                    {renderIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className={`text-xs truncate font-medium ${!n.is_read ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard/deployments');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              View all deployment runs →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
