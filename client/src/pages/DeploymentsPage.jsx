import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Play,
  Settings,
  Webhook,
  RefreshCw,
  GitBranch,
  GitCommit,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  MinusCircle,
  ExternalLink,
  RotateCcw,
  StopCircle,
  Terminal,
  Filter,
  Layers,
  Container,
  Globe,
  ChevronRight,
  X
} from 'lucide-react';
import {
  listPipelineExecutions,
  getPipelineExecution,
  cancelPipelineExecution,
  retryPipelineExecution,
  createExecutionEventSource
} from '../services/pipelineService';
import { getProjects } from '../services/projectService';
import StageProgressionBar from '../components/pipelines/StageProgressionBar';
import PipelineConfigModal from '../components/pipelines/PipelineConfigModal';
import TriggerPipelineModal from '../components/pipelines/TriggerPipelineModal';
import WebhookInfoModal from '../components/pipelines/WebhookInfoModal';
import Badge from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';

export const DeploymentsPage = () => {
  const notify = useNotification();
  const [executions, setExecutions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [modalTargetProject, setModalTargetProject] = useState(null);

  // Active execution detail view
  const [activeExecution, setActiveExecution] = useState(null);
  const [activeEvents, setActiveEvents] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Fetch projects list
  const loadProjects = async () => {
    try {
      const res = await getProjects();
      if (res.projects) {
        setProjects(res.projects);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  // Fetch executions list
  const loadExecutions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (selectedProjectId !== 'all') params.projectId = selectedProjectId;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await listPipelineExecutions(params);
      if (res.executions) {
        setExecutions(res.executions);

        // If an active execution is open, refresh its data
        if (activeExecution) {
          const updated = res.executions.find((e) => e.id === activeExecution.id);
          if (updated) {
            setActiveExecution((prev) => ({ ...prev, ...updated }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load executions', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadExecutions();
  }, [selectedProjectId, statusFilter]);

  // Load execution details & setup SSE
  const selectExecution = async (exec) => {
    setActiveExecution(exec);
    setLoadingDetail(true);

    // Close any prior event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const res = await getPipelineExecution(exec.id);
      if (res.execution) {
        setActiveExecution(res.execution);
        setActiveEvents(res.events || []);
      }

      // If execution is in progress, connect to real-time SSE stream
      const isTerminalState = ['success', 'failed', 'cancelled'].includes(res.execution.status);
      if (!isTerminalState) {
        const es = createExecutionEventSource(
          exec.id,
          (evt) => {
            if (evt.eventType === 'stage_change') {
              setActiveExecution((prev) => prev ? { ...prev, status: evt.status, current_stage: evt.stage } : prev);
            }
            if (evt.eventType === 'done') {
              setActiveExecution((prev) => prev ? { ...prev, status: evt.status, live_url: evt.live_url || prev.live_url } : prev);
              loadExecutions();
            }
            setActiveEvents((prev) => [...prev, evt]);
          },
          (err) => {
            console.error('SSE Error:', err);
          }
        );
        eventSourceRef.current = es;
      }
    } catch (err) {
      notify.error('Failed to load execution details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close SSE stream on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeEvents, autoScroll]);

  // Cancel execution handler
  const handleCancel = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await cancelPipelineExecution(id);
      notify.success('Execution cancelled');
      loadExecutions();
      if (activeExecution?.id === id) {
        selectExecution({ ...activeExecution, status: 'cancelled' });
      }
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Failed to cancel execution');
    }
  };

  // Retry execution handler
  const handleRetry = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await retryPipelineExecution(id);
      notify.success('Retry triggered successfully');
      loadExecutions();
      if (res.execution) {
        selectExecution(res.execution);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Failed to retry execution');
    }
  };

  // Open config modal for a project
  const handleOpenConfig = (projectId) => {
    const proj = projects.find((p) => p.id === projectId) || projects[0];
    if (proj) {
      setModalTargetProject(proj);
      setConfigModalOpen(true);
    } else {
      notify.error('No project available to configure');
    }
  };

  // Open webhook modal for a project
  const handleOpenWebhook = (projectId) => {
    const proj = projects.find((p) => p.id === projectId) || projects[0];
    if (proj) {
      setModalTargetProject(proj);
      setWebhookModalOpen(true);
    } else {
      notify.error('No project available for webhook setup');
    }
  };

  // Calculate KPIs
  const totalExecutions = executions.length;
  const successfulCount = executions.filter((e) => e.status === 'success').length;
  const runningCount = executions.filter((e) =>
    !['success', 'failed', 'cancelled'].includes(e.status)
  ).length;
  const failedCount = executions.filter((e) => e.status === 'failed').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <MinusCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> {status.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Rocket className="w-6 h-6 text-emerald-400" /> CI/CD Deployments Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated static website delivery pipelines: Jenkins CI orchestration, Docker containerization & Vercel edge deployment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenConfig(selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700/60 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" /> Configure Pipeline
          </button>

          <button
            onClick={() => handleOpenWebhook(selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700/60 transition-colors"
          >
            <Webhook className="w-3.5 h-3.5 text-blue-400" /> Webhook Setup
          </button>

          <button
            onClick={() => setTriggerModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Run Pipeline
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-400 font-medium">Total Runs</p>
          <p className="text-2xl font-bold text-white mt-1">{totalExecutions}</p>
        </div>
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
          <p className="text-xs text-emerald-400 font-medium">Successful</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{successfulCount}</p>
        </div>
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
          <p className="text-xs text-blue-400 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{runningCount}</p>
        </div>
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
          <p className="text-xs text-rose-400 font-medium">Failed</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{failedCount}</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
            {['all', 'running', 'success', 'failed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => loadExecutions(true)}
          disabled={refreshing}
          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Layout: Left Executions Table / Right Live Terminal Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Executions List */}
        <div className={`space-y-4 ${activeExecution ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-slate-900/30 rounded-2xl border border-slate-800">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading pipeline executions...</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-slate-900/30 rounded-2xl border border-slate-800 p-8">
              <Rocket className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-sm font-semibold text-white">No Pipeline Executions Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Trigger your first deployment or configure a GitHub Webhook to automatically trigger builds on commit push.
                </p>
              </div>
              <button
                onClick={() => setTriggerModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Run First Pipeline
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
              {executions.map((exec) => {
                const isSelected = activeExecution?.id === exec.id;
                const isRunning = !['success', 'failed', 'cancelled'].includes(exec.status);

                return (
                  <div
                    key={exec.id}
                    onClick={() => selectExecution(exec)}
                    className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 ${
                      isSelected ? 'bg-blue-950/20 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(exec.status)}
                        <span className="text-xs font-semibold text-white">
                          {exec.project_name || 'Project'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          #{exec.id.substring(0, 8)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                          <code className="text-slate-300 font-mono text-[11px]">{exec.branch}</code>
                        </span>

                        {exec.commit_sha && (
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                            <code className="text-slate-400 font-mono text-[11px]">
                              {exec.commit_sha.substring(0, 7)}
                            </code>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 capitalize">
                          via {exec.trigger_source?.replace('_', ' ')}
                        </span>

                        {exec.duration_seconds > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            {exec.duration_seconds}s
                          </span>
                        )}
                      </div>

                      {exec.commit_message && (
                        <p className="text-[11px] text-slate-400 truncate max-w-md">
                          {exec.commit_message}
                        </p>
                      )}
                    </div>

                    {/* Right action row */}
                    <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                      {exec.live_url && (
                        <a
                          href={exec.live_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1 border border-emerald-500/20 transition-colors"
                        >
                          <Globe className="w-3 h-3" /> Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {isRunning && (
                        <button
                          onClick={(e) => handleCancel(exec.id, e)}
                          title="Cancel Execution"
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition-colors"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      )}

                      {(exec.status === 'failed' || exec.status === 'cancelled') && (
                        <button
                          onClick={(e) => handleRetry(exec.id, e)}
                          title="Retry Execution"
                          className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <Link
                        to={`/dashboard/pipelines/${exec.id}`}
                        title="Open 10-Stage Visualizer"
                        className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
                      >
                        Visualizer
                      </Link>

                      <button
                        onClick={() => selectExecution(exec)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Execution Details & Terminal Console */}
        {activeExecution && (
          <div className="lg:col-span-6 bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-5 sticky top-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Run #{activeExecution.id.substring(0, 8)}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeExecution.project_name} • {activeExecution.branch}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/pipelines/${activeExecution.id}`}
                  className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-1 transition-colors shadow-sm"
                >
                  <span>10-Stage Visualizer</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setActiveExecution(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stage Progression Bar */}
            <StageProgressionBar
              status={activeExecution.status}
              currentStage={activeExecution.current_stage}
              executionEvents={activeEvents}
            />

            {/* Execution Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Trigger Source</span>
                <span className="text-slate-200 capitalize font-medium">
                  {activeExecution.trigger_source?.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Environment</span>
                <span className="text-slate-200 capitalize font-medium">
                  {activeExecution.environment || 'Production'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Duration</span>
                <span className="text-slate-200 font-medium">
                  {activeExecution.duration_seconds ? `${activeExecution.duration_seconds}s` : 'In Progress'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Framework</span>
                <span className="text-slate-200 capitalize font-medium">
                  {activeExecution.detected_framework?.replace('_', ' ') || 'Pure Static HTML'}
                </span>
              </div>
            </div>

            {/* Live URL Banner (if success) */}
            {activeExecution.live_url && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <a
                    href={activeExecution.live_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:underline truncate font-mono"
                  >
                    {activeExecution.live_url}
                  </a>
                </div>
                <a
                  href={activeExecution.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors"
                >
                  Visit Site <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Terminal Logs Console */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" /> Pipeline Execution Logs
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  Auto-scroll
                </label>
              </div>

              <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 font-mono text-[11px] h-64 overflow-y-auto space-y-1.5 shadow-inner">
                {activeEvents.length === 0 ? (
                  <p className="text-slate-600 italic">No output logs recorded yet...</p>
                ) : (
                  activeEvents.map((evt, idx) => {
                    const isStageChange = evt.event_type === 'stage_change' || evt.eventType === 'stage_change';
                    const isError = evt.status === 'failed' || evt.log_level === 'error';
                    const message = evt.message || evt.log_line || JSON.stringify(evt);

                    return (
                      <div
                        key={idx}
                        className={`leading-relaxed break-all ${
                          isStageChange
                            ? 'text-blue-400 font-semibold border-l-2 border-l-blue-500 pl-2 my-1'
                            : isError
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 select-none mr-2">
                          {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                        </span>
                        {message}
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              {['failed', 'cancelled'].includes(activeExecution.status) && (
                <button
                  onClick={() => handleRetry(activeExecution.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry Run
                </button>
              )}

              {!['success', 'failed', 'cancelled'].includes(activeExecution.status) && (
                <button
                  onClick={() => handleCancel(activeExecution.id)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" /> Cancel Run
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PipelineConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        project={modalTargetProject}
        onConfigSaved={() => {
          loadExecutions();
        }}
      />

      <TriggerPipelineModal
        isOpen={triggerModalOpen}
        onClose={() => setTriggerModalOpen(false)}
        initialProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
        onTriggerSuccess={(newExec) => {
          loadExecutions();
          selectExecution(newExec);
        }}
      />

      <WebhookInfoModal
        isOpen={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        project={modalTargetProject}
      />
    </div>
  );
};

export default DeploymentsPage;
