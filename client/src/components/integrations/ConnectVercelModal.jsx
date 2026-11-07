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
        <div className="flex border-b border-slate-800 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('token')}
            className={`pb-2.5 px-3 font-medium border-b-2 transition ${
              activeTab === 'token'
                ? 'border-white text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personal Access Token (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`pb-2.5 px-3 font-medium border-b-2 transition ${
              activeTab === 'oauth'
                ? 'border-white text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            OAuth Flow
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'oauth' ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <Triangle className="w-4 h-4 fill-white" />
                Vercel OAuth 2.0 Authorization
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect via official Vercel authorization. You will be redirected to vercel.com to approve read & deployment permissions for your user account or team.
              </p>
            </div>

            <button
              onClick={handleOAuthConnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-black font-semibold text-sm transition shadow-lg shadow-white/10 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Connecting to Vercel...
                </>
              ) : (
                <>
                  <Triangle className="w-4 h-4 fill-current" />
                  Authorize with Vercel OAuth
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                Your Vercel token is encrypted with AES-256-GCM before storage. It is used to query projects, link static builds, and trigger deployments.
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Vercel Personal Access Token</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your Vercel token..."
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  Generate a token in{' '}
                  <a
                    href="https://vercel.com/account/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Vercel Account Settings &rarr; Tokens <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Team ID / Slug (Optional)</label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    placeholder="e.g. team_xxxxxxxxxxxx (leave empty for personal account)"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Leave blank to manage projects under your personal scope.</p>
              </div>
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold text-sm transition shadow-lg shadow-white/10 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Triangle className="w-4 h-4 fill-slate-950" />
                    Connect Vercel
                  </>
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
