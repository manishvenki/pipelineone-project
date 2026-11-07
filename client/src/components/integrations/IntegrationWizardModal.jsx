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
      iconColor: 'text-slate-900',
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
      iconColor: 'text-blue-600',
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
      iconColor: 'text-amber-600',
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
      iconColor: 'text-slate-900',
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
                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/50 shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    Step {idx + 1}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${step.iconColor}`} />
                  <span className="text-xs font-semibold text-slate-900 truncate">{step.title.split(' ')[0]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Step Content */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <current.icon className={`w-6 h-6 ${current.iconColor}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{current.title}</h3>
                <p className="text-xs text-slate-500">{current.subtitle}</p>
              </div>
            </div>

            {current.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Not Connected
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {current.description}
          </p>

          {current.connected ? (
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500">Connected account:</span>
              <span className="font-mono font-semibold text-blue-600">{current.accountInfo || 'Active'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => onOpenConnectModal(current.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition shadow-sm flex items-center gap-2"
              >
                Connect {current.title.split(' ')[0]} Now <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <a
                href={current.docLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                Configuration Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition flex items-center gap-1 font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
              >
                Complete Setup
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition shadow-sm flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrationWizardModal;
