import React, { useState } from 'react';
import { Container, KeyRound, User, ExternalLink, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { connectDockerHub } from '../../services/integrationService';
import { useNotification } from '../../context/NotificationContext';

export const ConnectDockerHubModal = ({ isOpen, onClose, onConnected }) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const notify = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !token.trim()) {
      setError('Please provide both your Docker Hub username and Personal Access Token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await connectDockerHub({
        username: username.trim(),
        personalAccessToken: token.trim(),
      });

      notify.success(res.message || 'Docker Hub connected successfully!');
      onConnected && onConnected(res.integration);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to authenticate with Docker Hub');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Docker Hub Account" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 p-3.5 bg-blue-950/20 rounded-xl border border-blue-500/30 text-xs text-blue-200">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            For security, Pipeline One requires a <strong>Personal Access Token (PAT)</strong> with Read/Write/Delete permissions. Your account password is never requested or stored.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Docker Hub Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. dockerdev"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Personal Access Token (PAT)</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="dckr_pat_xxxxxxxxxxxxxxxxxxxx"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 pt-0.5">
              Create a PAT at{' '}
              <a
                href="https://hub.docker.com/settings/security"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Docker Hub Security Settings <ExternalLink className="w-2.5 h-2.5" />
              </a>.
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-[11px] text-slate-400">
          Credentials are encrypted via <strong>AES-256-GCM</strong> and verified against the Docker Hub v2 authentication API.
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
              </>
            ) : (
              'Connect Docker Hub'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConnectDockerHubModal;

