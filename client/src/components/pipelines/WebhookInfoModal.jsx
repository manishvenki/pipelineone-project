import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import Modal from '../common/Modal';
import { getPipelineConfig } from '../../services/pipelineService';
import { useNotification } from '../../context/NotificationContext';

export const WebhookInfoModal = ({
  isOpen,
  onClose,
  project,
}) => {
  const notify = useNotification();
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedType, setCopiedType] = useState(false);

  useEffect(() => {
    if (!isOpen || !project?.id) return;

    const fetchConfig = async () => {
      try {
        const res = await getPipelineConfig(project.id);
        if (res.configuration?.webhook_secret) {
          setWebhookSecret(res.configuration.webhook_secret);
        }
      } catch (err) {
        console.error('Failed to load webhook secret', err);
      }
    };

    fetchConfig();
  }, [isOpen, project?.id]);

  if (!isOpen) return null;

  const payloadUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/github`;
  const repoUrl = project?.repo_url || (project?.name ? `https://github.com/settings/tokens` : null);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      notify.success('Payload URL copied');
    } else if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      notify.success('Webhook Secret copied');
    } else if (type === 'type') {
      setCopiedType(true);
      setTimeout(() => setCopiedType(false), 2000);
      notify.success('Content type copied');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="GitHub Webhook Automation Setup"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <p className="text-xs text-slate-600">
          Configure a GitHub Webhook so that whenever you run <code className="text-blue-600 font-mono font-medium">git push</code>,
          Pipeline One automatically triggers your CI/CD pipeline, runs tests, and deploys to Vercel.
        </p>

        {/* Credentials Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          {/* Payload URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payload URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={payloadUrl}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(payloadUrl, 'url')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200 font-medium"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Content type
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="application/json"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard('application/json', 'type')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200 font-medium"
              >
                {copiedType ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Secret */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Secret (HMAC-SHA256 signature verification)</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecret ? 'Hide' : 'Reveal'}
              </button>
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={webhookSecret || '••••••••••••••••••••••••••••••••'}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookSecret, 'secret')}
                disabled={!webhookSecret}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200 font-medium"
              >
                {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSecret ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Setup Steps Guide */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            How to configure in GitHub
          </h4>
          <ol className="space-y-2.5 text-xs text-slate-600 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>
              Open your repository on GitHub and navigate to <span className="text-slate-900 font-medium">Settings → Webhooks</span>.
            </li>
            <li>
              Click <span className="text-slate-900 font-medium">Add webhook</span>.
            </li>
            <li>
              Paste the <span className="text-blue-600 font-mono">Payload URL</span> and choose <span className="text-blue-600 font-mono">application/json</span> as Content type.
            </li>
            <li>
              Paste the <span className="text-blue-600 font-mono">Secret</span> above.
            </li>
            <li>
              Select <span className="text-slate-900 font-medium">"Just the push event"</span> and ensure <span className="text-slate-900 font-medium">"Active"</span> is checked.
            </li>
            <li>
              Click <span className="text-emerald-700 font-medium">Add webhook</span>. GitHub will send a test ping, which Pipeline One validates instantly.
            </li>
          </ol>
        </div>

        {/* Security Alert */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
          <Shield className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
          <span>
            Every incoming payload is cryptographically authenticated via constant-time HMAC-SHA256 signature checking.
            Duplicate deliveries are automatically deduplicated using the GitHub Delivery ID.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {repoUrl && (
            <a
              href={`${repoUrl}/settings/hooks`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 transition-colors font-medium"
            >
              Open GitHub Webhooks Settings <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold ml-auto transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WebhookInfoModal;
