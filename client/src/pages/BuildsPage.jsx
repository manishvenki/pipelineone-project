import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  StopCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
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

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const fetchPastLogs = async () => {
      try {
        const res = await getDockerBuildLogs(selectedBuild.id);
        if (res.logs) {
          setLogs(res.logs.map((l) => (typeof l === 'string' ? l : l.line || JSON.stringify(l))));
        }
      } catch (err) {
        console.error('Failed to load past logs', err);
      }
    };

    fetchPastLogs();

    if (['queued', 'in_progress'].includes(selectedBuild.status)) {
      const sseUrl = `/api/integrations/docker/builds/${selectedBuild.id}/stream?token=${encodeURIComponent(token || '')}`;
      const es = new EventSource(sseUrl);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.line) {
            setLogs((prev) => [...prev, data.line]);
          }
          if (data.status) {
            setSelectedBuild((prev) => ({ ...prev, status: data.status }));
            if (['completed', 'failed', 'cancelled'].includes(data.status)) {
              es.close();
              loadData();
            }
          }
        } catch {
          // ignore parsing error
        }
      };

      es.onerror = () => {
        es.close();
      };

      sseRef.current = es;
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [selectedBuild?.id, selectedBuild?.status]);

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
      notify.success('Build cancellation requested');
      loadData();
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Failed to cancel build');
    } finally {
      setCancelling(false);
    }
  };

  const copyAllLogs = () => {
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> In Progress
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <StopCircle className="w-3 h-3 text-slate-500" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Container className="w-6 h-6 text-blue-600" />
            Docker Container Builds
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build, containerize, and stream real-time logs for static website deployments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition shadow-xs"
            title="Refresh builds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsBuildModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            New Docker Build
          </button>
        </div>
      </div>

      {/* Docker Engine status banner if daemon is offline */}
      {dockerEngine && !dockerEngine.available && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900">Docker Engine Daemon Inactive</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
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
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            {['all', 'running', 'completed', 'failed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold capitalize transition ${
                  statusFilter === tab
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Builds cards */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredBuilds.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs shadow-sm">
                No Docker builds match the selected filter.
              </div>
            ) : (
              filteredBuilds.map((b) => {
                const isSelected = selectedBuild?.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBuild(b)}
                    className={`w-full text-left p-3.5 rounded-xl border transition shadow-xs ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                        {b.project_name || 'Project'}
                      </span>
                      {getStatusBadge(b.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                      <span>{b.image_name}:{b.image_tag}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                      <span>{new Date(b.created_at).toLocaleTimeString()}</span>
                      {b.duration_seconds !== null && b.duration_seconds !== undefined && (
                        <span className="font-medium text-slate-600">{b.duration_seconds}s</span>
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
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                      <Container className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {selectedBuild.image_name}:{selectedBuild.image_tag}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Project: <strong className="text-slate-800">{selectedBuild.project_name}</strong> &bull; ID: <span className="font-mono">{selectedBuild.id.slice(0, 8)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedBuild.status)}
                    {['queued', 'in_progress'].includes(selectedBuild.status) && (
                      <button
                        onClick={handleCancelBuild}
                        disabled={cancelling}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block font-medium">Base Runtime</span>
                    <span className="font-mono text-slate-800 font-semibold truncate block">
                      {selectedBuild.project_type === 'react_vite' ? 'node:20 / nginx' : 'nginx:alpine-slim'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Registry Target</span>
                    <span className="font-mono text-slate-800 font-semibold truncate block">
                      {selectedBuild.push_to_dockerhub ? (selectedBuild.destination_repo || 'Docker Hub') : 'Local Docker Engine'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Duration</span>
                    <span className="font-mono text-slate-800 font-semibold block">
                      {selectedBuild.duration_seconds ? `${selectedBuild.duration_seconds} seconds` : 'Running...'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Started</span>
                    <span className="text-slate-800 font-medium block">
                      {new Date(selectedBuild.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedBuild.error_message && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Build Error Details:</strong>
                      <span className="font-mono text-[11px]">{selectedBuild.error_message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal View */}
              <div className="bg-[#0B0F19] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span className="font-mono font-medium text-slate-200">build.log</span>
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
                <div className="p-4 font-mono text-xs text-slate-200 max-h-[460px] min-h-[300px] overflow-y-auto space-y-1 select-text">
                  {logs.length === 0 ? (
                    <div className="text-slate-500 italic py-8 text-center">
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
                              ? 'text-red-400'
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
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Image Ready for Deployment
                    </div>
                    <div className="text-slate-700 font-mono text-[11px]">
                      docker run -d -p 8080:80 {selectedBuild.image_name}:{selectedBuild.image_tag}
                    </div>
                  </div>

                  {selectedBuild.push_to_dockerhub && selectedBuild.destination_repo && (
                    <a
                      href={`https://hub.docker.com/r/${selectedBuild.destination_repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on Docker Hub
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3 shadow-sm">
              <Container className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Select a build from the history to view real-time console output</p>
              <button
                onClick={() => setIsBuildModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
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
