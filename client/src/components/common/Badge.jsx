import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-blue-950/70 text-blue-300 border-blue-500/30',
    violet: 'bg-purple-950/70 text-purple-300 border-purple-500/30',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-950/70 text-rose-300 border-rose-500/30',
    comingSoon: 'bg-slate-800/80 text-slate-400 border-slate-700 border-dashed',
  };

  const sizes = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
