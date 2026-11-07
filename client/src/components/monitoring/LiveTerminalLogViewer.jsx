import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Search,
  Copy,
  Download,
  Check,
  Pause,
  Play,
  ArrowDown,
  ShieldCheck,
  Filter,
  Trash2,
} from 'lucide-react';

export const LiveTerminalLogViewer = ({
  logs = [],
  filterStage = null,
  onClearFilterStage = null,
  isStreaming = false,
  streamStatus = 'idle', // 'connected' | 'connecting' | 'reconnecting' | 'closed' | 'idle'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalBottomRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Auto-scroll logic when new logs arrive (unless paused or autoScroll is toggled off)
  useEffect(() => {
    if (autoScroll && !isPaused && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isPaused]);

  // Filter logs based on search term, stage filter, and log level
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Stage filter
      if (filterStage && log.stage && log.stage.toLowerCase() !== filterStage.toLowerCase()) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'ALL' && log.level && log.level.toUpperCase() !== selectedLevel) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const msg = (log.message || log.text || '').toLowerCase();
        const stage = (log.stage || '').toLowerCase();
        const timestamp = (log.timestamp || '').toLowerCase();
        return msg.includes(query) || stage.includes(query) || timestamp.includes(query);
      }

      return true;
    });
  }, [logs, filterStage, selectedLevel, searchTerm]);

  // Copy all visible logs to clipboard
  const handleCopyLogs = () => {
    const textToCopy = filteredLogs
      .map((l) => `[${l.timestamp || ''}] [${(l.stage || 'GENERAL').toUpperCase()}] [${(l.level || 'INFO').toUpperCase()}] ${l.message || l.text || ''}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download logs as .txt file
  const handleDownloadLogs = () => {
    const textContent = filteredLogs
      .map((l) => `[${l.timestamp || ''}] [${(l.stage || 'GENERAL').toUpperCase()}] [${(l.level || 'INFO').toUpperCase()}] ${l.message || l.text || ''}`)
      .join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pipeline-execution-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLevelStyle = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return 'text-rose-400 bg-rose-950/30 border-rose-500/30';
      case 'WARN':
      case 'WARNING':
        return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30';
      case 'DEBUG':
        return 'text-slate-500 bg-slate-800/20 border-slate-700/20';
      case 'INFO':
      default:
        return 'text-sky-400 bg-sky-950/30 border-sky-500/30';
    }
  };

  const getLineTextStyle = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return 'text-rose-300 font-semibold';
      case 'WARN':
      case 'WARNING':
        return 'text-amber-300';
      case 'SUCCESS':
        return 'text-emerald-300';
      default:
        return 'text-slate-200';
    }
  };

  return (
    <div className="w-full bg-[#080C14] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Title & Stream Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono font-medium text-slate-300">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Execution Console</span>
          </div>

          {/* SSE Stream status indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-mono">
            {streamStatus === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Live SSE</span>
              </>
            )}
            {streamStatus === 'connecting' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-400">Connecting...</span>
              </>
            )}
            {streamStatus === 'reconnecting' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-400">Reconnecting...</span>
              </>
            )}
            {(streamStatus === 'closed' || streamStatus === 'idle') && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-slate-400">Archived</span>
              </>
            )}
          </div>

          {/* Secret Redaction Verified Shield */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secrets Redacted</span>
          </div>
        </div>

        {/* Right Controls: Search, Level, Pause, Auto-scroll, Copy, Download */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2 py-1 w-32 sm:w-44 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Log Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warnings</option>
            <option value="ERROR">Errors</option>
            <option value="SUCCESS">Success</option>
          </select>

          {/* Pause / Resume Button */}
          {isStreaming && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isPaused
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isPaused ? 'Resume auto-scroll' : 'Pause streaming'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Auto-scroll stick toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border transition-colors ${
              autoScroll
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownloadLogs}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Download logs (.txt)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Stage Filter Pill if set */}
      {filterStage && (
        <div className="bg-blue-950/40 border-b border-blue-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-blue-300">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-blue-400" />
            Filtered to stage: <strong className="font-mono text-white">{filterStage}</strong>
          </span>
          {onClearFilterStage && (
            <button
              onClick={onClearFilterStage}
              className="text-xs text-blue-400 hover:text-blue-200 underline font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Terminal Output Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-1 select-text bg-[#070A10]"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p className="text-xs">
              {logs.length === 0
                ? 'Waiting for pipeline execution logs...'
                : 'No logs match your filter criteria.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const level = log.level || 'INFO';
            const levelStyle = getLevelStyle(level);
            const lineStyle = getLineTextStyle(level);
            const stage = log.stage || 'GENERAL';
            const timestamp = log.timestamp || '';

            return (
              <div
                key={log.id || idx}
                className="flex items-start gap-2.5 py-0.5 hover:bg-slate-900/50 rounded px-1 group transition-colors"
              >
                {/* Line number */}
                <span className="text-[10px] text-slate-700 w-8 shrink-0 text-right select-none pt-0.5">
                  {idx + 1}
                </span>

                {/* Timestamp */}
                {timestamp && (
                  <span className="text-[10px] text-slate-500 shrink-0 select-none pt-0.5">
                    {timestamp}
                  </span>
                )}

                {/* Stage Tag */}
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0 select-none">
                  {stage}
                </span>

                {/* Level Badge */}
                <span
                  className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded border shrink-0 select-none ${levelStyle}`}
                >
                  {level}
                </span>

                {/* Message with server-side redaction preserved */}
                <span className={`flex-1 break-all whitespace-pre-wrap ${lineStyle}`}>
                  {log.message || log.text || ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={terminalBottomRef} />
      </div>

      {/* Terminal Footer Bar */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Total lines: {logs.length}</span>
          {filteredLogs.length !== logs.length && (
            <span className="text-blue-400">Showing: {filteredLogs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPaused && <span className="text-amber-400 font-sans font-medium">STREAM PAUSED</span>}
          <span>UTF-8 • Standard Out / Err</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminalLogViewer;
