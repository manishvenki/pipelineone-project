import React, { useState, useEffect } from 'react';
import {
  Github,
  Search,
  Lock,
  Globe,
  GitBranch,
  Calendar,
  Code2,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { getRepositories, getRepositoryDetails } from '../../services/githubService';
import { selectRepository } from '../../services/projectService';
import { useNotification } from '../../context/NotificationContext';

export const RepoSelectorModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('all'); // all, public, private

  // Step 2: Selected Repo Preview & Confirmation
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);

  const notify = useNotification();

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    } else {
      setSelectedRepo(null);
      setRepoDetails(null);
      setSearch('');
    }
  }, [isOpen]);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRepositories({ visibility });
      setRepositories(data.repositories || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch GitHub repositories. Ensure your account is connected.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.defaultBranch || 'main');
    try {
      setDetailsLoading(true);
      const res = await getRepositoryDetails(repo.owner.login, repo.name);
      setRepoDetails(res.repository);
      if (res.repository.defaultBranch) {
        setSelectedBranch(res.repository.defaultBranch);
      }
    } catch (err) {
      notify.error('Could not fetch detailed repository inspection: ' + err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedRepo) return;
    try {
      setSubmitting(true);
      const payload = {
        repoId: selectedRepo.id,
        owner: selectedRepo.owner.login,
        name: selectedRepo.name,
        fullName: selectedRepo.fullName,
        defaultBranch: selectedRepo.defaultBranch,
        selectedBranch: selectedBranch,
        cloneUrl: selectedRepo.cloneUrl,
        isPrivate: selectedRepo.isPrivate,
        description: selectedRepo.description,
      };

      const res = await selectRepository(payload);
      notify.success(`Repository ${selectedRepo.name} imported successfully!`);
      onProjectCreated && onProjectCreated(res.project);
      onClose();
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to import repository project');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRepos = repositories.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesVis =
      visibility === 'all'
        ? true
        : visibility === 'private'
        ? r.isPrivate
        : !r.isPrivate;
    return matchesSearch && matchesVis;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedRepo ? `Import: ${selectedRepo.fullName}` : 'Select a GitHub Repository'}
      maxWidth="max-w-3xl"
    >
      {selectedRepo ? (
        /* Step 2: Detailed inspection & branch selection */
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={selectedRepo.owner.avatarUrl}
                alt={selectedRepo.owner.login}
                className="w-10 h-10 rounded-full border border-slate-700"
              />
              <div>
                <h4 className="text-base font-semibold text-white flex items-center gap-2">
                  {selectedRepo.fullName}
                  {selectedRepo.isPrivate ? (
                    <Badge variant="warning" size="xs">
                      <Lock className="w-3 h-3" /> Private
                    </Badge>
                  ) : (
                    <Badge variant="default" size="xs">
                      <Globe className="w-3 h-3" /> Public
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedRepo.description || 'No description provided'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRepo(null)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Choose different repo
            </button>
          </div>

          {detailsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <p className="text-sm">Analyzing repository structure & static configuration...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Static Detection Result */}
              {repoDetails?.analysis && (
                <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Detected Project Architecture
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Project Type:</span>
                      <span className="font-semibold text-white">{repoDetails.analysis.detectedType}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Build Command:</span>
                      <span className="font-mono text-emerald-400">
                        {repoDetails.analysis.buildCommand || 'None required'}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Output Directory:</span>
                      <span className="font-mono text-slate-200">{repoDetails.analysis.outputDirectory}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Branch Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-blue-400" /> Deployment Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {(repoDetails?.branches || [{ name: selectedRepo.defaultBranch || 'main' }]).map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} {b.name === selectedRepo.defaultBranch ? '(default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Latest Commit Preview */}
              {repoDetails?.latestCommit && (
                <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span className="truncate max-w-md">
                    Latest commit: <span className="text-slate-200">"{repoDetails.latestCommit.message}"</span>
                  </span>
                  <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-blue-400 shrink-0">
                    {repoDetails.latestCommit.sha?.slice(0, 7)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing Project...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Import Project
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Step 1: Browse Repositories */
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories by name or description..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
              {['all', 'public', 'private'].map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                    visibility === v
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-200 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-sm">Fetching your GitHub repositories...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Github className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-medium">No matching repositories found</p>
              <p className="text-xs text-slate-500">
                Ensure your repository is accessible to the authorized GitHub account.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  className="p-3.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/40 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors truncate">
                        {repo.name}
                      </span>
                      {repo.isPrivate ? (
                        <Badge variant="warning" size="xs">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="default" size="xs">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </Badge>
                      )}
                      {repo.language && repo.language !== 'Unknown' && (
                        <Badge variant="primary" size="xs">
                          <Code2 className="w-2.5 h-2.5" /> {repo.language}
                        </Badge>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-slate-400 truncate max-w-xl">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> {repo.defaultBranch}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Updated{' '}
                        {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 group-hover:text-blue-400 transition-colors">
                      Select
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default RepoSelectorModal;

