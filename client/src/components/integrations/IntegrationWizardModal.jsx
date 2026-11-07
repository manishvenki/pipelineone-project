import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Github,
  Container,
  Server,
  Triangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import Modal from '../common/Modal';

export const IntegrationWizardModal = ({
  isOpen,
  onClose,
  integrations = {},
  onOpenConnectModal,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'github',
      title: 'GitHub (Source Code)',
      subtitle: 'Authorize repository access for continuous deployment.',
      icon: Github,
      iconColor: 'text-white',
      accentColor: 'border-slate-400',
      description:
        'Connect your GitHub account to let Pipeline One detect static repositories, track commits, and fetch files automatically.',
      connected: !!integrations.github?.connected,
      accountInfo: integrations.github?.account_username,
      skippable: false,
      docLink: 'https://github.com/settings/tokens',
    },
    {
      id: 'dockerhub',
      title: 'Docker Hub (Registry)',
      subtitle: 'Store and publish production container images.',
      icon: Container,
      iconColor: 'text-blue-400',
      accentColor: 'border-blue-500',
      description:
        'Containerize your static web applications into minimal alpine Nginx images and push them directly to your Docker Hub repository.',
      connected: !!integrations.dockerhub?.connected,
      accountInfo: integrations.dockerhub?.account_username,
      skippable: true,
      docLink: 'https://hub.docker.com/settings/security',
    },
    {
      id: 'jenkins',
      title: 'Jenkins (CI Server)',
      subtitle: 'Orchestrate build workflows and automated testing.',
      icon: Server,
      iconColor: 'text-amber-400',
      accentColor: 'border-amber-500',
      description:
        'Link an automated Jenkins automation server to trigger CI pipeline runs, test suites, and deployment stages on commit.',
      connected: !!integrations.jenkins?.connected,
      accountInfo: integrations.jenkins?.server_url || integrations.jenkins?.account_username,
      skippable: true,
      docLink: 'https://www.jenkins.io/doc/book/using/using-credentials/',
    },
    {
      id: 'vercel',
      title: 'Vercel (Deployment Target)',
      subtitle: 'Fast global CDN delivery for static websites.',
      icon: Triangle,
      iconColor: 'text-white',
      accentColor: 'border-white',
      description:
        'Deploy static sites, HTML/CSS bundles, and React builds directly to Vercel edge infrastructure with automatic SSL and preview URLs.',
      connected: !!integrations.vercel?.connected,
      accountInfo: integrations.vercel?.account_username,
      skippable: true,
      docLink: 'https://vercel.com/account/tokens',
    },
  ];

  const current = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const connectedCount = steps.filter((s) => s.connected).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DevOps Integrations Setup Wizard"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Step Progress Tracker */}
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.connected;
            const isCurrent = idx === currentStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`p-2.5 rounded-xl border transition text-left flex flex-col justify-between h-20 ${
                  isCurrent
                    ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500/50'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Step {idx + 1}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${step.iconColor}`} />
                  <span className="text-xs font-medium text-white truncate">{step.title.split(' ')[0]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Step Content */}
        <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <current.icon className={`w-6 h-6 ${current.iconColor}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{current.title}</h3>
                <p className="text-xs text-slate-400">{current.subtitle}</p>
              </div>
            </div>

            {current.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                Not Connected
              </span>
            )}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{current.description}</p>

          {current.connected ? (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <div>
                Connected as: <span className="font-mono font-bold text-white">{current.accountInfo || 'Active'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConnectModal(current.id);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
              >
                Reconfigure
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConnectModal(current.id);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-900/30"
              >
                <current.icon className="w-4 h-4" />
                Connect {current.title.split(' ')[0]} Now
              </button>

              <a
                href={current.docLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition py-1"
              >
                Provider setup docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {connectedCount} of {steps.length} platforms connected
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Finish Wizard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition border border-slate-700"
              >
                {current.skippable && !current.connected ? 'Skip Step' : 'Next Step'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrationWizardModal;
