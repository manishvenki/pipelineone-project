import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Github,
  UploadCloud,
  Terminal,
  FileCode,
  GitBranch,
  Globe,
  Trash2,
  Rocket,
  CheckCircle2,
  Clock,
  Sparkles,
  Folder,
  File,
  Loader2,
  ExternalLink,
  Container,
  Play,
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
      console.error('Failed to load pipeline runs', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteProject(id);
      notify.success(`Project "${project.name}" deleted.`);
      navigate('/dashboard/projects');
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to delete project');
      setDeleting(false);
    }
  };

  const handleRetryPipeline = async (execId) => {
    try {
      await retryPipelineExecution(execId);
      notify.success('Pipeline execution retry dispatched');
      loadPipelineRuns();
    } catch (err) {
      notify.error('Retry failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelPipeline = async (execId) => {
    try {
      await cancelPipelineExecution(execId);
      notify.success('Pipeline execution cancelled');
      loadPipelineRuns();
    } catch (err) {
      notify.error('Cancellation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        Loading project details...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Project not found</h2>
        <Link to="/dashboard/projects" className="text-xs text-blue-600 font-semibold hover:underline">
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </span>
        );
      case 'in_progress':
      case 'running':
      case 'deploying':
      case 'building':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> {status.replace('_', ' ')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <StopCircle className="w-3 h-3 text-amber-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
            {status?.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPipelineConfigOpen(true)}
            className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Config
          </button>

          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-xs"
          >
            <Webhook className="w-3.5 h-3.5 text-blue-600" />
            Webhook
          </button>

          <button
            onClick={() => setIsTriggerPipelineOpen(true)}
            className="px-3.5 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Deploy Pipeline
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Project Banner Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
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
            <p className="text-xs text-slate-500 max-w-xl">
              {project.description || 'Static website project configured for automated continuous deployment.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Pipelines</span>
              <span className="font-bold text-slate-900">{pipelineExecutions.length} runs</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Docker</span>
              <span className="font-bold text-slate-900">{builds.length} images</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 border-t border-slate-100 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Static Architecture
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pipelines'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" /> CI/CD Deployments
            {pipelineExecutions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-semibold">
                {pipelineExecutions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isGitHub ? <Github className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
            {isGitHub ? 'Repository Details' : 'Extracted Files'}
          </button>

          <button
            onClick={() => setActiveTab('deployments')}
            className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'deployments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Container className="w-3.5 h-3.5" /> Docker Builds
          </button>
        </div>
      </div>

      {/* Tab 1: Architecture & Static Detection */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> Static Detection Parameters
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Framework / Tooling</span>
                <span className="font-semibold text-slate-900 font-mono">{project.detected_framework || project.framework || 'pure_html'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Build Command</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {project.build_command || 'None (ready to serve)'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Target Output Directory</span>
                <span className="font-mono text-blue-700 font-semibold">{project.output_directory || '.'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Platform Status</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> CI/CD Automation Ready
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-blue-600" /> Deployment Destinations
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Vercel Edge Network</p>
                  <p className="text-[11px] text-slate-500">Direct static delivery to edge distribution</p>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Primary
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Jenkins CI Engine</p>
                  <p className="text-[11px] text-slate-500">Dynamic Declarative Jenkinsfile pipeline orchestration</p>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  Orchestrator
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Docker Hub Container Registry</p>
                  <p className="text-[11px] text-slate-500">Optional Nginx container image build and publishing</p>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" /> CI/CD Pipeline Executions
              </h3>
              <p className="text-xs text-slate-500">Automated build and edge deployment history for this project.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPipelineConfigOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" /> Configuration
              </button>
              <button
                onClick={() => setIsTriggerPipelineOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Trigger Run
              </button>
            </div>
          </div>

          {pipelineExecutions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <Rocket className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">No pipeline executions yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Trigger a deployment or push code to your GitHub branch to start your first automated CI/CD pipeline run.
              </p>
              <button
                onClick={() => setIsTriggerPipelineOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
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
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-slate-900 font-mono">
                          #{exec.id.substring(0, 8)}
                        </span>
                        {getStatusBadge(exec.status)}
                        <span className="text-slate-500 text-[11px] capitalize font-medium">
                          via {exec.trigger_source?.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                          <code className="text-slate-800 font-mono font-semibold">{exec.branch}</code>
                        </span>
                        {exec.commit_sha && (
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
                            <code className="text-slate-600 font-mono">
                              {exec.commit_sha.substring(0, 7)}
                            </code>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {exec.duration_seconds ? `${exec.duration_seconds}s` : 'In progress'}
                        </span>
                      </div>

                      {exec.commit_message && (
                        <p className="text-[11px] text-slate-500 truncate max-w-md">
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
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors"
                        >
                          <Globe className="w-3 h-3" /> Live Site <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {isRunning && (
                        <button
                          onClick={() => handleCancelPipeline(exec.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs transition-colors border border-red-200"
                          title="Cancel Run"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      )}

                      {['failed', 'cancelled'].includes(exec.status) && (
                        <button
                          onClick={() => handleRetryPipeline(exec.id)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition-colors border border-blue-200"
                          title="Retry Run"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <Link
                        to={`/dashboard/pipelines/${exec.id}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
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
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Github className="w-4 h-4" /> GitHub Repository Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Full Repository Name</span>
                  <span className="text-slate-900 font-semibold font-mono">{project.repository.repo_name}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Active Selected Branch</span>
                  <span className="text-slate-900 font-semibold font-mono">{project.repository.selected_branch}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Default Branch</span>
                  <span className="text-slate-900 font-semibold font-mono">{project.repository.default_branch}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Visibility</span>
                  <span className="text-slate-900 font-semibold capitalize">
                    {project.repository.is_private ? 'Private' : 'Public'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-600" /> Extracted Static Files
              </h3>
              {meta.sample_files && meta.sample_files.length > 0 ? (
                <div className="space-y-1 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
                  {meta.sample_files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <File className="w-3.5 h-3.5 text-slate-400" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">All static files validated and ready for build.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Container & Builds */}
      {activeTab === 'deployments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Container className="w-5 h-5 text-blue-600" /> Docker Builds History
              </h3>
              <p className="text-xs text-slate-500">Container images built for this static project.</p>
            </div>

            <button
              onClick={() => setIsBuildModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Trigger Build
            </button>
          </div>

          {builds.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <Container className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">No container builds yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Trigger your first Docker container build to create an optimized production Nginx container for this project.
              </p>
              <button
                onClick={() => setIsBuildModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Build Docker Image
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {builds.map((b) => (
                <div
                  key={b.id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-slate-900 font-mono">{b.image_name}:{b.image_tag}</span>
                      {getStatusBadge(b.status)}
                    </div>
                    <div className="text-slate-500 text-[11px] font-mono">
                      Started: {new Date(b.created_at).toLocaleString()} &bull; Duration: {b.duration_seconds ? `${b.duration_seconds}s` : 'In progress'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dashboard/builds?id=${b.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition inline-flex items-center gap-1.5"
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
