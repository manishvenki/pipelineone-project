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
  Globe,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  listPipelineExecutions,
  getPipelineExecution,
  cancelPipelineExecution,
  retryPipelineExecution,
  createExecutionEventSource,
} from '../services/pipelineService';
import { getProjects } from '../services/projectService';
import StageProgressionBar from '../components/pipelines/StageProgressionBar';
import PipelineConfigModal from '../components/pipelines/PipelineConfigModal';
import TriggerPipelineModal from '../components/pipelines/TriggerPipelineModal';
import WebhookInfoModal from '../components/pipelines/WebhookInfoModal';
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

  // Clean up SSE stream
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto scroll logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeEvents, autoScroll]);

  // Select an execution to inspect in side drawer
  const selectExecution = async (exec) => {
    setActiveExecution(exec);
    setActiveEvents([]);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const full = await getPipelineExecution(exec.id);
      if (full.execution) setActiveExecution(full.execution);
      if (full.events) setActiveEvents(full.events);

      const isTerminal = ['success', 'failed', 'cancelled'].includes(exec.status);
      if (!isTerminal) {
        const es = createExecutionEventSource(exec.id, (newEvent) => {
          setActiveEvents((prev) => [...prev, newEvent]);

          if (newEvent.event_type === 'state_change' && newEvent.metadata?.status) {
            setActiveExecution((prev) => ({
              ...prev,
              status: newEvent.metadata.status,
              current_stage: newEvent.stage,
            }));
          }

          if (newEvent.event_type === 'terminal_state') {
            loadExecutions();
          }
        });
        eventSourceRef.current = es;
      }
    } catch (err) {
      console.error('Failed to load execution detail', err);
    }
  };

  const handleCancel = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await cancelPipelineExecution(id);
      notify.success('Execution cancelled');
      loadExecutions();
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Failed to cancel execution');
    }
  };

  const handleRetry = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await retryPipelineExecution(id);
      notify.success('Execution retry triggered');
      loadExecutions();
      if (res.execution) {
        selectExecution(res.execution);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Failed to retry execution');
    }
  };

  const handleOpenConfig = (projectId) => {
    const proj = projects.find((p) => p.id === projectId) || projects[0];
    if (proj) {
      setModalTargetProject(proj);
      setConfigModalOpen(true);
    } else {
      notify.error('No project available to configure');
    }
  };

  const handleOpenWebhook = (projectId) => {
    const proj = projects.find((p) => p.id === projectId) || projects[0];
    if (proj) {
      setModalTargetProject(proj);
      setWebhookModalOpen(true);
    } else {
      notify.error('No project available for webhook setup');
    }
  };

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <MinusCircle className="w-3 h-3 text-amber-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> {status?.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Rocket className="w-6 h-6 text-blue-600" /> CI/CD Deployments Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated static website delivery pipelines: Jenkins CI orchestration, Docker containerization & Vercel edge deployment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenConfig(selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" /> Configure Pipeline
          </button>

          <button
            onClick={() => handleOpenWebhook(selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors shadow-xs"
          >
            <Webhook className="w-3.5 h-3.5 text-blue-600" /> Webhook Setup
          </button>

          <button
            onClick={() => setTriggerModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Run Pipeline
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Runs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalExecutions}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium">Successful</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{successfulCount}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-blue-600 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{runningCount}</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-red-600 font-medium">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{failedCount}</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs font-medium"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
            {['all', 'running', 'success', 'failed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
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
          className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors self-end sm:self-auto shadow-xs font-medium"
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
            <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500">Loading pipeline executions...</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <Rocket className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">No Pipeline Executions Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Trigger your first deployment or configure a GitHub Webhook to automatically trigger builds on commit push.
                </p>
              </div>
              <button
                onClick={() => setTriggerModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Run First Pipeline
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
              {executions.map((exec) => {
                const isSelected = activeExecution?.id === exec.id;
                const isRunning = !['success', 'failed', 'cancelled'].includes(exec.status);

                return (
                  <div
                    key={exec.id}
                    onClick={() => selectExecution(exec)}
                    className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/60 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(exec.status)}
                        <span className="text-xs font-semibold text-slate-900">
                          {exec.project_name || 'Project'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          #{exec.id.substring(0, 8)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                          <code className="text-slate-800 font-mono text-[11px] font-semibold">{exec.branch}</code>
                        </span>

                        {exec.commit_sha && (
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
                            <code className="text-slate-600 font-mono text-[11px]">
                              {exec.commit_sha.substring(0, 7)}
                            </code>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 capitalize font-medium">
                          via {exec.trigger_source?.replace('_', ' ')}
                        </span>

                        {exec.duration_seconds > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {exec.duration_seconds}s
                          </span>
                        )}
                      </div>

                      {exec.commit_message && (
                        <p className="text-[11px] text-slate-500 truncate max-w-md">
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
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors"
                        >
                          <Globe className="w-3 h-3" /> Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {isRunning && (
                        <button
                          onClick={(e) => handleCancel(exec.id, e)}
                          title="Cancel Execution"
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs transition-colors border border-red-200"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      )}

                      {(exec.status === 'failed' || exec.status === 'cancelled') && (
                        <button
                          onClick={(e) => handleRetry(exec.id, e)}
                          title="Retry Execution"
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition-colors border border-blue-200"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <Link
                        to={`/dashboard/pipelines/${exec.id}`}
                        title="Open 10-Stage Visualizer"
                        className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-semibold"
                      >
                        Visualizer
                      </Link>

                      <button
                        onClick={() => selectExecution(exec)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
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
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 space-y-5 sticky top-20 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Run #{activeExecution.id.substring(0, 8)}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeExecution.project_name} • {activeExecution.branch}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/pipelines/${activeExecution.id}`}
                  className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-xs"
                >
                  <span>10-Stage Visualizer</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setActiveExecution(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Trigger Source</span>
                <span className="text-slate-800 capitalize font-semibold">
                  {activeExecution.trigger_source?.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Environment</span>
                <span className="text-slate-800 capitalize font-semibold">
                  {activeExecution.environment || 'Production'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Duration</span>
                <span className="text-slate-800 font-semibold font-mono">
                  {activeExecution.duration_seconds ? `${activeExecution.duration_seconds}s` : 'In Progress'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Framework</span>
                <span className="text-slate-800 capitalize font-semibold">
                  {activeExecution.detected_framework?.replace('_', ' ') || 'Pure Static HTML'}
                </span>
              </div>
            </div>

            {/* Live URL Banner (if success) */}
            {activeExecution.live_url && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <a
                    href={activeExecution.live_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-700 hover:underline truncate font-mono font-medium"
                  >
                    {activeExecution.live_url}
                  </a>
                </div>
                <a
                  href={activeExecution.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors shadow-xs"
                >
                  Visit Site <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Terminal Logs Console */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" /> Pipeline Execution Logs
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300"
                  />
                  Auto-scroll
                </label>
              </div>

              <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3 font-mono text-[11px] h-64 overflow-y-auto space-y-1.5 shadow-inner">
                {activeEvents.length === 0 ? (
                  <p className="text-slate-500 italic">No output logs recorded yet...</p>
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
                            ? 'text-red-400'
                            : 'text-slate-200'
                        }`}
                      >
                        <span className="text-slate-500 select-none mr-2">
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
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {['failed', 'cancelled'].includes(activeExecution.status) && (
                <button
                  onClick={() => handleRetry(activeExecution.id)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry Run
                </button>
              )}

              {!['success', 'failed', 'cancelled'].includes(activeExecution.status) && (
                <button
                  onClick={() => handleCancel(activeExecution.id)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
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
