import React, { useState, useEffect } from 'react';
import {
  Github,
  Container,
  Server,
  Triangle,
  FolderGit2,
  Tag,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  Globe,
  Boxes,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Modal from '../common/Modal';
import {
  getDockerHubRepositories,
  getJenkinsJobs,
  getVercelProjects,
} from '../../services/integrationService';
import { getRepositories } from '../../services/githubService';

export const IntegrationDetailsModal = ({ isOpen, onClose, provider, accountName }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      setError(null);

      if (provider === 'dockerhub') {
        const res = await getDockerHubRepositories(1, 20);
        setData(res.results || []);
      } else if (provider === 'jenkins') {
        const res = await getJenkinsJobs();
        setData(res.jobs || []);
      } else if (provider === 'vercel') {
        const res = await getVercelProjects();
        setData(res.projects || []);
      } else if (provider === 'github') {
        const res = await getRepositories();
        setData(res.repositories || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || `Failed to fetch ${provider} data`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      setData([]);
      setError(null);
    }
  }, [isOpen, provider]);

  const getProviderTitle = () => {
    switch (provider) {
      case 'dockerhub':
        return 'Docker Hub Repositories';
      case 'jenkins':
        return 'Jenkins Pipeline Jobs';
      case 'vercel':
        return 'Vercel Edge Projects';
      case 'github':
        return 'GitHub Repositories';
      default:
        return 'Integration Details';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getProviderTitle()} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="text-xs text-slate-500">
            Account / Host: <strong className="text-slate-900 font-mono">{accountName || 'Active'}</strong>
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Querying {provider} API...</span>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {data.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                No items or resources returned from {provider} API.
              </div>
            ) : (
              data.map((item, idx) => {
                if (provider === 'dockerhub') {
                  return (
                    <div
                      key={item.name || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Container className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-900 font-mono">{item.name}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                            {item.is_private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.description || 'No description'}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        <div>{item.pull_count || 0} pulls</div>
                        <div className="text-slate-400">{item.star_count || 0} stars</div>
                      </div>
                    </div>
                  );
                }

                if (provider === 'jenkins') {
                  return (
                    <div
                      key={item.name || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Server className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Type: {item._class ? item._class.split('.').pop() : 'Job'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {item.color || 'blue'}
                        </span>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }

                if (provider === 'vercel') {
                  return (
                    <div
                      key={item.id || item.name || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Triangle className="w-3.5 h-3.5 fill-slate-800 text-slate-800" />
                          <span className="font-semibold text-slate-900 font-mono">{item.name}</span>
                          {item.framework && (
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                              {item.framework}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          {item.link?.repo && (
                            <span className="flex items-center gap-1">
                              <Github className="w-3 h-3 text-slate-500" /> {item.link.repo}
                            </span>
                          )}
                          <span>Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'recently'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.targets?.production?.url && (
                          <a
                            href={`https://${item.targets.production.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-medium flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" /> Visit
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }

                if (provider === 'github') {
                  return (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4 text-slate-800" />
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                            {item.isPrivate ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.description || 'No description'}</p>
                      </div>

                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        <div>Branch: {item.defaultBranch || 'main'}</div>
                        <div className="text-slate-400">{item.language || 'Static'}</div>
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default IntegrationDetailsModal;
