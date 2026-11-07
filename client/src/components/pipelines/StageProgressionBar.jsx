import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  GitBranch,
  Terminal,
  Container,
  Rocket,
  ShieldCheck,
  MinusCircle
} from 'lucide-react';

const STAGES = [
  { key: 'source', label: 'Source', icon: GitBranch, subStates: ['pending', 'queued', 'checking_source', 'checkout'] },
  { key: 'build', label: 'Build', icon: Terminal, subStates: ['installing_dependencies', 'building', 'validating_output'] },
  { key: 'containerize', label: 'Docker', icon: Container, subStates: ['docker_building'], optional: true },
  { key: 'deploy', label: 'Vercel Deploy', icon: Rocket, subStates: ['deploying'] },
  { key: 'verify', label: 'Verify', icon: ShieldCheck, subStates: ['verifying_deployment'] },
];

export const StageProgressionBar = ({ status, currentStage = null, executionEvents = [] }) => {
  // Determine status for each macro stage
  // Macro stage status: 'completed' | 'active' | 'failed' | 'pending' | 'skipped'

  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isSuccess = status === 'success';

  // Helper to check if a stage was skipped (e.g. Docker when not configured)
  const dockerSkipped = executionEvents.some(
    (e) => (e.stage === 'docker_building' || e.stage === 'docker') && e.status === 'skipped'
  );

  const getStageState = (stageKey) => {
    if (isCancelled && (!currentStage || currentStage === 'cancelled')) {
      return 'cancelled';
    }

    if (stageKey === 'containerize' && dockerSkipped) {
      return 'skipped';
    }

    if (isSuccess) {
      if (stageKey === 'containerize' && dockerSkipped) return 'skipped';
      return 'completed';
    }

    // Map currentStage string to macro stage
    let activeMacro = 'source';
    if (['installing_dependencies', 'building', 'validating_output'].includes(currentStage)) {
      activeMacro = 'build';
    } else if (currentStage === 'docker_building') {
      activeMacro = 'containerize';
    } else if (currentStage === 'deploying') {
      activeMacro = 'deploy';
    } else if (currentStage === 'verifying_deployment') {
      activeMacro = 'verify';
    }

    const order = ['source', 'build', 'containerize', 'deploy', 'verify'];
    const activeIdx = order.indexOf(activeMacro);
    const thisIdx = order.indexOf(stageKey);

    if (thisIdx < activeIdx) {
      return 'completed';
    } else if (thisIdx === activeIdx) {
      if (isFailed) return 'failed';
      if (isCancelled) return 'cancelled';
      return 'active';
    } else {
      return 'pending';
    }
  };

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />

        {STAGES.map((stg, idx) => {
          const state = getStageState(stg.key);
          const Icon = stg.icon;

          let badgeStyle = 'bg-slate-900 border-slate-700 text-slate-500';
          let iconContent = <Clock className="w-4 h-4 text-slate-500" />;

          if (state === 'completed') {
            badgeStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20';
            iconContent = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
          } else if (state === 'active') {
            badgeStyle = 'bg-blue-950/80 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20 animate-pulse';
            iconContent = <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
          } else if (state === 'failed') {
            badgeStyle = 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/20';
            iconContent = <XCircle className="w-4 h-4 text-rose-400" />;
          } else if (state === 'cancelled') {
            badgeStyle = 'bg-amber-950/80 border-amber-500 text-amber-400';
            iconContent = <MinusCircle className="w-4 h-4 text-amber-400" />;
          } else if (state === 'skipped') {
            badgeStyle = 'bg-slate-900/60 border-slate-800 text-slate-600 border-dashed';
            iconContent = <MinusCircle className="w-4 h-4 text-slate-600" />;
          }

          return (
            <div key={stg.key} className="flex flex-col items-center relative z-10 group">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${badgeStyle}`}
              >
                {state === 'active' ? iconContent : <Icon className="w-4 h-4" />}
              </div>
              <div className="mt-2 text-center">
                <span
                  className={`text-xs font-medium block transition-colors ${
                    state === 'active'
                      ? 'text-blue-400 font-semibold'
                      : state === 'completed'
                      ? 'text-emerald-400'
                      : state === 'failed'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {stg.label}
                </span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {state}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StageProgressionBar;

