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
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Security Protocol:</strong> Pipeline One connects using HTTP Basic Auth with a <strong>Jenkins API Token</strong> (never account passwords).
            </p>
            <p className="text-[11px] text-amber-800">
              Strict SSRF defense is active: private cloud metadata and unauthorized internal IP subnets are automatically blocked.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Jenkins Server URL</label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://jenkins.yourdomain.com:8080"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500">Must include http:// or https:// and port if applicable.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Jenkins Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Jenkins API Token</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="11xxxxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Server Nickname (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Jenkins Cluster"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Generate an API token inside Jenkins via <strong>User Profile &rarr; Configure &rarr; API Token &rarr; Add new Token</strong>.
          </p>
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
            disabled={loading || !serverUrl.trim() || !username.trim() || !apiToken.trim()}
            className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Server...
              </>
            ) : (
              'Connect Server'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConnectJenkinsModal;
