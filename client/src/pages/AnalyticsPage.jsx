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
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header & Date Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Deployment Analytics & Telemetry</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline reliability, build performance, and project throughput trends
          </p>
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {['7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh analytics"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Runs */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Executions</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary.total_deployments || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">In selected {dateRange} period</span>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {summary.success_rate || 0}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.successful_deployments || 0} passed • {summary.failed_deployments || 0} failed
          </span>
        </div>

        {/* Avg Duration */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Build Time</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {formatSec(buildPerformance.avg_duration_ms)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Min: {formatSec(buildPerformance.min_duration_ms)} • Max: {formatSec(buildPerformance.max_duration_ms)}
          </span>
        </div>

        {/* Active Projects */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderGit2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {projectActivity.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">With deployments recorded</span>
        </div>
      </div>

      {/* Row 1: Daily Deployment Trends & Success Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trends Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Deployment Frequency</h3>
              <p className="text-xs text-slate-400">Volume and success distribution over time</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{dailyTrends.length} data points</span>
          </div>
          <DailyTrendBarChart trends={dailyTrends} />
        </div>

        {/* Success Rate Gauge */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Pipeline Reliability</h3>
            <p className="text-xs text-slate-400">Overall success vs failure ratio</p>
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
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Build Runtime Performance</h3>
            <p className="text-xs text-slate-400">End-to-end pipeline latency statistics</p>
          </div>
          <BuildPerformanceCard metrics={buildPerformance} />
        </div>

        {/* Project Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">Project Deployment Volume</h3>
              <p className="text-xs text-slate-400">Distribution across active static projects</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">{projectActivity.length} projects</span>
          </div>
          <ProjectActivityDistribution projects={projectActivity} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

