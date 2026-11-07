import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  Container,
  Server,
  Triangle,
  Loader2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Layers,
  ArrowRight,
  Clock,
  Activity,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { disconnectGitHub } from '../services/githubService';
import {
  getAllIntegrationsStatus,
  verifyDockerHub,
  disconnectDockerHub,
  verifyJenkins,
  disconnectJenkins,
  verifyVercel,
  disconnectVercel,
} from '../services/integrationService';
import { useNotification } from '../context/NotificationContext';
import Badge from '../components/common/Badge';
import ConnectGitHubModal from '../components/integrations/ConnectGitHubModal';
import ConnectDockerHubModal from '../components/integrations/ConnectDockerHubModal';
import ConnectJenkinsModal from '../components/integrations/ConnectJenkinsModal';
import ConnectVercelModal from '../components/integrations/ConnectVercelModal';
import IntegrationWizardModal from '../components/integrations/IntegrationWizardModal';
import IntegrationDetailsModal from '../components/integrations/IntegrationDetailsModal';

export const IntegrationsPage = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [integrations, setIntegrations] = useState({
    github: { connected: false },
    dockerhub: { connected: false },
    jenkins: { connected: false },
    vercel: { connected: false },
  });

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState({});
  const [disconnecting, setDisconnecting] = useState({});
  const [latencies, setLatencies] = useState({});

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'github' | 'dockerhub' | 'jenkins' | 'vercel'
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, provider: null, accountName: '' });

  const notify = useNotification();

  // Load all integrations status
  const loadIntegrationsStatus = async () => {
    try {
      setLoading(true);
      const res = await getAllIntegrationsStatus();
      if (res.integrations) {
        setIntegrations(res.integrations);
      }
    } catch (err) {
      console.error('Failed to load integrations status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrationsStatus();
  }, []);

  // Handle OAuth callback redirect parameters (GitHub & Vercel)
  useEffect(() => {
    const status = searchParams.get('status');
    const provider = searchParams.get('provider') || 'GitHub';
    const username = searchParams.get('username');
    const message = searchParams.get('message');

    if (status === 'success') {
      notify.success(`${provider} account ${username ? `@${username}` : ''} connected successfully!`);
      refreshUser();
      loadIntegrationsStatus();
      setSearchParams({});
    } else if (status === 'error') {
      notify.error(message ? decodeURIComponent(message) : `${provider} authorization failed`);
      setSearchParams({});
    }
  }, [searchParams]);

  // Verification handlers
  const handleVerify = async (provider) => {
    try {
      setVerifying((prev) => ({ ...prev, [provider]: true }));
      let res;
      if (provider === 'dockerhub') res = await verifyDockerHub();
      else if (provider === 'jenkins') res = await verifyJenkins();
      else if (provider === 'vercel') res = await verifyVercel();

      if (res?.success) {
        notify.success(`${provider.toUpperCase()} connection verified (${res.responseTimeMs || 0}ms)`);
        setLatencies((prev) => ({ ...prev, [provider]: res.responseTimeMs }));
        loadIntegrationsStatus();
      }
    } catch (err) {
      notify.error(err.response?.data?.error || `Failed to verify ${provider}`);
    } finally {
      setVerifying((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Disconnect handlers
  const handleDisconnect = async (provider) => {
    if (!window.confirm(`Are you sure you want to disconnect ${provider.toUpperCase()}?`)) {
      return;
    }

    try {
      setDisconnecting((prev) => ({ ...prev, [provider]: true }));
      if (provider === 'github') await disconnectGitHub();
      else if (provider === 'dockerhub') await disconnectDockerHub();
      else if (provider === 'jenkins') await disconnectJenkins();
      else if (provider === 'vercel') await disconnectVercel();

      notify.success(`${provider.toUpperCase()} disconnected successfully`);
      await refreshUser();
      await loadIntegrationsStatus();
    } catch (err) {
      notify.error(err.response?.data?.error || `Failed to disconnect ${provider}`);
    } finally {
      setDisconnecting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const openDetails = (provider, accountName) => {
    setDetailsModal({
      isOpen: true,
      provider,
      accountName,
    });
  };

  const isGh = Boolean(integrations.github?.connected || user?.integrations?.github?.connected);
  const ghUser = integrations.github?.username || user?.integrations?.github?.username;

  const isDh = Boolean(integrations.dockerhub?.connected);
  const dhUser = integrations.dockerhub?.username;

  const isJk = Boolean(integrations.jenkins?.connected);
  const jkServer = integrations.jenkins?.serverUrl || integrations.jenkins?.server_url;
  const jkUser = integrations.jenkins?.username;

  const isVc = Boolean(integrations.vercel?.connected);
  const vcUser = integrations.vercel?.username;

  const connectedTotal = [isGh, isDh, isJk, isVc].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Wizard Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            DevOps Integrations Hub
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Phase 2 Active
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect and manage external platforms: Source Control, Container Registries, CI/CD Servers, and Edge CDNs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 mr-1 hidden sm:block">
            <span className="text-white font-semibold font-mono">{connectedTotal}/4</span> Connected
          </div>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-blue-900/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch Setup Wizard
          </button>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ==================================================== */}
        {/* 1. GITHUB INTEGRATION */}
        {/* ==================================================== */}
        <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
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

              {isGh ? (
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
              Connect your GitHub account using OAuth 2.0 or a Personal Access Token. Enables automated static project detection, repository browsing, and directory imports.
            </p>

            {isGh ? (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Authorized Username:</span>
                  <span className="text-blue-400 font-semibold">@{ghUser}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Credentials secured with AES-256-GCM
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                Requires repository read access. No code modifications performed without permission.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {isGh ? (
              <>
                <button
                  onClick={() => openDetails('github', `@${ghUser}`)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-purple-400" /> View Repos
                </button>

                <button
                  onClick={() => handleDisconnect('github')}
                  disabled={disconnecting.github}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {disconnecting.github ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveModal('github')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Connect GitHub
              </button>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* 2. DOCKER HUB INTEGRATION */}
        {/* ==================================================== */}
        <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-950/60 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-md">
                  <Container className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Docker Hub</h3>
                  <p className="text-xs text-slate-400">Container image registry & artifact publisher</p>
                </div>
              </div>

              {isDh ? (
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
              Connect Docker Hub using a Personal Access Token (PAT). Build Nginx alpine images directly from static source code and publish tags to your container registry.
            </p>

            {isDh ? (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Username:</span>
                  <span className="text-blue-400 font-semibold">{dhUser}</span>
                </div>
                {latencies.dockerhub && (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Registry Latency:</span>
                    <span className="text-emerald-400">{latencies.dockerhub}ms</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Docker Hub v2 Registry API active
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                Requires a Personal Access Token (PAT) with Read/Write permissions.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {isDh ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify('dockerhub')}
                    disabled={verifying.dockerhub}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                    title="Verify registry token"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifying.dockerhub ? 'animate-spin' : ''}`} />
                    Verify
                  </button>
                  <button
                    onClick={() => openDetails('dockerhub', dhUser)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                  >
                    <Container className="w-3.5 h-3.5 text-blue-400" /> Repos
                  </button>
                </div>

                <button
                  onClick={() => handleDisconnect('dockerhub')}
                  disabled={disconnecting.dockerhub}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {disconnecting.dockerhub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveModal('dockerhub')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Docker Hub
              </button>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3. JENKINS INTEGRATION */}
        {/* ==================================================== */}
        <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-md">
                  <Server className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Jenkins</h3>
                  <p className="text-xs text-slate-400">CI/CD pipeline orchestrator</p>
                </div>
              </div>

              {isJk ? (
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
              Connect a Jenkins automation server using HTTP Basic Auth and an API Token. SSRF protection prevents unauthorized internal network or cloud metadata access.
            </p>

            {isJk ? (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Server URL:</span>
                  <span className="text-amber-400 font-semibold truncate max-w-[200px]">{jkServer}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>API User:</span>
                  <span className="text-slate-200">{jkUser}</span>
                </div>
                {latencies.jenkins && (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Ping Latency:</span>
                    <span className="text-emerald-400">{latencies.jenkins}ms</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> SSRF-guarded & CSRF Crumb ready
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                Requires server URL, username, and user API Token (passwords are prohibited).
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {isJk ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify('jenkins')}
                    disabled={verifying.jenkins}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                    title="Verify Jenkins status"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifying.jenkins ? 'animate-spin' : ''}`} />
                    Verify
                  </button>
                  <button
                    onClick={() => openDetails('jenkins', jkServer)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> Jobs
                  </button>
                </div>

                <button
                  onClick={() => handleDisconnect('jenkins')}
                  disabled={disconnecting.jenkins}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {disconnecting.jenkins ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveModal('jenkins')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-xl transition shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Jenkins
              </button>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* 4. VERCEL INTEGRATION */}
        {/* ==================================================== */}
        <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-white border border-slate-700 shadow-md">
                  <Triangle className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Vercel</h3>
                  <p className="text-xs text-slate-400">Edge static site deployment & CDN</p>
                </div>
              </div>

              {isVc ? (
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
              Authorize Vercel via OAuth 2.0 or Personal Access Token. Query user projects, configure deployment targets, and prepare projects for edge delivery.
            </p>

            {isVc ? (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Authorized User:</span>
                  <span className="text-white font-semibold">@{vcUser}</span>
                </div>
                {latencies.vercel && (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>API Latency:</span>
                    <span className="text-emerald-400">{latencies.vercel}ms</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Vercel v2 API connected
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                Connect via OAuth redirect or Personal Access Token from Vercel Account settings.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {isVc ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify('vercel')}
                    disabled={verifying.vercel}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                    title="Verify Vercel token"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifying.vercel ? 'animate-spin' : ''}`} />
                    Verify
                  </button>
                  <button
                    onClick={() => openDetails('vercel', `@${vcUser}`)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                  >
                    <Triangle className="w-3.5 h-3.5 fill-white" /> Projects
                  </button>
                </div>

                <button
                  onClick={() => handleDisconnect('vercel')}
                  disabled={disconnecting.vercel}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {disconnecting.vercel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveModal('vercel')}
                className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Vercel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}

      {/* 1. GitHub Modal */}
      <ConnectGitHubModal
        isOpen={activeModal === 'github'}
        onClose={() => setActiveModal(null)}
        onConnected={() => {
          refreshUser();
          loadIntegrationsStatus();
        }}
      />

      {/* 2. Docker Hub Modal */}
      <ConnectDockerHubModal
        isOpen={activeModal === 'dockerhub'}
        onClose={() => setActiveModal(null)}
        onConnected={() => {
          loadIntegrationsStatus();
        }}
      />

      {/* 3. Jenkins Modal */}
      <ConnectJenkinsModal
        isOpen={activeModal === 'jenkins'}
        onClose={() => setActiveModal(null)}
        onConnected={() => {
          loadIntegrationsStatus();
        }}
      />

      {/* 4. Vercel Modal */}
      <ConnectVercelModal
        isOpen={activeModal === 'vercel'}
        onClose={() => setActiveModal(null)}
        onConnected={() => {
          loadIntegrationsStatus();
        }}
      />

      {/* 5. Guided Wizard Modal */}
      <IntegrationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        integrations={integrations}
        onOpenConnectModal={(provider) => setActiveModal(provider)}
      />

      {/* 6. Integration Details Modal */}
      <IntegrationDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, provider: null, accountName: '' })}
        provider={detailsModal.provider}
        accountName={detailsModal.accountName}
      />
    </div>
  );
};

export default IntegrationsPage;
