import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  RotateCw,
  FolderGit2,
  Activity,
  Layers,
} from 'lucide-react';
import { getAnalyticsOverview } from '../services/analyticsService';
import {
  DailyTrendBarChart,
  SuccessRateGauge,
  BuildPerformanceCard,
  ProjectActivityDistribution,
} from '../components/analytics/AnalyticsCharts';

export const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalyticsOverview(dateRange);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const summary = data?.summary || {};
  const dailyTrends = data?.dailyTrends || [];
  const buildPerformance = data?.buildPerformance || {};
  const projectActivity = data?.projectActivity || [];

  const formatSec = (ms) => {
    if (!ms || ms <= 0) return '0s';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto animate-fade-in">
      {/* Header & Date Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deployment Analytics & Telemetry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline reliability, build performance, and project throughput trends
          </p>
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
            {['7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  dateRange === range
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
            title="Refresh analytics"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Runs */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Executions</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {summary.total_deployments || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">In selected {dateRange} period</span>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {summary.success_rate || 0}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {summary.successful_deployments || 0} passed • {summary.failed_deployments || 0} failed
          </span>
        </div>

        {/* Avg Duration */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Avg Build Time</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatSec(buildPerformance.avg_duration_ms)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Min: {formatSec(buildPerformance.min_duration_ms)} • Max: {formatSec(buildPerformance.max_duration_ms)}
          </span>
        </div>

        {/* Active Projects */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderGit2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {projectActivity.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">With deployments recorded</span>
        </div>
      </div>

      {/* Row 1: Daily Deployment Trends & Success Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trends Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Daily Deployment Frequency</h3>
              <p className="text-xs text-slate-500">Volume and success distribution over time</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{dailyTrends.length} data points</span>
          </div>
          <DailyTrendBarChart trends={dailyTrends} />
        </div>

        {/* Success Rate Gauge */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Pipeline Reliability</h3>
            <p className="text-xs text-slate-500">Overall success vs failure ratio</p>
          </div>
          <SuccessRateGauge
            successRate={summary.success_rate || 0}
            total={summary.total_deployments || 0}
            successful={summary.successful_deployments || 0}
            failed={summary.failed_deployments || 0}
          />
        </div>
      </div>

      {/* Row 2: Build Performance & Project Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Performance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Build Runtime Performance</h3>
            <p className="text-xs text-slate-500">End-to-end pipeline latency statistics</p>
          </div>
          <BuildPerformanceCard metrics={buildPerformance} />
        </div>

        {/* Project Distribution */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Project Deployment Volume</h3>
              <p className="text-xs text-slate-500">Distribution across active static projects</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{projectActivity.length} projects</span>
          </div>
          <ProjectActivityDistribution projects={projectActivity} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
