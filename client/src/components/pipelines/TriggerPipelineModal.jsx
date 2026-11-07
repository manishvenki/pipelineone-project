import React, { useState, useEffect } from 'react';
import {
  Rocket,
  GitBranch,
  Layers,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Play,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import Modal from '../common/Modal';
import { triggerPipelineRun } from '../../services/pipelineService';
import { getProjects } from '../../services/projectService';
import { useNotification } from '../../context/NotificationContext';

export const TriggerPipelineModal = ({
  isOpen,
  onClose,
  initialProjectId = null,
  onTriggerSuccess,
}) => {
  const notify = useNotification();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [branch, setBranch] = useState('main');
  const [environment, setEnvironment] = useState('production');
  const [commitMessage, setCommitMessage] = useState('Manual trigger via Pipeline One');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadProjectsList = async () => {
      try {
        const res = await getProjects();
        if (res.projects) {
          setProjects(res.projects);
          if (!selectedProjectId && res.projects.length > 0) {
            setSelectedProjectId(initialProjectId || res.projects[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };

    loadProjectsList();
  }, [isOpen, initialProjectId, selectedProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await triggerPipelineRun({
        projectId: selectedProjectId,
        branch: branch.trim() || 'main',
        environment,
        commitMessage: commitMessage.trim() || undefined,
      });

      notify.success('Pipeline run triggered successfully');
      if (onTriggerSuccess) {
        onTriggerSuccess(res.execution);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to trigger pipeline');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trigger CI/CD Pipeline Run"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Project Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Select Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            required
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.framework || 'pure_html'})
              </option>
            ))}
          </select>
        </div>

        {/* Branch & Environment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-600" /> Target Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" /> Target Environment
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              <option value="production">Production</option>
              <option value="preview">Preview</option>
            </select>
          </div>
        </div>

        {/* Commit message override */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Deployment Note / Commit Message
          </label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Manual trigger note"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Automated Execution Steps Preview */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            Pipeline Execution Flow
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Checkout & Verify</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Build & Test</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Vercel Edge Deploy</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedProjectId}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            {loading ? 'Triggering...' : 'Deploy Now'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TriggerPipelineModal;
