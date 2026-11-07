import React from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart2,
  PieChart,
  FolderGit2,
} from 'lucide-react';

/**
 * Custom Responsive Bar Chart for Daily Deployment Activity
 */
export const DailyTrendBarChart = ({ trends = [] }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-500">
        No deployment trend data recorded for this period.
      </div>
    );
  }

  // Find max total count for scale
  const maxCount = Math.max(...trends.map((t) => Number(t.total_count) || 0), 1);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Successful
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Failed
        </span>
        <span className="text-slate-500">Peak: {maxCount} runs/day</span>
      </div>

      <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-1 border-b border-slate-800">
        {trends.map((item, idx) => {
          const total = Number(item.total_count) || 0;
          const successful = Number(item.successful_count) || 0;
          const failed = Number(item.failed_count) || 0;
          const heightPercent = Math.round((total / maxCount) * 100);

          const successHeight = total > 0 ? (successful / total) * 100 : 0;
          const failHeight = total > 0 ? (failed / total) * 100 : 0;

          const dateLabel = item.date ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Day ${idx + 1}`;

          return (
            <div
              key={item.date || idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              {/* Tooltip */}
              <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                <div className="bg-slate-950 border border-slate-700 px-2 py-1 rounded shadow-xl text-[10px] text-white whitespace-nowrap">
                  <div className="font-semibold">{dateLabel}</div>
                  <div className="text-emerald-400">Success: {successful}</div>
                  <div className="text-rose-400">Failed: {failed}</div>
                </div>
                <div className="w-2 h-2 bg-slate-950 rotate-45 border-r border-b border-slate-700 -mt-1" />
              </div>

              {/* Stacked bar */}
              <div
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
                className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end bg-slate-800 group-hover:brightness-125 transition-all"
              >
                {failed > 0 && (
                  <div
                    style={{ height: `${failHeight}%` }}
                    className="w-full bg-rose-500/80"
                  />
                )}
                {successful > 0 && (
                  <div
                    style={{ height: `${successHeight}%` }}
                    className="w-full bg-emerald-500/90"
                  />
                )}
              </div>

              {/* X-axis date */}
              <span className="text-[9px] text-slate-500 mt-2 truncate w-full text-center group-hover:text-slate-300">
                {dateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Success Rate Circular Gauge
 */
export const SuccessRateGauge = ({ successRate = 0, total = 0, successful = 0, failed = 0 }) => {
  const rate = Math.min(100, Math.max(0, Math.round(Number(successRate) || 0)));
  const circumference = 2 * Math.PI * 40; // r=40
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            className="text-slate-800"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            className={`${
              rate >= 80 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-rose-500'
            } transition-all duration-1000 ease-out`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tracking-tight">{rate}%</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Reliability</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 w-full text-center border-t border-slate-800/80 pt-3">
        <div>
          <div className="text-emerald-400 font-bold text-sm">{successful}</div>
          <div className="text-[11px] text-slate-500">Passed</div>
        </div>
        <div>
          <div className="text-rose-400 font-bold text-sm">{failed}</div>
          <div className="text-[11px] text-slate-500">Failed</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Build Performance Metrics Card
 */
export const BuildPerformanceCard = ({ metrics = {} }) => {
  const formatSec = (ms) => {
    if (!ms || ms <= 0) return '0s';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  const avg = formatSec(metrics.avg_duration_ms);
  const min = formatSec(metrics.min_duration_ms);
  const max = formatSec(metrics.max_duration_ms);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Fastest</span>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{min}</div>
        </div>
        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-center">
          <span className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider">Average</span>
          <div className="text-base font-mono font-bold text-white mt-0.5">{avg}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Slowest</span>
          <div className="text-sm font-mono font-bold text-amber-400 mt-1">{max}</div>
        </div>
      </div>

      <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium mb-1">
          <Clock className="w-3.5 h-3.5 text-blue-400" /> Continuous CI/CD Throughput
        </div>
        Calculated from complete pipeline checkout, build, containerization, and static verification runtimes.
      </div>
    </div>
  );
};

/**
 * Project Activity Distribution List
 */
export const ProjectActivityDistribution = ({ projects = [] }) => {
  if (!projects || projects.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        No project deployment activity recorded.
      </div>
    );
  }

  const maxTotal = Math.max(...projects.map((p) => Number(p.total_deployments) || 0), 1);

  return (
    <div className="space-y-3">
      {projects.map((item, idx) => {
        const total = Number(item.total_deployments) || 0;
        const success = Number(item.successful_deployments) || 0;
        const failed = Number(item.failed_deployments) || 0;
        const pct = Math.round((total / maxTotal) * 100);
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

        return (
          <div key={item.project_id || idx} className="space-y-1.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                {item.project_name || 'Project'}
              </span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-slate-400">{total} runs</span>
                <span className={successRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                  {successRate}% pass
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(success / maxTotal) * 100}%` }}
                className="h-full bg-emerald-500 rounded-l-full"
              />
              <div
                style={{ width: `${(failed / maxTotal) * 100}%` }}
                className="h-full bg-rose-500 rounded-r-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default {
  DailyTrendBarChart,
  SuccessRateGauge,
  BuildPerformanceCard,
  ProjectActivityDistribution,
};

