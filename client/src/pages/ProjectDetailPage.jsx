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
} from 'lucide-react';
import { getProjectById, deleteProject } from '../services/projectService';
import { useNotification } from '../context/NotificationContext';
import Badge from '../components/common/Badge';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, source, deployments
  const [deleting, setDeleting] = useState(false);

  const notify = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadProject();
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

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? 'Deleting...' : 'Delete Project'}
        </button>
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
            <Rocket className="w-3.5 h-3.5" /> CI/CD Deployments
            <Badge variant="comingSoon" size="xs">Phase 2</Badge>
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
                <span className="font-semibold text-white">{project.framework || 'HTML5 / Vanilla'}</span>
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
              <Terminal className="w-4 h-4 text-purple-400" /> Automation Pipeline Readiness
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-3 font-mono">
              <div className="text-slate-500"># Generated build specification</div>
              <div>project: {project.slug}</div>
              <div>type: static-web</div>
              <div>framework: {project.framework || 'vanilla'}</div>
              <div>publish_dir: {project.output_directory || '.'}</div>
              {project.build_command && <div>script: {project.build_command}</div>}
              <div className="text-emerald-400 pt-2 flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4" /> Ready for Phase 2 automated build containerization
              </div>
            </div>
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

      {/* Tab 3: CI/CD Deployments (Phase 2 Preview) */}
      {activeTab === 'deployments' && (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
            <Rocket className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">CI/CD Engine — Phase 2</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Automated build containers, Docker Hub synchronization, Jenkins execution pipelines, and Vercel edge deployment will be integrated in Phase 2.
            </p>
          </div>
          <Badge variant="comingSoon" size="sm">Pipeline One Phase 2 Objective</Badge>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
