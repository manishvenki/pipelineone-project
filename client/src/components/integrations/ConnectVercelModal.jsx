import React, { useState } from 'react';
import { Triangle, KeyRound, ExternalLink, ShieldCheck, AlertCircle, Loader2, ArrowRight, Users } from 'lucide-react';
import Modal from '../common/Modal';
import { connectVercel, getVercelOAuthUrl } from '../../services/integrationService';
import { useNotification } from '../../context/NotificationContext';

export const ConnectVercelModal = ({ isOpen, onClose, onConnected }) => {
  const [activeTab, setActiveTab] = useState('token'); // 'token' or 'oauth'
  const [token, setToken] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const notify = useNotification();

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = await getVercelOAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.error || 'Vercel OAuth application is not configured on the server. Please connect using a Personal Access Token below.');
      setActiveTab('token');
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please provide your Vercel Personal Access Token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await connectVercel({
        token: token.trim(),
        teamId: teamId.trim() || undefined,
      });

      notify.success(res.message || 'Vercel account connected successfully!');
      onConnected && onConnected(res.integration);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to authenticate with Vercel API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Vercel Account" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'token'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Personal Access Token (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'oauth'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OAuth Flow
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'oauth' ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Vercel Integration Permissions:
              </div>
              <p>
                Authorizing Pipeline One will allow automated deployment creation, domain configuration, and build status polling.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Triangle className="w-3.5 h-3.5 fill-white" />
              {loading ? 'Redirecting to Vercel...' : 'Continue with Vercel OAuth'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Vercel Personal Access Token</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="vck_xxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5">
                Generate an access token in your{' '}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  Vercel Account Settings <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Team / Scope ID (Optional)</label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="team_xxxxxxxxxxxx (leave empty for personal account)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Tokens are encrypted at rest with AES-256-GCM.
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
                disabled={loading || !token.trim()}
                className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Token...
                  </>
                ) : (
                  'Connect Vercel'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ConnectVercelModal;
