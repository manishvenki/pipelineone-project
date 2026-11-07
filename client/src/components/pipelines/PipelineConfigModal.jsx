import React, { useState, useEffect } from 'react';
import {
  Settings,
  GitBranch,
  Terminal,
  Folder,
  Layers,
  Container,
  Rocket,
  Key,
  Copy,
  Check,
  RotateCcw,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import Modal from '../common/Modal';
import { getPipelineConfig, savePipelineConfig, resetPipelineConfig } from '../../services/pipelineService';
import { useNotification } from '../../context/NotificationContext';

export const PipelineConfigModal = ({
  isOpen,
  onClose,
  project,
  onConfigSaved
}) => {
  const notify = useNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [form, setForm] = useState({
    branch: 'main',
    auto_deploy_on_push: true,
    build_command: 'npm run build',
    install_command: 'npm install',
    output_directory: 'dist',
    node_version: '18',
    deploy_to_vercel: true,
    vercel_project_name: '',
    build_docker_image: false,
    docker_image_name: '',
    docker_image_tag: 'latest',
    push_to_dockerhub: false,
    jenkins_job_name: '',
    webhook_secret: '',
  });

  useEffect(() => {
    if (!isOpen || !project?.id) return;

    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getPipelineConfig(project.id);
        if (res.configuration) {
          const cfg = res.configuration;
          setForm({
            branch: cfg.branch || 'main',
            auto_deploy_on_push: cfg.auto_deploy_on_push !== false,
            build_command: cfg.build_command ?? '',
            install_command: cfg.install_command ?? '',
            output_directory: cfg.output_directory || 'dist',
            node_version: cfg.node_version || '18',
            deploy_to_vercel: cfg.deploy_to_vercel !== false,
            vercel_project_name: cfg.vercel_project_name || '',
            build_docker_image: !!cfg.build_docker_image,
            docker_image_name: cfg.docker_image_name || '',
            docker_image_tag: cfg.docker_image_tag || 'latest',
            push_to_dockerhub: !!cfg.push_to_dockerhub,
            jenkins_job_name: cfg.jenkins_job_name || '',
            webhook_secret: cfg.webhook_secret || '',
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load pipeline configuration');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [isOpen, project?.id]);

  const handleCopySecret = () => {
    if (!form.webhook_secret) return;
    navigator.clipboard.writeText(form.webhook_secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    notify.success('Webhook secret copied to clipboard');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await savePipelineConfig(project.id, form);
      notify.success('Pipeline configuration updated successfully');
      if (onConfigSaved) onConfigSaved(res.configuration);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset this project configuration to static framework defaults?')) return;
    setLoading(true);
    try {
      await resetPipelineConfig(project.id);
      const res = await getPipelineConfig(project.id);
      if (res.configuration) {
        const cfg = res.configuration;
        setForm({
          branch: cfg.branch || 'main',
          auto_deploy_on_push: cfg.auto_deploy_on_push !== false,
          build_command: cfg.build_command ?? '',
          install_command: cfg.install_command ?? '',
          output_directory: cfg.output_directory || 'dist',
          node_version: cfg.node_version || '18',
          deploy_to_vercel: cfg.deploy_to_vercel !== false,
          vercel_project_name: cfg.vercel_project_name || '',
          build_docker_image: !!cfg.build_docker_image,
          docker_image_name: cfg.docker_image_name || '',
          docker_image_tag: cfg.docker_image_tag || 'latest',
          push_to_dockerhub: !!cfg.push_to_dockerhub,
          jenkins_job_name: cfg.jenkins_job_name || '',
          webhook_secret: cfg.webhook_secret || '',
        });
      }
      notify.success('Configuration reset to defaults');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure Pipeline: ${project?.name || 'Project'}`}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading pipeline settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Framework Header */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-white">Detected Framework</p>
                <p className="text-[11px] text-slate-400 capitalize">
                  {project?.framework?.replace('_', ' ') || 'Pure Static HTML'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
          </div>

          {/* 1. Branch & Trigger Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-400" /> Source & Triggers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Branch
                </label>
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  placeholder="main"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="relative flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_deploy_on_push}
                    onChange={(e) => setForm({ ...form, auto_deploy_on_push: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">
                    Auto-deploy on GitHub push
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Build Commands & Artifact Output */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" /> Build Specification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Build Command
                </label>
                <input
                  type="text"
                  value={form.build_command}
                  onChange={(e) => setForm({ ...form, build_command: e.target.value })}
                  placeholder="npm run build (blank for Pure HTML)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Install Command
                </label>
                <input
                  type="text"
                  value={form.install_command}
                  onChange={(e) => setForm({ ...form, install_command: e.target.value })}
                  placeholder="npm install (blank for Pure HTML)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Output Directory
                </label>
                <input
                  type="text"
                  value={form.output_directory}
                  onChange={(e) => setForm({ ...form, output_directory: e.target.value })}
                  placeholder="dist, build, or ."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Node.js Version
                </label>
                <select
                  value={form.node_version}
                  onChange={(e) => setForm({ ...form, node_version: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="18">Node 18 LTS</option>
                  <option value="20">Node 20 LTS</option>
                  <option value="22">Node 22 Current</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Vercel Destination */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" /> Deployment Destination (Vercel)
            </h4>
            <div className="space-y-3">
              <label className="relative flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.deploy_to_vercel}
                  onChange={(e) => setForm({ ...form, deploy_to_vercel: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span className="text-xs text-slate-300">
                  Deploy build output directly to Vercel Edge Network
                </span>
              </label>

              {form.deploy_to_vercel && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vercel Project Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.vercel_project_name}
                    onChange={(e) => setForm({ ...form, vercel_project_name: e.target.value })}
                    placeholder={`Defaults to ${project?.slug || project?.name?.toLowerCase().replace(/[^a-z0-9-_]/g, '-') || 'project'}`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Optional Docker Containerization */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Container className="w-4 h-4 text-cyan-400" /> Optional Docker Containerization
            </h4>
            <div className="space-y-3">
              <label className="relative flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.build_docker_image}
                  onChange={(e) => setForm({ ...form, build_docker_image: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span className="text-xs text-slate-300">
                  Build Docker image during pipeline execution
                </span>
              </label>

              {form.build_docker_image && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Image Name
                    </label>
                    <input
                      type="text"
                      value={form.docker_image_name}
                      onChange={(e) => setForm({ ...form, docker_image_name: e.target.value })}
                      placeholder="e.g. my-app"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Image Tag
                    </label>
                    <input
                      type="text"
                      value={form.docker_image_tag}
                      onChange={(e) => setForm({ ...form, docker_image_tag: e.target.value })}
                      placeholder="latest"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="relative flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.push_to_dockerhub}
                        onChange={(e) => setForm({ ...form, push_to_dockerhub: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                      />
                      <span className="text-xs text-slate-300">
                        Push built image to connected Docker Hub registry
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Jenkins Job Identifier */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Jenkins CI Job
            </h4>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Jenkins Job Name
              </label>
              <input
                type="text"
                value={form.jenkins_job_name}
                onChange={(e) => setForm({ ...form, jenkins_job_name: e.target.value })}
                placeholder={`pipeline-one-${project?.slug || 'project'}`}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* 6. Webhook Secret */}
          {form.webhook_secret && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> GitHub Webhook Secret
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={form.webhook_secret}
                  className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono select-all"
                />
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSecret ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default PipelineConfigModal;
