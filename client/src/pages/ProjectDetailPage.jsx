import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderGit2,
  Github,
  UploadCloud,
  Terminal,
  FileCode,
  GitBranch,
  Calendar,
  Lock,
  Globe,
  Trash2,
  Rocket,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Folder,
  File,
  Loader2,
  AlertCircle,
  ExternalLink,
  Container,
  Play,
  Check,
  XCircle,
  StopCircle,
  ArrowRight,
  Settings,
  Webhook,
  RotateCcw,
  GitCommit
} from 'lucide-react';
import { getProjectById, deleteProject } from '../services/projectService';
import { listDockerBuilds } from '../services/integrationService';
import {
  listPipelineExecutions,
  retryPipelineExecution,
  cancelPipelineExecution
} from '../services/pipelineService';
import { useNotification } from '../context/NotificationContext';
import Badge from '../components/common/Badge';
import DockerBuildModal from '../components/builds/DockerBuildModal';
import StageProgressionBar from '../components/pipelines/StageProgressionBar';
import PipelineConfigModal from '../components/pipelines/PipelineConfigModal';
import TriggerPipelineModal from '../components/pipelines/TriggerPipelineModal';
import WebhookInfoModal from '../components/pipelines/WebhookInfoModal';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, pipelines, source, deployments
  const [deleting, setDeleting] = useState(false);

  // Builds state
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [builds, setBuilds] = useState([]);

  // Pipeline states
  const [pipelineExecutions, setPipelineExecutions] = useState([]);
  const [isPipelineConfigOpen, setIsPipelineConfigOpen] = useState(false);
  const [isTriggerPipelineOpen, setIsTriggerPipelineOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  const notify = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadProject();
    loadBuilds();
    loadPipelineRuns();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await getProjectById(id);
      setProject(res.project);
    } catch (err) {
      notify.error('Could not load project details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBuilds = async () => {
    try {
      const res = await listDockerBuilds(id);
      if (res.builds) {
        setBuilds(res.builds);
      }
    } catch (err) {
      console.error('Failed to load project builds', err);
    }
  };

  const loadPipelineRuns = async () => {
    try {
      const res = await listPipelineExecutions({ projectId: id });
      if (res.executions) {
        setPipelineExecutions(res.executions);
      }
    } catch (err) {
      console.error('Failed to load pipeline executions', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete project "${project?.name}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteProject(id);
      notify.success(`Project "${project?.name}" deleted successfully.`);
      navigate('/dashboard/projects');
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to delete project');
      setDeleting(false);
    }
  };

  const handleRetryPipeline = async (executionId) => {
    try {
      await retryPipelineExecution(executionId);
      notify.success('Pipeline retry triggered');
      loadPipelineRuns();
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Retry failed');
    }
  };

  const handleCancelPipeline = async (executionId) => {
    try {
      await cancelPipelineExecution(executionId);
      notify.success('Pipeline cancelled');
      loadPipelineRuns();
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Cancel failed');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        Loading project analysis...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold text-white">Project not found</h2>
        <Link to="/dashboard/projects" className="text-xs text-blue-400 hover:underline">
          Return to My Projects
        </Link>
      </div>
    );
  }

  const meta = typeof project.metadata === 'string' ? JSON.parse(project.metadata) : project.metadata || {};
  const isGitHub = project.source_type === 'github';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'in_progress':
      case 'running':
      case 'deploying':
      case 'building':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Loader2 className="w-3 h-3 animate-spin" /> {status.replace('_', ' ')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <StopCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 capitalize">
            {status?.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPipelineConfigOpen(true)}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium rounded-xl border border-slate-700/60 transition flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            Config
          </button>

          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium rounded-xl border border-slate-700/60 transition flex items-center gap-1.5"
          >
            <Webhook className="w-3.5 h-3.5 text-blue-400" />
            Webhook
          </button>

          <button
            onClick={() => setIsTriggerPipelineOpen(true)}
            className="px-3.5 py-1.5 text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Deploy Pipeline
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Project Banner Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
              <Badge variant="primary" size="sm">
                {project.project_type || 'Static Site'}
              </Badge>
              <Badge variant={isGitHub ? 'default' : 'violet'} size="sm">
                {isGitHub ? (
                  <>
                    <Github className="w-3 h-3" /> GitHub Repo
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3 h-3" /> ZIP Archive
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {project.description || 'Static website project configured for automated continuous deployment.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Pipelines</span>
              <span className="font-bold text-white">{pipelineExecutions.length} runs</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Docker</span>
              <span className="font-bold text-white">{builds.length} images</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 border-t border-slate-800/80 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Static Architecture
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pipelines'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" /> CI/CD Deployments
            {pipelineExecutions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                {pipelineExecutions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isGitHub ? <Github className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
            {isGitHub ? 'Repository Details' : 'Extracted Files'}
          </button>

          <button
            onClick={() => setActiveTab('deployments')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'deployments'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Container className="w-3.5 h-3.5" /> Docker Builds
          </button>
        </div>
      </div>

      {/* Tab 1: Architecture & Static Detection */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> Static Detection Parameters
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400">Framework / Tooling</span>
                <span className="font-semibold text-white font-mono">{project.detected_framework || project.framework || 'pure_html'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400">Build Command</span>
                <span className="font-mono text-emerald-400">
                  {project.build_command || 'None (ready to serve)'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400">Target Output Directory</span>
                <span className="font-mono text-blue-400">{project.output_directory || '.'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400">Platform Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CI/CD Automation Ready
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" /> Deployment Destinations
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Vercel Edge Network</p>
                  <p className="text-[11px] text-slate-400">Direct static delivery to edge distribution</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">
                  Primary
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Jenkins CI Engine</p>
                  <p className="text-[11px] text-slate-400">Dynamic Declarative Jenkinsfile pipeline orchestration</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold">
                  Orchestrator
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Docker Hub Container Registry</p>
                  <p className="text-[11px] text-slate-400">Optional Nginx container image build and publishing</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-semibold">
                  Optional
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: CI/CD Pipeline Runs */}
      {activeTab === 'pipelines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-400" /> CI/CD Pipeline Executions
              </h3>
              <p className="text-xs text-slate-400">Automated build and edge deployment history for this project.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPipelineConfigOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition border border-slate-700 flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Configuration
              </button>
              <button
                onClick={() => setIsTriggerPipelineOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Trigger Run
              </button>
            </div>
          </div>

          {pipelineExecutions.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
              <Rocket className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No pipeline executions yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Trigger a deployment or push code to your GitHub branch to start your first automated CI/CD pipeline run.
              </p>
              <button
                onClick={() => setIsTriggerPipelineOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Trigger First Run
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineExecutions.map((exec) => {
                const isRunning = !['success', 'failed', 'cancelled'].includes(exec.status);
                return (
                  <div
                    key={exec.id}
                    className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-white font-mono">
                          #{exec.id.substring(0, 8)}
                        </span>
                        {getStatusBadge(exec.status)}
                        <span className="text-slate-400 text-[11px] capitalize">
                          via {exec.trigger_source?.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-blue-400" />
                          <code className="text-slate-300 font-mono">{exec.branch}</code>
                        </span>
                        {exec.commit_sha && (
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3 h-3 text-purple-400" />
                            <code className="text-slate-400 font-mono">
                              {exec.commit_sha.substring(0, 7)}
                            </code>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {exec.duration_seconds ? `${exec.duration_seconds}s` : 'In progress'}
                        </span>
                      </div>

                      {exec.commit_message && (
                        <p className="text-[11px] text-slate-400 truncate max-w-md">
                          {exec.commit_message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {exec.live_url && (
                        <a
                          href={exec.live_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-500/20 transition-colors"
                        >
                          <Globe className="w-3 h-3" /> Live Site <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {isRunning && (
                        <button
                          onClick={() => handleCancelPipeline(exec.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition-colors"
                          title="Cancel Run"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      )}

                      {['failed', 'cancelled'].includes(exec.status) && (
                        <button
                          onClick={() => handleRetryPipeline(exec.id)}
                          className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs transition-colors"
                          title="Retry Run"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <Link
                        to={`/dashboard/pipelines/${exec.id}`}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors border border-blue-500/30"
                      >
                        Visualizer <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Source Repository / Extracted Files */}
      {activeTab === 'source' && (
        <div className="space-y-4">
          {isGitHub && project.repository ? (
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Github className="w-4 h-4" /> GitHub Repository Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Full Repository Name</span>
                  <span className="text-white font-semibold font-mono">{project.repository.repo_name}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Active Selected Branch</span>
                  <span className="text-white font-semibold font-mono">{project.repository.selected_branch}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Default Branch</span>
                  <span className="text-white font-semibold font-mono">{project.repository.default_branch}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Visibility</span>
                  <span className="text-white font-semibold capitalize">
                    {project.repository.is_private ? 'Private' : 'Public'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400" /> Extracted Static Files
              </h3>
              {meta.sample_files && meta.sample_files.length > 0 ? (
                <div className="space-y-1 font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {meta.sample_files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-300">
                      <File className="w-3.5 h-3.5 text-slate-500" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">All static files validated and ready for build.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Container & Builds */}
      {activeTab === 'deployments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Container className="w-5 h-5 text-blue-400" /> Docker Builds History
              </h3>
              <p className="text-xs text-slate-400">Container images built for this static project.</p>
            </div>

            <button
              onClick={() => setIsBuildModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Trigger Build
            </button>
          </div>

          {builds.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
              <Container className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No container builds yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Trigger your first Docker container build to create an optimized production Nginx container for this project.
              </p>
              <button
                onClick={() => setIsBuildModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Build Docker Image
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {builds.map((b) => (
                <div
                  key={b.id}
                  className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-white font-mono">{b.image_name}:{b.image_tag}</span>
                      {getStatusBadge(b.status)}
                    </div>
                    <div className="text-slate-400 text-[11px] font-mono">
                      Started: {new Date(b.created_at).toLocaleString()} &bull; Duration: {b.duration_seconds ? `${b.duration_seconds}s` : 'In progress'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dashboard/builds?id=${b.id}`}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-medium rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      View Logs
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Docker Build Modal */}
      <DockerBuildModal
        isOpen={isBuildModalOpen}
        onClose={() => setIsBuildModalOpen(false)}
        initialProjectId={id}
        onBuildTriggered={(newBuild) => {
          setBuilds((prev) => [newBuild, ...prev]);
        }}
      />

      {/* Pipeline Modals */}
      <PipelineConfigModal
        isOpen={isPipelineConfigOpen}
        onClose={() => setIsPipelineConfigOpen(false)}
        project={project}
        onConfigSaved={() => {
          loadPipelineRuns();
        }}
      />

      <TriggerPipelineModal
        isOpen={isTriggerPipelineOpen}
        onClose={() => setIsTriggerPipelineOpen(false)}
        initialProjectId={id}
        onTriggerSuccess={() => {
          loadPipelineRuns();
          setActiveTab('pipelines');
        }}
      />

      <WebhookInfoModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        project={project}
      />
    </div>
  );
};

export default ProjectDetailPage;
