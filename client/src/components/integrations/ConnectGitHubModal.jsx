import React, { useState } from 'react';
import { Github, KeyRound, ExternalLink, ArrowRight, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { getOAuthConnectUrl, connectWithPat } from '../../services/githubService';
import { useNotification } from '../../context/NotificationContext';

export const ConnectGitHubModal = ({ isOpen, onClose, onConnected, oauthConfigured = true }) => {
  const [activeTab, setActiveTab] = useState(oauthConfigured ? 'oauth' : 'pat');
  const [patToken, setPatToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const notify = useNotification();

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = await getOAuthConnectUrl();
      window.location.href = url;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to initiate GitHub OAuth flow';
      setError(msg);
      setLoading(false);
    }
  };

  const handlePatSubmit = async (e) => {
    e.preventDefault();
    if (!patToken.trim()) {
      setError('Please provide a valid GitHub Personal Access Token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await connectWithPat(patToken.trim());
      notify.success(res.message || 'GitHub connected successfully!');
      onConnected && onConnected(res.integration);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to authenticate with GitHub PAT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect GitHub Account" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'oauth'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Github className="w-4 h-4" />
            OAuth Authorization
          </button>
          <button
            onClick={() => setActiveTab('pat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'pat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Personal Access Token
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {activeTab === 'oauth' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Requested Permissions (Least Privilege):
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li><span className="text-slate-900 font-mono font-medium">repo</span>: Read public and private repository metadata & branch trees.</li>
                <li><span className="text-slate-900 font-mono font-medium">read:user</span>: Read GitHub profile name & avatar.</li>
                <li>Tokens are securely encrypted on the backend with AES-256-GCM.</li>
              </ul>
            </div>

            <button
              onClick={handleOAuthConnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Github className="w-4 h-4" />
              {loading ? 'Redirecting to GitHub...' : 'Continue with GitHub OAuth'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-center text-slate-500">
              You will be redirected to GitHub to authorize Pipeline One.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePatSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                GitHub Personal Access Token (Classic or Fine-Grained)
              </label>
              <input
                type="password"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Generate a token with <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded font-mono">repo</code> and{' '}
                <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded font-mono">read:user</code> scopes at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  GitHub Token Settings <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Your token is encrypted using AES-256-GCM before storage.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !patToken.trim()}
                className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Verifying...' : 'Connect Token'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ConnectGitHubModal;
