import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjects, getUserActivity } from '../services/projectService';
import Badge from '../components/common/Badge';
import ConnectGitHubModal from '../components/integrations/ConnectGitHubModal';
import RepoSelectorModal from '../components/projects/RepoSelectorModal';
import UploadZipModal from '../components/projects/UploadZipModal';

export const DashboardPage = () => {
  const { user, refreshUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isConnectGitHubOpen, setIsConnectGitHubOpen] = useState(false);
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [isUploadZipOpen, setIsUploadZipOpen] = useState(false);

  const isGitHubConnected = Boolean(user?.integrations?.github?.connected);
  const githubUsername = user?.integrations?.github?.username;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [projData, actData] = await Promise.all([
        getProjects(),
        getUserActivity(8),
      ]);
      setProjects(projData.projects || []);
      setActivities(actData.activities || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImportRepo = () => {
    if (isGitHubConnected) {
      setIsRepoSelectorOpen(true);
    } else {
      setIsConnectGitHubOpen(true);
    }
  };

  // Connected platforms count (real count, no fabrication)
  const connectedPlatformsCount = [
    user?.integrations?.github?.connected,
    user?.integrations?.dockerhub?.connected,
    user?.integrations?.jenkins?.connected,
    user?.integrations?.vercel?.connected,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            DevOps Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, <span className="text-slate-200 font-medium">{user?.name}</span>. Monitor your repositories and static deployments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadZipOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-slate-400" />
            Upload ZIP
          </button>
          <button
            onClick={handleOpenImportRepo}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Import Project
          </button>
        </div>
      </div>

      {/* GitHub Connection Banner */}
      {isGitHubConnected ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#24292F] flex items-center justify-center text-white border border-slate-700 shrink-0">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">GitHub Account Connected</span>
                <Badge variant="success" size="xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized as <span className="text-blue-400 font-mono">@{githubUsername}</span> with encrypted token storage.
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
              <Github className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">GitHub is Not Connected</span>
                <Badge variant="warning" size="xs">Action Needed</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your GitHub account to access repositories, sync branches, and inspect static web projects.
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

      {/* Metric Cards (Real User Statistics Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{projects.length}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{projects.filter(p => p.source_type === 'github').length} GitHub</span>
            <span>•</span>
            <span>{projects.filter(p => p.source_type === 'zip').length} ZIP Archives</span>
          </div>
        </div>

        {/* Connected Platforms */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Connected Platforms</span>
            <Boxes className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{connectedPlatformsCount} / 4</div>
          <div className="text-[11px] text-slate-500">
            {isGitHubConnected ? 'GitHub connected' : 'No integrations active'}
          </div>
        </div>

        {/* Successful Deployments */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Deployments</span>
            <Rocket className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-amber-400">CI/CD Engine:</span> Scheduled for Phase 2
          </div>
        </div>

        {/* GitHub Status */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>GitHub Sync</span>
            <Github className="w-4 h-4 text-white" />
          </div>
          <div className="text-base font-semibold text-white truncate">
            {isGitHubConnected ? `@${githubUsername}` : 'Disconnected'}
          </div>
          <div className="text-[11px] text-slate-500">
            {isGitHubConnected ? 'Ready for project imports' : 'OAuth / PAT available'}
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: My Projects Snapshot */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Projects</h2>
            <Link
              to="/dashboard/projects"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 text-sm">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/30 rounded-2xl border border-slate-800/80 space-y-4">
              <FolderGit2 className="w-12 h-12 mx-auto text-slate-600" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">No projects connected yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Import an existing repository from your authorized GitHub account or upload a static website ZIP archive.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenImportRepo}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Github className="w-4 h-4" /> Import from GitHub
                </button>
                <button
                  onClick={() => setIsUploadZipOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-all border border-slate-700 flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" /> Upload ZIP
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((proj) => (
                <Link
                  key={proj.id}
                  to={`/dashboard/projects/${proj.id}`}
                  className="block p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                          {proj.name}
                        </span>
                        <Badge variant="primary" size="xs">
                          {proj.project_type}
                        </Badge>
                        <Badge variant="default" size="xs">
                          {proj.source_type === 'github' ? 'GitHub' : 'ZIP Archive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {proj.description || 'Static website project'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500 font-mono">
                      <span>{proj.output_directory ? `Output: ${proj.output_directory}` : ''}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Quick Action Tiles */}
          <div className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={handleOpenImportRepo}
                className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 rounded-xl cursor-pointer transition-all flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Github className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Import GitHub Repo
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Connect and analyze a repository
                  </div>
                </div>
              </div>

              <div
                onClick={() => setIsUploadZipOpen(true)}
                className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 rounded-xl cursor-pointer transition-all flex items-center gap-3.5 group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors">
                    Upload ZIP Archive
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Direct drag-and-drop static site
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Real Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Recent Activity
            </h2>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 space-y-3">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No recent activity records yet.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-800/60 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-slate-300 font-medium break-words">{act.description}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(act.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConnectGitHubModal
        isOpen={isConnectGitHubOpen}
        onClose={() => setIsConnectGitHubOpen(false)}
        onConnected={() => {
          refreshUser();
          loadDashboardData();
        }}
      />

      <RepoSelectorModal
        isOpen={isRepoSelectorOpen}
        onClose={() => setIsRepoSelectorOpen(false)}
        onProjectCreated={() => {
          loadDashboardData();
        }}
      />

      <UploadZipModal
        isOpen={isUploadZipOpen}
        onClose={() => setIsUploadZipOpen(false)}
        onProjectCreated={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
};

export default DashboardPage;
