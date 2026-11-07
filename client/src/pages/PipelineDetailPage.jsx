import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  RotateCw,
  Ban,
  ExternalLink,
  GitBranch,
  GitCommit,
  Clock,
  Calendar,
  Layers,
  Container,
  Rocket,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FolderGit2,
} from 'lucide-react';
import {
  getPipelineDetails,
  getPipelineStages,
  getPipelineLogs,
  createPipelineMonitoringStream,
} from '../services/monitoringService';
import { cancelPipeline, retryPipeline } from '../services/pipelineService';
import Pipeline10StageVisualizer from '../components/monitoring/Pipeline10StageVisualizer';
import LiveTerminalLogViewer from '../components/monitoring/LiveTerminalLogViewer';
import { useNotification } from '../context/NotificationContext';

export const PipelineDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotification ? useNotification() : null;

  const [execution, setExecution] = useState(null);
  const [stages, setStages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState(null);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);

  // Initial load
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [execData, stageData, logData] = await Promise.all([
        getPipelineDetails(id),
        getPipelineStages(id),
        getPipelineLogs(id),
      ]);

      if (execData && execData.execution) {
        setExecution(execData.execution);
      }
      if (stageData && stageData.stages) {
        setStages(stageData.stages);
      }
      if (logData && logData.logs) {
        setLogs(logData.logs);
      }
    } catch (err) {
      console.error('Failed to load pipeline details:', err);
      setError(err.response?.data?.message || 'Failed to load pipeline execution details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [id]);

  // Real-time SSE streaming connection
  useEffect(() => {
    if (!id) return;

    // Connect SSE stream
    const es = createPipelineMonitoringStream(
      id,
      (data) => {
        // Handle incoming message
        if (data.eventType === 'stage_transition' || data.eventType === 'stage_event') {
          setStages((prevStages) => {
            const updated = [...prevStages];
            const existingIdx = updated.findIndex((s) => s.stage_name === data.stage);
            if (existingIdx >= 0) {
              updated[existingIdx] = {
                ...updated[existingIdx],
                stage_status: data.status,
                duration_ms: data.duration_ms || updated[existingIdx].duration_ms,
                error_message: data.error_message || updated[existingIdx].error_message,
              };
            } else {
              updated.push({
                stage_name: data.stage,
                stage_status: data.status,
                duration_ms: data.duration_ms,
                error_message: data.error_message,
              });
            }
            return updated;
          });
        }

        if (data.eventType === 'log' || data.message || data.text) {
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              stage: data.stage || 'GENERAL',
              level: data.level || 'INFO',
              message: data.message || data.text,
              timestamp: data.timestamp || new Date().toISOString().substring(11, 19),
            },
          ]);
        }

        if (data.eventType === 'pipeline_status' || data.status) {
          setExecution((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: data.status,
              live_url: data.live_url || data.deployment_url || prev.live_url,
              deployment_url: data.deployment_url || prev.deployment_url,
              error_message: data.error_message || prev.error_message,
            };
          });
        }
      },
      (err) => {
        // SSE error callback
      },
      (status) => {
        setStreamStatus(status);
      }
    );

    eventSourceRef.current = es;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [id]);

  // Cancel execution
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this pipeline execution?')) return;
    try {
      setActionLoading(true);
      await cancelPipeline(id);
      if (notify) notify.success('Pipeline cancellation requested.');
      loadInitialData();
    } catch (err) {
      if (notify) notify.error(err.response?.data?.message || 'Failed to cancel pipeline.');
    } finally {
      setActionLoading(false);
    }
  };

  // Retry execution
  const handleRetry = async () => {
    try {
      setActionLoading(true);
      const res = await retryPipeline(id);
      if (notify) notify.success('Pipeline execution retrying.');
      if (res?.execution?.id) {
        navigate(`/dashboard/pipelines/${res.execution.id}`);
      } else {
        loadInitialData();
      }
    } catch (err) {
      if (notify) notify.error(err.response?.data?.message || 'Failed to retry pipeline.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'running':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading pipeline execution details...</p>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Execution Not Found</h2>
          <p className="text-sm text-slate-400">{error || 'This pipeline execution does not exist.'}</p>
          <Link
            to="/dashboard/deployments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-medium hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Deployments
          </Link>
        </div>
      </div>
    );
  }

  const isRunning = execution.status === 'running' || execution.status === 'in_progress';
  const isFailed = execution.status === 'failed';
  const liveUrl = execution.live_url || execution.deployment_url;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/deployments"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Deployments"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Execution #{execution.execution_number || execution.id?.substring(0, 8)}
              </h1>
              {getStatusBadge(execution.status)}
              <span className="text-xs font-mono text-slate-500">ID: {execution.id}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Project: </span>
              <strong className="text-slate-200">{execution.project_name || 'Static Project'}</strong>
              <span>•</span>
              <span className="text-slate-400">Trigger: {execution.trigger_type || 'manual'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {isRunning && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              <span>Cancel Run</span>
            </button>
          )}

          {!isRunning && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Retry Pipeline</span>
            </button>
          )}

          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Live Site</span>
            </a>
          )}
        </div>
      </div>

      {/* Commit & Execution Metadata Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 text-[11px] block">Branch</span>
          <div className="font-mono text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
            <GitBranch className="w-3.5 h-3.5 text-blue-400" />
            {execution.branch_name || 'main'}
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[11px] block">Commit</span>
          <div className="font-mono text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
            <GitCommit className="w-3.5 h-3.5 text-blue-400" />
            {execution.commit_sha ? execution.commit_sha.substring(0, 7) : 'HEAD'}
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[11px] block">Started At</span>
          <div className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {execution.started_at ? new Date(execution.started_at).toLocaleString() : 'Just now'}
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[11px] block">Duration</span>
          <div className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {execution.duration_ms
              ? `${Math.round(execution.duration_ms / 1000)}s`
              : isRunning
              ? 'Timing...'
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* 10-Stage Visualizer */}
      <Pipeline10StageVisualizer
        stages={stages}
        selectedStageKey={selectedStageFilter}
        onSelectStage={(stageKey) => {
          setSelectedStageFilter((prev) => (prev === stageKey ? null : stageKey));
        }}
      />

      {/* Deployment & Container Status Artifact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Docker Hub Artifact Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Container className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-white">Docker Hub Container</span>
            </div>
            {execution.docker_published ? (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Published
              </span>
            ) : execution.docker_image_tag ? (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Built Locally
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Not configured / Skipped</span>
            )}
          </div>

          <div className="text-xs text-slate-400 space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Repository Image:</span>
              <span className="font-mono text-slate-300">
                {execution.docker_image_name || execution.docker_image_tag || 'pipelineone/static-site'}
              </span>
            </div>
            {execution.docker_image_tag && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Image Tag:</span>
                <span className="font-mono text-slate-300">{execution.docker_image_tag}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vercel Deployment Artifact Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Rocket className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-white">Vercel Production Deployment</span>
            </div>
            {liveUrl ? (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live & Verified
              </span>
            ) : isRunning ? (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
                Deploying...
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Pending</span>
            )}
          </div>

          <div className="text-xs text-slate-400 space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Live URL:</span>
              {liveUrl ? (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {liveUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Terminal Log Viewer */}
      <LiveTerminalLogViewer
        logs={logs}
        filterStage={selectedStageFilter}
        onClearFilterStage={() => setSelectedStageFilter(null)}
        isStreaming={isRunning}
        streamStatus={streamStatus}
      />
    </div>
  );
};

export default PipelineDetailPage;
