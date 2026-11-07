import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Boxes,
  Activity,
  Github,
  UploadCloud,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Container,
  RotateCw,
  XCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjects } from '../services/projectService';
import {
  getDashboardOverview,
  getActivePipelines,
  getRecentExecutions,
} from '../services/monitoringService';
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </span>
        );
      case 'running':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> Running
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" /> {status || 'Queued'}
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
    <div className="space-y-7 pb-12 max-w-7xl mx-auto">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              DevOps Control Center
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800 font-semibold">{user?.name}</strong>. Monitor pipelines, containers, and live deployments.
          </p>
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Filter Tabs */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
            {['7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh dashboard"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsUploadZipOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            Upload ZIP
          </button>

          <button
            onClick={handleOpenImportRepo}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Import Project
          </button>
        </div>
      </div>

      {/* GitHub Account Banner */}
      {isGitHubConnected ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">GitHub Account Connected</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized as <span className="text-blue-600 font-mono font-medium">@{githubUsername}</span> with AES-256 encrypted credential storage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRepoSelectorOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Select Repositories
            </button>
            <Link
              to="/dashboard/integrations"
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium"
            >
              Manage
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 border border-amber-300 shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-amber-950">GitHub Not Connected</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  Action Needed
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Connect GitHub to authorize automated CI/CD webhooks and source repository builds.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsConnectGitHubOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0"
          >
            <Github className="w-4 h-4" /> Connect GitHub
          </button>
        </div>
      )}

      {/* 6 Database-Driven Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Projects */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 text-xs font-medium">
            <span>Projects</span>
            <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalProjects}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Configured</span>
        </div>

        {/* Total Executions */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 text-xs font-medium">
            <span>Pipeline Runs</span>
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalExecutions}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Total executions</span>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 text-xs font-medium">
            <span>Success Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.successRate}%</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">{stats.successfulDeployments} succeeded</span>
        </div>

        {/* Failed Deployments */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 text-xs font-medium">
            <span>Failures</span>
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.failedDeployments}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Recorded</span>
        </div>

        {/* Active Running */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 text-xs font-medium">
            <span>Active Running</span>
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.activePipelines}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Live executing</span>
        </div>

        {/* Integrations */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 text-xs font-medium">
            <span>Integrations</span>
            <Boxes className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.connectedPlatforms} / 4</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Platforms active</span>
        </div>
      </div>

      {/* Active Running Pipelines Section */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            <h2 className="text-sm font-semibold text-slate-900">Active Running Pipelines</h2>
            {activePipelines.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                {activePipelines.length} in progress
              </span>
            )}
          </div>
          <Link
            to="/dashboard/deployments"
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
          >
            All Deployments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activePipelines.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            No active pipeline executions currently running. Ready for git push or manual trigger.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePipelines.map((active) => (
              <Link
                key={active.id}
                to={`/dashboard/pipelines/${active.id}`}
                className="p-4 rounded-xl bg-white border border-blue-200 hover:border-blue-400 transition-all group flex flex-col justify-between space-y-3 shadow-xs hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    {active.project_name || 'Project'}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    {active.current_stage || 'RUNNING'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-mono space-y-1">
                  <div>Branch: <span className="text-slate-800 font-medium">{active.branch_name || 'main'}</span></div>
                  <div className="text-slate-400">
                    Started {active.started_at ? new Date(active.started_at).toLocaleTimeString() : 'Just now'}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
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
            <h2 className="text-base font-semibold text-slate-900">Recent Pipeline Executions</h2>
            <Link
              to="/dashboard/deployments"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
            >
              View Full History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            {recentExecutions.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No pipeline executions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Run</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Branch / Commit</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentExecutions.map((exec) => (
                      <tr
                        key={exec.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/dashboard/pipelines/${exec.id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          #{exec.execution_number || exec.id.substring(0, 7)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {exec.project_name || 'Project'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {exec.branch_name || 'main'} • {exec.commit_sha ? exec.commit_sha.substring(0, 7) : 'HEAD'}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(exec.status)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {formatSec(exec.duration_ms)}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {exec.live_url && (
                              <a
                                href={exec.live_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                title="Open Live Deployment"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <Link
                              to={`/dashboard/pipelines/${exec.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-[11px] font-semibold"
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
          <h2 className="text-base font-semibold text-slate-900">DevOps Navigation</h2>

          {/* Analytics Shortcut Card */}
          <Link
            to="/dashboard/analytics"
            className="block p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Deployment Analytics
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspect build latency trends, success rates, and project reliability charts.
            </p>
          </Link>

          {/* Docker Builds Shortcut Card */}
          <Link
            to="/dashboard/builds"
            className="block p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Container className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Docker Hub Images
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              View generated container images, tags, and automated publishing logs.
            </p>
          </Link>

          {/* Connected Integrations Card */}
          <Link
            to="/dashboard/integrations"
            className="block p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Boxes className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Platform Integrations
            </h3>
            <p className="text-xs text-slate-500 mt-1">
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
