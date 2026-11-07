import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  UploadCloud,
  Github,
  Search,
  Trash2,
  ExternalLink,
  Code2,
  Terminal,
  FileCode,
  GitBranch,
  Calendar,
  AlertCircle,
  Loader2,
  Settings,
  Rocket,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../services/projectService';
import { useNotification } from '../context/NotificationContext';
import Badge from '../components/common/Badge';
import RepoSelectorModal from '../components/projects/RepoSelectorModal';
import UploadZipModal from '../components/projects/UploadZipModal';
import ConnectGitHubModal from '../components/integrations/ConnectGitHubModal';
import PipelineConfigModal from '../components/pipelines/PipelineConfigModal';
import TriggerPipelineModal from '../components/pipelines/TriggerPipelineModal';

export const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all'); // all, github, zip
  const [deletingId, setDeletingId] = useState(null);

  // Modals
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [isUploadZipOpen, setIsUploadZipOpen] = useState(false);
  const [isConnectGitHubOpen, setIsConnectGitHubOpen] = useState(false);
  const [configModalProject, setConfigModalProject] = useState(null);
  const [triggerModalProjectId, setTriggerModalProjectId] = useState(null);

  const notify = useNotification();
  const isGitHubConnected = Boolean(user?.integrations?.github?.connected);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      notify.error('Failed to load projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteProject(id);
      notify.success(`Project "${name}" deleted.`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenGitHub = () => {
    if (isGitHubConnected) {
      setIsRepoSelectorOpen(true);
    } else {
      setIsConnectGitHubOpen(true);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.framework && p.framework.toLowerCase().includes(search.toLowerCase()));
    const matchesSource = filterSource === 'all' || p.source_type === filterSource;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage and inspect your connected GitHub repositories and static project archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsUploadZipOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 rounded-xl transition-all flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-purple-400" />
            Upload ZIP
          </button>
          <button
            onClick={handleOpenGitHub}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            Import Repository
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, framework, or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'github', label: 'GitHub Repos' },
            { id: 'zip', label: 'ZIP Archives' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSource(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filterSource === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          Loading project registry...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/30 rounded-2xl border border-slate-800 space-y-4">
          <FolderGit2 className="w-12 h-12 mx-auto text-slate-600" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No matching projects found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? 'Try adjusting your search criteria.'
                : 'Connect your GitHub account or upload a ZIP file to add your first project.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenGitHub}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Github className="w-4 h-4" /> Import from GitHub
            </button>
            <button
              onClick={() => setIsUploadZipOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-all border border-slate-700 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" /> Upload ZIP
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => (
            <Link
              key={p.id}
              to={`/dashboard/projects/${p.id}`}
              className="group bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden shadow-lg"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base text-white group-hover:text-blue-400 transition-colors truncate max-w-[200px]">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" size="xs">
                        {p.project_type}
                      </Badge>
                      <Badge variant={p.source_type === 'github' ? 'default' : 'violet'} size="xs">
                        {p.source_type === 'github' ? (
                          <>
                            <Github className="w-2.5 h-2.5" /> GitHub
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-2.5 h-2.5" /> ZIP Archive
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(p.id, p.name, e)}
                    disabled={deletingId === p.id}
                    title="Delete project"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {p.description || 'Static web application'}
                </p>

                {/* Metadata highlights */}
                <div className="space-y-1.5 pt-2 text-[11px] font-mono border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-emerald-400" /> Build:
                    </span>
                    <span className="text-slate-300 truncate max-w-[150px]">
                      {p.build_command || 'None (pure static)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-blue-400" /> Output:
                    </span>
                    <span className="text-slate-300 font-semibold">{p.output_directory || '.'}</span>
                  </div>
                  {p.repository && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-purple-400" /> Branch:
                      </span>
                      <span className="text-slate-300">{p.repository.selected_branch || 'main'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfigModalProject(p);
                    }}
                    title="Configure CI/CD Pipeline"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTriggerModalProjectId(p.id);
                    }}
                    title="Deploy Pipeline"
                    className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors font-medium flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" /> Deploy
                  </button>
                </div>
                <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Inspect <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modals */}
      <RepoSelectorModal
        isOpen={isRepoSelectorOpen}
        onClose={() => setIsRepoSelectorOpen(false)}
        onProjectCreated={() => loadProjects()}
      />

      <UploadZipModal
        isOpen={isUploadZipOpen}
        onClose={() => setIsUploadZipOpen(false)}
        onProjectCreated={() => loadProjects()}
      />

      <ConnectGitHubModal
        isOpen={isConnectGitHubOpen}
        onClose={() => setIsConnectGitHubOpen(false)}
        onConnected={() => setIsRepoSelectorOpen(true)}
      />

      <PipelineConfigModal
        isOpen={!!configModalProject}
        onClose={() => setConfigModalProject(null)}
        project={configModalProject}
        onConfigSaved={() => loadProjects()}
      />

      <TriggerPipelineModal
        isOpen={!!triggerModalProjectId}
        onClose={() => setTriggerModalProjectId(null)}
        initialProjectId={triggerModalProjectId}
      />
    </div>
  );
};

export default ProjectsPage;

