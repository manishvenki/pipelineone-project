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
  ArrowRight
} from 'lucide-react';
import { getProjectById, deleteProject } from '../services/projectService';
import { listDockerBuilds } from '../services/integrationService';
import { useNotification } from '../context/NotificationContext';
import Badge from '../components/common/Badge';
import DockerBuildModal from '../components/builds/DockerBuildModal';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, source, deployments
  const [deleting, setDeleting] = useState(false);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [builds, setBuilds] = useState([]);

  const notify = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadProject();
    loadBuilds();
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
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Loader2 className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBuildModalOpen(true)}
            className="px-3.5 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 font-medium rounded-xl transition shadow-md shadow-blue-900/30 flex items-center gap-1.5"
          >
            <Container className="w-3.5 h-3.5" />
            Build Docker Image
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-1.5"
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
                {project.project_type}
              </Badge>
              <Badge variant={isGitHub ? 'default' : 'violet'} size="sm">
                {isGitHub ? (
                  <>
                    <Github className="w-3 h-3" /> GitHub
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3 h-3" /> ZIP Archive
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              {project.description || 'Static web application deployment pipeline'}
            </p>
          </div>

          <div className="text-xs text-slate-500 space-y-1 font-mono">
            <div>Slug: <span className="text-slate-300">{project.slug}</span></div>
            <div>Created: <span className="text-slate-300">{new Date(project.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 pt-2 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Static Architecture
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
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
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'deployments'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" /> Container & Builds
            <span className="w-2 h-2 rounded-full bg-blue-500 ml-1" />
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
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {project.status || 'Ready'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Container className="w-4 h-4 text-purple-400" /> Container Packaging Specs
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2.5 font-mono">
              <div className="text-slate-500"># Docker multi-stage generator</div>
              <div>project: {project.slug}</div>
              <div>base_image: {project.project_type === 'react_vite' ? 'node:20-alpine -> nginx:alpine-slim' : 'nginx:alpine-slim'}</div>
              <div>publish_dir: {project.output_directory || '.'}</div>
              <div>exposed_port: 80/tcp</div>
              <div className="text-emerald-400 pt-2 flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4" /> Ready for Docker Containerization Engine
              </div>
            </div>

            <button
              onClick={() => setIsBuildModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Launch Container Build Now
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Repository or Archive Details */}
      {activeTab === 'source' && (
        <div className="space-y-6">
          {isGitHub && project.repository ? (
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Github className="w-4 h-4" /> Connected GitHub Repository
                </h3>
                {project.repository.clone_url && (
                  <a
                    href={project.repository.clone_url.replace('.git', '')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Full Repository:</span>
                  <span className="font-semibold text-white">{project.repository.full_name}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Deployment Branch:</span>
                  <span className="font-mono text-purple-400">{project.repository.selected_branch}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Default Branch:</span>
                  <span className="font-mono text-slate-300">{project.repository.default_branch}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Visibility:</span>
                  <span className="text-slate-300">{project.repository.is_private ? 'Private' : 'Public'}</span>
                </div>
              </div>

              {project.repository.last_commit_sha && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-500">Tracked Commit:</div>
                  <div className="text-slate-200 font-medium">"{project.repository.last_commit_message}"</div>
                  <div className="font-mono text-[11px] text-blue-400">{project.repository.last_commit_sha}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-purple-400" /> Extracted Archive Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Original File:</span>
                  <span className="font-semibold text-white">{meta.originalFileName || 'project.zip'}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Files Count:</span>
                  <span className="font-mono text-white">{meta.totalFilesCount || 'N/A'}</span>
                </div>
              </div>

              {/* File Tree Preview */}
              {meta.fileTreePreview && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Inspected Archive Structure:</span>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1 max-h-60 overflow-y-auto">
                    {meta.fileTreePreview.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-400">
                        {item.type === 'directory' ? (
                          <Folder className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <File className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Container & Builds */}
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
    </div>
  );
};

export default ProjectDetailPage;
