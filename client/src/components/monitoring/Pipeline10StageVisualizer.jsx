import React, { useState } from 'react';
import {
  GitBranch,
  Server,
  Download,
  Package,
  Cpu,
  CheckCircle2,
  Container,
  UploadCloud,
  Rocket,
  Globe,
  Loader2,
  XCircle,
  Clock,
  MinusCircle,
  Ban,
  ChevronRight,
  AlertTriangle,
  Info,
} from 'lucide-react';

const STAGE_CONFIG = [
  {
    key: 'github_source',
    title: 'GitHub Source',
    desc: 'Webhook / commit trigger',
    icon: GitBranch,
  },
  {
    key: 'jenkins_queue',
    title: 'Jenkins Queue',
    desc: 'Queue & node allocation',
    icon: Server,
  },
  {
    key: 'source_checkout',
    title: 'Source Checkout',
    desc: 'Git clone & checkout',
    icon: Download,
  },
  {
    key: 'installing_dependencies',
    title: 'Dependencies',
    desc: 'npm / yarn install',
    icon: Package,
  },
  {
    key: 'build',
    title: 'Static Build',
    desc: 'Framework build execution',
    icon: Cpu,
  },
  {
    key: 'static_output_validation',
    title: 'Validation',
    desc: 'Verify build artifacts',
    icon: CheckCircle2,
  },
  {
    key: 'docker_build',
    title: 'Docker Build',
    desc: 'Container image build',
    icon: Container,
    isOptional: true,
  },
  {
    key: 'docker_hub_publish',
    title: 'Docker Publish',
    desc: 'Push to Docker Hub',
    icon: UploadCloud,
    isOptional: true,
  },
  {
    key: 'vercel_deployment',
    title: 'Vercel Deploy',
    desc: 'Deploy static assets',
    icon: Rocket,
  },
  {
    key: 'deployment_verification',
    title: 'Verification',
    desc: 'Live deployment check',
    icon: Globe,
  },
];

export const Pipeline10StageVisualizer = ({ stages = [], onSelectStage, selectedStageKey }) => {
  const [hoveredStage, setHoveredStage] = useState(null);

  // Map incoming stages by stage_name or key
  const stageMap = {};
  stages.forEach((s) => {
    stageMap[s.stage_name || s.key] = s;
  });

  const getStageStatus = (cfg) => {
    const s = stageMap[cfg.key];
    if (!s) return 'waiting';
    return s.stage_status || s.status || 'waiting';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          dot: 'bg-emerald-400',
          label: 'Completed',
        };
      case 'running':
        return {
          bg: 'bg-blue-500/10 border-blue-500/40 text-blue-400 ring-2 ring-blue-500/30',
          icon: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />,
          dot: 'bg-blue-400 animate-ping',
          label: 'In Progress',
        };
      case 'failed':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          dot: 'bg-rose-400',
          label: 'Failed',
        };
      case 'queued':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <Clock className="w-5 h-5 text-amber-400" />,
          dot: 'bg-amber-400',
          label: 'Queued',
        };
      case 'skipped':
        return {
          bg: 'bg-slate-800/40 border-slate-700/40 text-slate-500',
          icon: <MinusCircle className="w-5 h-5 text-slate-500" />,
          dot: 'bg-slate-600',
          label: 'Skipped',
        };
      case 'cancelled':
        return {
          bg: 'bg-amber-950/20 border-amber-500/20 text-amber-400',
          icon: <Ban className="w-5 h-5 text-amber-400" />,
          dot: 'bg-amber-400',
          label: 'Cancelled',
        };
      case 'waiting':
      default:
        return {
          bg: 'bg-slate-900/60 border-slate-800 text-slate-500',
          icon: <Clock className="w-5 h-5 text-slate-600" />,
          dot: 'bg-slate-700',
          label: 'Waiting',
        };
    }
  };

  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return null;
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${min}m ${rem}s`;
  };

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">10-Stage Pipeline Visualizer</h3>
            <p className="text-xs text-slate-400">Canonical end-to-end execution lifecycle & stage telemetry</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Running
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Queued
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600" /> Skipped / Waiting
          </span>
        </div>
      </div>

      {/* 10-Stage Grid / Node Sequence */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 relative">
        {STAGE_CONFIG.map((cfg, idx) => {
          const status = getStageStatus(cfg);
          const meta = getStatusBadge(status);
          const stageData = stageMap[cfg.key] || {};
          const isSelected = selectedStageKey === cfg.key;
          const StageIcon = cfg.icon;
          const duration = formatDuration(stageData.duration_ms);

          return (
            <div
              key={cfg.key}
              onClick={() => onSelectStage && onSelectStage(cfg.key)}
              onMouseEnter={() => setHoveredStage(cfg.key)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`relative group rounded-xl p-3.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] ${
                meta.bg
              } ${
                isSelected
                  ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-500/10'
                  : 'hover:border-slate-600'
              }`}
            >
              {/* Step number badge & stage status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                  #{idx + 1}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>

              {/* Stage Icon & Title */}
              <div className="space-y-1.5 my-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                    <StageIcon className="w-4 h-4 text-slate-200" />
                  </div>
                  <h4 className="text-xs font-semibold text-white tracking-tight leading-tight line-clamp-1">
                    {cfg.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {cfg.desc}
                </p>
              </div>

              {/* Duration or Error Footer */}
              <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                {status === 'failed' ? (
                  <span className="text-rose-400 font-sans flex items-center gap-1 font-semibold truncate">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Error
                  </span>
                ) : duration ? (
                  <span className="text-slate-300 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {duration}
                  </span>
                ) : cfg.isOptional ? (
                  <span className="text-slate-500 italic">Optional</span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}

                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90 text-blue-400' : 'text-slate-600 group-hover:text-slate-300'}`} />
              </div>

              {/* Error popover hover tooltip if failed */}
              {status === 'failed' && stageData.error_message && hoveredStage === cfg.key && (
                <div className="absolute z-20 bottom-full left-0 right-0 mb-2 p-3 bg-rose-950 border border-rose-500/40 rounded-xl shadow-2xl text-rose-200 text-xs">
                  <div className="font-semibold mb-1 flex items-center gap-1 text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> Stage Failure Details:
                  </div>
                  <p className="font-mono text-[11px] whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {stageData.error_message}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Pipeline10StageVisualizer;
