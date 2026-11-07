import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Layers,
  Tag,
  UploadCloud,
  AlertCircle,
  Loader2,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import Modal from '../common/Modal';
import { getProjects } from '../../services/projectService';
import { triggerDockerBuild, getDockerHubStatus, checkDockerEngine } from '../../services/integrationService';
import { useNotification } from '../../context/NotificationContext';

export const DockerBuildModal = ({
  isOpen,
  onClose,
  initialProjectId = null,
  onBuildTriggered,
}) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('latest');
  const [pushToDockerHub, setPushToDockerHub] = useState(false);
  const [destinationRepo, setDestinationRepo] = useState('');
  const [dockerHubUsername, setDockerHubUsername] = useState(null);
  const [dockerEngineStatus, setDockerEngineStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const notify = useNotification();

  useEffect(() => {
    if (!isOpen) return;

    const loadInitialData = async () => {
      try {
        const [projRes, hubRes, engineRes] = await Promise.allSettled([
          getProjects(),
          getDockerHubStatus(),
          checkDockerEngine(),
        ]);

        if (projRes.status === 'fulfilled' && projRes.value?.projects) {
          setProjects(projRes.value.projects);
          const initial = initialProjectId || (projRes.value.projects[0]?.id || '');
          setSelectedProjectId(initial);
          const activeProj = projRes.value.projects.find((p) => p.id === initial);
          if (activeProj) {
            const sanitized = activeProj.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
            setImageName(sanitized);
          }
        }

        if (hubRes.status === 'fulfilled' && hubRes.value?.connected) {
          setDockerHubUsername(hubRes.value.account_username);
        } else {
          setDockerHubUsername(null);
          setPushToDockerHub(false);
        }

        if (engineRes.status === 'fulfilled') {
          setDockerEngineStatus(engineRes.value);
        }
      } catch (err) {
        console.error('Failed to load build modal data', err);
      }
    };

    loadInitialData();
  }, [isOpen, initialProjectId]);

  // When selected project changes, update default image name
  const handleProjectChange = (e) => {
    const pId = e.target.value;
    setSelectedProjectId(pId);
    const p = projects.find((item) => item.id === pId);
    if (p) {
      const sanitized = p.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      setImageName(sanitized);
      if (dockerHubUsername) {
        setDestinationRepo(`${dockerHubUsername}/${sanitized}`);
      }
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select a project to containerize');
      return;
    }
    if (!imageName.trim() || !imageTag.trim()) {
      setError('Image name and tag are required');
      return;
    }
    if (pushToDockerHub && !dockerHubUsername) {
      setError('Cannot push to Docker Hub: no Docker Hub account is currently connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await triggerDockerBuild({
        projectId: selectedProjectId,
        imageName: imageName.trim(),
        imageTag: imageTag.trim(),
        pushToDockerHub,
        destinationRepo: pushToDockerHub ? destinationRepo.trim() : undefined,
      });

      notify.success(res.message || 'Docker container build dispatched successfully!');
      onBuildTriggered && onBuildTriggered(res.build);
      onClose();
      navigate(`/dashboard/builds?id=${res.build.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to dispatch Docker build');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Build Docker Container Image" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Docker Engine status banner */}
        {dockerEngineStatus && !dockerEngineStatus.available && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Docker Daemon Offline</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {dockerEngineStatus.error || 'Docker engine is not currently running. Please launch Docker Desktop or the Linux engine on your host.'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Project Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Target Project</label>
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            disabled={loading || !!initialProjectId}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-70"
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.detected_framework || proj.project_type || 'static'})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Project Specs Card */}
        {selectedProject && (
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Framework Type:</span>
              <span className="font-mono text-blue-400 font-semibold uppercase">
                {selectedProject.detected_framework || selectedProject.project_type || 'pure_html'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Runtime:</span>
              <span className="font-mono text-slate-200">
                {selectedProject.project_type === 'react_vite'
                  ? 'Multi-stage (node:20-alpine builder + nginx:alpine-slim)'
                  : 'nginx:alpine-slim (production optimized)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Exposed Port:</span>
              <span className="font-mono text-emerald-400">80/TCP</span>
            </div>
          </div>
        )}

        {/* Image naming */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-300">Image Name</label>
            <div className="relative">
              <Container className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="my-static-site"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Tag</label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={imageTag}
                onChange={(e) => setImageTag(e.target.value)}
                placeholder="latest"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Push to Docker Hub Option */}
        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={pushToDockerHub}
              onChange={(e) => {
                setPushToDockerHub(e.target.checked);
                if (e.target.checked && dockerHubUsername && !destinationRepo) {
                  setDestinationRepo(`${dockerHubUsername}/${imageName || 'app'}`);
                }
              }}
              disabled={!dockerHubUsername}
              className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-white">Publish image to Docker Hub</span>
              <p className="text-slate-400">
                {dockerHubUsername
                  ? `Authenticated as ${dockerHubUsername}. Automatically push upon build completion.`
                  : 'Docker Hub is not connected. Connect Docker Hub in Integrations to enable registry publishing.'}
              </p>
            </div>
          </label>

          {pushToDockerHub && dockerHubUsername && (
            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium text-slate-300">Destination Repository</label>
              <div className="relative">
                <UploadCloud className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={destinationRepo}
                  onChange={(e) => setDestinationRepo(e.target.value)}
                  placeholder={`${dockerHubUsername}/${imageName || 'app'}`}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Spawning Build Subprocess...
              </>
            ) : (
              <>
                <Container className="w-4 h-4" />
                Start Docker Build
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DockerBuildModal;
