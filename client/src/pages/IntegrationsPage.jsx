import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  Boxes,
  Container,
  Layers,
  Triangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { disconnectGitHub } from '../services/githubService';
import { useNotification } from '../context/NotificationContext';
import Badge from '../components/common/Badge';
import ConnectGitHubModal from '../components/integrations/ConnectGitHubModal';

export const IntegrationsPage = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const notify = useNotification();

  // Handle OAuth callback redirect parameters
  useEffect(() => {
    const status = searchParams.get('status');
    const username = searchParams.get('username');
    const message = searchParams.get('message');

    if (status === 'success') {
      notify.success(`GitHub account @${username || ''} connected successfully!`);
      refreshUser();
      // Remove query parameters from URL
      setSearchParams({});
    } else if (status === 'error') {
      notify.error(message ? decodeURIComponent(message) : 'GitHub authorization failed');
      setSearchParams({});
    }
  }, [searchParams, notify, refreshUser, setSearchParams]);

  const isGitHubConnected = Boolean(user?.integrations?.github?.connected);
  const githubUsername = user?.integrations?.github?.username;
  const githubConnectedAt = user?.integrations?.github?.connectedAt;

  const handleDisconnectGitHub = async () => {
    if (!window.confirm('Are you sure you want to disconnect your GitHub integration?')) {
      return;
    }

    try {
      setDisconnecting(true);
      await disconnectGitHub();
      notify.success('GitHub disconnected successfully');
      await refreshUser();
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to disconnect GitHub');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Integrations Hub</h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect your version control, container registries, and continuous deployment providers.
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. GitHub Card (Real implementation) */}
        <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#24292F] flex items-center justify-center text-white border border-slate-700 shadow-md">
                  <Github className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">GitHub</h3>
                  <p className="text-xs text-slate-400">Source code repository & branch tracking</p>
                </div>
              </div>

              {isGitHubConnected ? (
                <Badge variant="success" size="sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="default" size="sm">
                  Not Connected
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your GitHub account using OAuth authorization or Personal Access Token. 
              Enables browsing repositories, inspecting directory trees, and importing static projects with encrypted credential storage.
            </p>

            {isGitHubConnected && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Authorized Username:</span>
                  <span className="text-blue-400 font-semibold">@{githubUsername}</span>
                </div>
                {githubConnectedAt && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Linked On:</span>
                    <span>{new Date(githubConnectedAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Credentials secured with AES-256-GCM
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">Status: Phase 1 Active</span>

            {isGitHubConnected ? (
              <button
                onClick={handleDisconnectGitHub}
                disabled={disconnecting}
                className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Disconnecting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Connect GitHub
              </button>
            )}
          </div>
        </div>

        {/* 2. Docker Hub Card (Phase 2) */}
        <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-5 opacity-80">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-950/60 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Container className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Docker Hub</h3>
                  <p className="text-xs text-slate-400">Container image registry & builder</p>
                </div>
              </div>
              <Badge variant="comingSoon" size="sm">
                Coming Soon
              </Badge>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Automate container packaging for static applications, tag artifacts, and push production image manifests directly to Docker Hub.
            </p>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-500">
              Scheduled for integration in <span className="text-blue-400 font-semibold">Phase 2</span>.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">Phase 2</span>
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-medium rounded-xl cursor-not-allowed"
            >
              Coming in Phase 2
            </button>
          </div>
        </div>

        {/* 3. Jenkins Card (Phase 3) */}
        <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-5 opacity-80">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-950/60 flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <Layers className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Jenkins</h3>
                  <p className="text-xs text-slate-400">CI/CD pipeline execution server</p>
                </div>
              </div>
              <Badge variant="comingSoon" size="sm">
                Coming Soon
              </Badge>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Trigger automated test runners, static site linters, and pipeline builds through secure Jenkins webhooks and job controllers.
            </p>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-500">
              Scheduled for integration in <span className="text-purple-400 font-semibold">Phase 3</span>.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">Phase 3</span>
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-medium rounded-xl cursor-not-allowed"
            >
              Coming in Phase 3
            </button>
          </div>
        </div>

        {/* 4. Vercel Card (Phase 4) */}
        <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-5 opacity-80">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white border border-slate-800">
                  <Triangle className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Vercel</h3>
                  <p className="text-xs text-slate-400">Edge static site deployment & CDN</p>
                </div>
              </div>
              <Badge variant="comingSoon" size="sm">
                Coming Soon
              </Badge>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Deploy static assets directly to Vercel global edge network with instant preview URLs and automated SSL configuration.
            </p>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-500">
              Scheduled for integration in <span className="text-slate-300 font-semibold">Phase 4</span>.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">Phase 4</span>
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-medium rounded-xl cursor-not-allowed"
            >
              Coming in Phase 4
            </button>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      <ConnectGitHubModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={() => refreshUser()}
      />
    </div>
  );
};

export default IntegrationsPage;
