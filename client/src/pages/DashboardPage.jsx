import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Boxes,
  Rocket,
  Activity,
  Github,
  UploadCloud,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Container,
  Play,
  RotateCw,
  XCircle,
  Loader2,
  Cpu,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjects, getUserActivity } from '../services/projectService';
import {
  getDashboardOverview,
  getActivePipelines,
  getRecentExecutions,
} from '../services/monitoringService';
import Badge from '../components/common/Badge';
import ConnectGitHubModal from '../components/integrations/ConnectGitHubModal';
import RepoSelectorModal from '../components/projects/RepoSelectorModal';
import UploadZipModal from '../components/projects/UploadZipModal';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters & Loading
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  // Data States
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalExecutions: 0,
    successfulDeployments: 0,
    failedDeployments: 0,
    activePipelines: 0,
    successRate: 0,
    connectedPlatforms: 0,
  });
  const [activePipelines, setActivePipelines] = useState([]);
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [projects, setProjects] = useState([]);

  // Modals
  const [isConnectGitHubOpen, setIsConnectGitHubOpen] = useState(false);
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [isUploadZipOpen, setIsUploadZipOpen] = useState(false);

  const isGitHubConnected = Boolean(user?.integrations?.github?.connected);
  const githubUsername = user?.integrations?.github?.username;

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, activeRes, recentRes, projRes] = await Promise.allSettled([
        getDashboardOverview(dateRange),
        getActivePipelines(),
        getRecentExecutions(8),
        getProjects(),
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value?.data?.stats) {
        setStats(overviewRes.value.data.stats);
      }
      if (activeRes.status === 'fulfilled' && activeRes.value?.data) {
        setActivePipelines(activeRes.value.data);
      }
      if (recentRes.status === 'fulfilled' && recentRes.value?.data) {
        setRecentExecutions(recentRes.value.data);
      }
      if (projRes.status === 'fulfilled' && projRes.value?.projects) {
        setProjects(projRes.value.projects);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh active pipelines every 15 seconds
    const interval = setInterval(async () => {
      try {
        const activeRes = await getActivePipelines();
        if (activeRes?.data) setActivePipelines(activeRes.data);
      } catch {
        // ignore
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const handleOpenImportRepo = () => {
    if (isGitHubConnected) {
      setIsRepoSelectorOpen(true);
    } else {
      setIsConnectGitHubOpen(true);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'running':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Running
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3" /> {status || 'Queued'}
          </span>
        );
    }
  };

  const formatSec = (ms) => {
    if (!ms || ms <= 0) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="space-y-7 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              DevOps Control Center
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold bg-blue-950 text-blue-400 border border-blue-500/30">
              Live Real-Time
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, <strong className="text-slate-200">{user?.name}</strong>. Monitor pipelines, containers, and live deployments.
          </p>
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Filter Tabs */}
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
                {range === 'all' ? 'All' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh dashboard"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsUploadZipOpen(true)}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4 text-slate-400" />
            Upload ZIP
          </button>

          <button
            onClick={handleOpenImportRepo}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Import Project
          </button>
        </div>
      </div>

      {/* GitHub Account Banner (Preserved Phase 1) */}
      {isGitHubConnected ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#24292F] flex items-center justify-center text-white border border-slate-700 shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">GitHub Account Connected</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized as <span className="text-blue-400 font-mono">@{githubUsername}</span> with AES-256 encrypted token storage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRepoSelectorOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Select Repositories
            </button>
            <Link
              to="/dashboard/integrations"
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Manage
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 border border-amber-500/30 shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">GitHub Not Connected</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Action Needed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect GitHub to authorize webhook triggers and inspect static website repositories.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsConnectGitHubOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0"
          >
            <Github className="w-4 h-4" /> Connect GitHub
          </button>
        </div>
      )}

      {/* 6 Real Database-Driven Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Projects */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 text-xs">
            <span>Projects</span>
            <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.totalProjects}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Configured</span>
        </div>

        {/* Total Executions */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 text-xs">
            <span>Pipeline Runs</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.totalExecutions}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Total executions</span>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 text-xs">
            <span>Success Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.successRate}%</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{stats.successfulDeployments} succeeded</span>
        </div>

        {/* Failed Deployments */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 text-xs">
            <span>Failures</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">{stats.failedDeployments}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Recorded</span>
        </div>

        {/* Active Running */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 text-xs">
            <span>Active Running</span>
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          </div>
          <div className="text-xl font-bold text-blue-400">{stats.activePipelines}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Live executing</span>
        </div>

        {/* Integrations */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 text-xs">
            <span>Integrations</span>
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.connectedPlatforms} / 4</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Platforms active</span>
        </div>
      </div>

      {/* Active Running Pipelines Section */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            <h2 className="text-sm font-semibold text-white">Active Running Pipelines</h2>
            {activePipelines.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                {activePipelines.length} in progress
              </span>
            )}
          </div>
          <Link
            to="/dashboard/deployments"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            All Deployments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activePipelines.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
            No active pipeline executions currently running. Ready for git push or manual trigger.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePipelines.map((active) => (
              <Link
                key={active.id}
                to={`/dashboard/pipelines/${active.id}`}
                className="p-4 rounded-xl bg-slate-950/70 border border-blue-500/30 hover:border-blue-400 transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-white group-hover:text-blue-400 transition-colors">
                    {active.project_name || 'Project'}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-500/20">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    {active.current_stage || 'RUNNING'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono space-y-1">
                  <div>Branch: {active.branch_name || 'main'}</div>
                  <div className="text-slate-500">
                    Started {active.started_at ? new Date(active.started_at).toLocaleTimeString() : 'Just now'}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-medium">
                  <span>Open live visualizer →</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Recent Executions & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left 2 Cols: Recent Executions Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent Pipeline Executions</h2>
            <Link
              to="/dashboard/deployments"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              View Full History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
            {recentExecutions.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No pipeline executions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-3 px-4">Run</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Branch / Commit</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {recentExecutions.map((exec) => (
                      <tr
                        key={exec.id}
                        className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/dashboard/pipelines/${exec.id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          #{exec.execution_number || exec.id.substring(0, 7)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {exec.project_name || 'Project'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {exec.branch_name || 'main'} • {exec.commit_sha ? exec.commit_sha.substring(0, 7) : 'HEAD'}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(exec.status)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {formatSec(exec.duration_ms)}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {exec.live_url && (
                              <a
                                href={exec.live_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors"
                                title="Open Live Deployment"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <Link
                              to={`/dashboard/pipelines/${exec.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-medium"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Navigation Cards */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">DevOps Navigation</h2>

          {/* Analytics Shortcut Card */}
          <Link
            to="/dashboard/analytics"
            className="block p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950/40 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              Deployment Analytics
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspect build latency trends, success rates, and project reliability charts.
            </p>
          </Link>

          {/* Docker Builds Shortcut Card */}
          <Link
            to="/dashboard/builds"
            className="block p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Container className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white">Docker Hub Images</h3>
            <p className="text-xs text-slate-400 mt-1">
              View generated container images, tags, and automated publishing logs.
            </p>
          </Link>

          {/* Connected Integrations Card */}
          <Link
            to="/dashboard/integrations"
            className="block p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Boxes className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white">Platform Integrations</h3>
            <p className="text-xs text-slate-400 mt-1">
              Manage GitHub, Docker Hub, Jenkins, and Vercel credentials and tokens.
            </p>
          </Link>
        </div>
      </div>

      {/* Modals */}
      <ConnectGitHubModal
        isOpen={isConnectGitHubOpen}
        onClose={() => setIsConnectGitHubOpen(false)}
        onSuccess={() => {
          setIsConnectGitHubOpen(false);
          loadData();
        }}
      />

      <RepoSelectorModal
        isOpen={isRepoSelectorOpen}
        onClose={() => setIsRepoSelectorOpen(false)}
        onSuccess={() => {
          setIsRepoSelectorOpen(false);
          loadData();
        }}
      />

      <UploadZipModal
        isOpen={isUploadZipOpen}
        onClose={() => setIsUploadZipOpen(false)}
        onSuccess={() => {
          setIsUploadZipOpen(false);
          loadData();
        }}
      />
    </div>
  );
};

export default DashboardPage;
