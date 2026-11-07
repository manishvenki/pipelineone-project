import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  StopCircle,
  Layers,
  Tag,
  UploadCloud,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Filter
} from 'lucide-react';
import {
  listDockerBuilds,
  getDockerBuild,
  getDockerBuildLogs,
  cancelDockerBuild,
  checkDockerEngine,
} from '../services/integrationService';
import DockerBuildModal from '../components/builds/DockerBuildModal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const BuildsPage = () => {
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [logs, setLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dockerEngine, setDockerEngine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const [searchParams] = useSearchParams();
  const buildIdQuery = searchParams.get('id');

  const notify = useNotification();
  const { token } = useAuth();
  const terminalEndRef = useRef(null);
  const sseRef = useRef(null);

  // Load initial builds and engine status
  const loadData = async () => {
    try {
      setLoading(true);
      const [buildsRes, engineRes] = await Promise.allSettled([
        listDockerBuilds(),
        checkDockerEngine(),
      ]);

      if (buildsRes.status === 'fulfilled' && buildsRes.value?.builds) {
        setBuilds(buildsRes.value.builds);
        // If query param matches or nothing selected, select first
        const targetId = buildIdQuery || buildsRes.value.builds[0]?.id;
        const initial = buildsRes.value.builds.find((b) => b.id === targetId) || buildsRes.value.builds[0];
        if (initial) {
          setSelectedBuild(initial);
        }
      }

      if (engineRes.status === 'fulfilled') {
        setDockerEngine(engineRes.value);
      }
    } catch (err) {
      console.error('Failed to load builds', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [buildIdQuery]);

  // Connect SSE or fetch logs whenever selectedBuild changes
  useEffect(() => {
    if (!selectedBuild) {
      setLogs([]);
      return;
    }

    // Clean up previous SSE
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const fetchStaticLogs = async () => {
      try {
        const res = await getDockerBuildLogs(selectedBuild.id);
        if (res.logs) {
          setLogs(res.logs);
        }
      } catch (err) {
        console.error('Failed to fetch build logs', err);
      }
    };

    fetchStaticLogs();

    // If build is currently queued or in_progress, connect SSE stream
    if (['queued', 'in_progress'].includes(selectedBuild.status)) {
      const sseUrl = `/api/docker/builds/${selectedBuild.id}/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const es = new EventSource(sseUrl);
      sseRef.current = es;

      es.addEventListener('initial_log', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data.logs)) {
            setLogs(data.logs);
          }
        } catch (err) {}
      });

      es.addEventListener('log', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.line) {
            setLogs((prev) => [...prev, data.line]);
          }
        } catch (err) {}
      });

      es.addEventListener('status', (e) => {
        try {
          const data = JSON.parse(e.data);
          setSelectedBuild((prev) => (prev ? { ...prev, ...data } : prev));
          setBuilds((prevList) =>
            prevList.map((item) => (item.id === selectedBuild.id ? { ...item, ...data } : item))
          );
          if (['completed', 'failed', 'cancelled'].includes(data.status)) {
            es.close();
          }
        } catch (err) {}
      });

      es.onerror = () => {
        es.close();
      };
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [selectedBuild?.id, selectedBuild?.status, token]);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCancelBuild = async () => {
    if (!selectedBuild) return;
    try {
      setCancelling(true);
      await cancelDockerBuild(selectedBuild.id);
      notify.success('Build cancellation signal dispatched');
      setSelectedBuild((prev) => ({ ...prev, status: 'cancelled' }));
      setBuilds((prev) =>
        prev.map((b) => (b.id === selectedBuild.id ? { ...b, status: 'cancelled' } : b))
      );
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to cancel build');
    } finally {
      setCancelling(false);
    }
  };

  const copyAllLogs = () => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredBuilds = builds.filter((b) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'running') return ['queued', 'in_progress'].includes(b.status);
    return b.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Loader2 className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <StopCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Container className="w-6 h-6 text-blue-400" />
            Docker Container Builds
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build, containerize, and stream real-time logs for static website deployments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
            title="Refresh builds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsBuildModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-900/30"
          >
            <Play className="w-4 h-4 fill-white" />
            New Docker Build
          </button>
        </div>
      </div>

      {/* Docker Engine status banner if daemon is offline */}
      {dockerEngine && !dockerEngine.available && (
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-300">Docker Engine Daemon Inactive</h4>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              The local Docker CLI is installed ({dockerEngine.cliVersion || 'detected'}), but the Docker daemon is unreachable. Builds will fail until Docker Desktop or the system Docker service is started.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Builds list + Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Build History List */}
        <div className="lg:col-span-4 space-y-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
            {['all', 'running', 'completed', 'failed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium capitalize transition ${
                  statusFilter === tab
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Builds cards */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredBuilds.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                No Docker builds match the selected filter.
              </div>
            ) : (
              filteredBuilds.map((b) => {
                const isSelected = selectedBuild?.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBuild(b)}
                    className={`w-full text-left p-3.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-blue-950/20 border-blue-500/60 ring-1 ring-blue-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white truncate max-w-[180px]">
                        {b.project_name || 'Project'}
                      </span>
                      {getStatusBadge(b.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{b.image_name}:{b.image_tag}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/60">
                      <span>{new Date(b.created_at).toLocaleTimeString()}</span>
                      {b.duration_seconds !== null && b.duration_seconds !== undefined && (
                        <span>{b.duration_seconds}s</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Build Console Terminal & Specs */}
        <div className="lg:col-span-8 space-y-4">
          {selectedBuild ? (
            <>
              {/* Build Details Card */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Container className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {selectedBuild.image_name}:{selectedBuild.image_tag}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Project: <strong className="text-slate-200">{selectedBuild.project_name}</strong> &bull; ID: <span className="font-mono">{selectedBuild.id.slice(0, 8)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedBuild.status)}
                    {['queued', 'in_progress'].includes(selectedBuild.status) && (
                      <button
                        onClick={handleCancelBuild}
                        disabled={cancelling}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Base Runtime</span>
                    <span className="font-mono text-slate-200 truncate block">
                      {selectedBuild.project_type === 'react_vite' ? 'node:20 / nginx' : 'nginx:alpine-slim'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Registry Target</span>
                    <span className="font-mono text-slate-200 truncate block">
                      {selectedBuild.push_to_dockerhub ? (selectedBuild.destination_repo || 'Docker Hub') : 'Local Docker Engine'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration</span>
                    <span className="font-mono text-slate-200 block">
                      {selectedBuild.duration_seconds ? `${selectedBuild.duration_seconds} seconds` : 'Running...'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Started</span>
                    <span className="text-slate-200 block">
                      {new Date(selectedBuild.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedBuild.error_message && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Build Error Details:</strong>
                      <span className="font-mono text-[11px]">{selectedBuild.error_message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal View */}
              <div className="bg-[#0b0f19] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span className="font-mono font-medium text-slate-300">build.log</span>
                    {['queued', 'in_progress'].includes(selectedBuild.status) && (
                      <span className="flex items-center gap-1 text-[11px] text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        streaming live
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-3 h-3"
                      />
                      <span>Auto-scroll</span>
                    </label>

                    <button
                      onClick={copyAllLogs}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Terminal Content */}
                <div className="p-4 font-mono text-xs text-slate-300 max-h-[460px] min-h-[300px] overflow-y-auto space-y-1 select-text">
                  {logs.length === 0 ? (
                    <div className="text-slate-600 italic py-8 text-center">
                      Waiting for build output or log initialization...
                    </div>
                  ) : (
                    logs.map((line, idx) => {
                      const isErr = line.includes('ERROR') || line.includes('failed') || line.includes('error:');
                      const isSuccess = line.includes('SUCCESS') || line.includes('Successfully tagged') || line.includes('naming to docker.io');
                      const isStep = line.startsWith('Step ') || line.startsWith('[+] Building') || line.includes('#');

                      return (
                        <div
                          key={idx}
                          className={`leading-relaxed whitespace-pre-wrap break-all ${
                            isErr
                              ? 'text-rose-400'
                              : isSuccess
                              ? 'text-emerald-400'
                              : isStep
                              ? 'text-blue-300 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

              {/* Success / Image Info Card */}
              {selectedBuild.status === 'completed' && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Image Ready for Deployment
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">
                      docker run -d -p 8080:80 {selectedBuild.image_name}:{selectedBuild.image_tag}
                    </div>
                  </div>

                  {selectedBuild.push_to_dockerhub && selectedBuild.destination_repo && (
                    <a
                      href={`https://hub.docker.com/r/${selectedBuild.destination_repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on Docker Hub
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <Container className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium">Select a build from the history to view real-time console output</p>
              <button
                onClick={() => setIsBuildModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Trigger First Build
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trigger Modal */}
      <DockerBuildModal
        isOpen={isBuildModalOpen}
        onClose={() => setIsBuildModalOpen(false)}
        onBuildTriggered={(newBuild) => {
          setBuilds((prev) => [newBuild, ...prev]);
          setSelectedBuild(newBuild);
        }}
      />
    </div>
  );
};

export default BuildsPage;
