import React, { useState } from 'react';
import { Server, KeyRound, User, ExternalLink, ShieldCheck, AlertCircle, Loader2, Globe } from 'lucide-react';
import Modal from '../common/Modal';
import { connectJenkins } from '../../services/integrationService';
import { useNotification } from '../../context/NotificationContext';

export const ConnectJenkinsModal = ({ isOpen, onClose, onConnected }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const notify = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serverUrl.trim() || !username.trim() || !apiToken.trim()) {
      setError('Please provide the Jenkins server URL, username, and API token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await connectJenkins({
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        apiToken: apiToken.trim(),
        name: name.trim() || undefined,
      });

      notify.success(res.message || 'Jenkins server connected successfully!');
      onConnected && onConnected(res.integration);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to authenticate with Jenkins server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Jenkins Server" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-3 p-3.5 bg-amber-950/20 rounded-xl border border-amber-500/30 text-xs text-amber-200">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Security Protocol:</strong> Pipeline One connects using HTTP Basic Auth with a <strong>Jenkins API Token</strong> (never account passwords).
            </p>
            <p className="text-[11px] text-amber-300/80">
              Strict SSRF defense is active: private cloud metadata and unauthorized internal IP subnets are automatically blocked.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Jenkins Server URL</label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://jenkins.yourdomain.com:8080"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">Must include http:// or https:// and port if applicable.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Jenkins Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Connection Label (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production Jenkins"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Jenkins API Token</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 pt-0.5">
              Generate in Jenkins via:{' '}
              <span className="text-slate-300 font-medium">User Profile &rarr; Configure &rarr; API Token &rarr; Add new Token</span>
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-[11px] text-slate-400">
          <p className="font-medium text-slate-300 mb-1">What permissions does Pipeline One require?</p>
          <p>Read access to inspect Jobs, Job status, and Crumb issuer. Full build dispatch permissions will be utilized in Phase 3 automated pipelines.</p>
        </div>

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
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium text-sm transition shadow-lg shadow-amber-900/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Jenkins...
              </>
            ) : (
              <>
                <Server className="w-4 h-4" />
                Connect Jenkins
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConnectJenkinsModal;
