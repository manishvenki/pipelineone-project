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
        <div className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            For security, Pipeline One requires a <strong>Personal Access Token (PAT)</strong> with Read/Write/Delete permissions. Your account password is never requested or stored.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Docker Hub Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. dockerdev"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Personal Access Token (PAT)</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="dckr_pat_xxxxxxxxxxxxxxxxxxxx"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 pt-0.5">
              Create a PAT at{' '}
              <a
                href="https://hub.docker.com/settings/security"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                Docker Hub Security Settings <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !username.trim() || !token.trim()}
            className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
              </>
            ) : (
              'Connect Account'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConnectDockerHubModal;
