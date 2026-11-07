import React from 'react';
import { Rocket, Boxes, Container, Layers, Triangle, CheckCircle2, ArrowRight } from 'lucide-react';
import Badge from '../components/common/Badge';

export const DeploymentsPage = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Rocket className="w-6 h-6 text-emerald-400" /> Automated Deployments
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Static web continuous delivery pipelines, automated builds, and edge delivery.
        </p>
      </div>

      <div className="p-8 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20">
          <Rocket className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <Badge variant="comingSoon" size="sm">Coming in Phase 2</Badge>
          <h2 className="text-xl font-bold text-white">Full CI/CD Engine Integration</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Phase 1 establishes the robust foundation: Authentication, PostgreSQL & Atlas data stores, real GitHub repository sync, and static project detection.
            Phase 2 will introduce automated build containers, Docker Hub pushing, and live webhooks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs max-w-2xl mx-auto pt-4 text-left">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <Container className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-white">Docker Hub</h4>
            <p className="text-slate-400 text-[11px]">Automated image building & registry pushing.</p>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h4 className="font-semibold text-white">Jenkins</h4>
            <p className="text-slate-400 text-[11px]">Automated pipeline orchestration & job triggers.</p>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <Triangle className="w-5 h-5 text-slate-200 fill-white" />
            <h4 className="font-semibold text-white">Vercel</h4>
            <p className="text-slate-400 text-[11px]">Global edge static network distribution.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentsPage;
