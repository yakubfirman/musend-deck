import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  limit?: string;
  percent?: number;
  icon: LucideIcon;
  status?: 'emerald' | 'amber' | 'rose' | 'default';
  detailList?: Array<{ label: string; value: string }>;
  showRing?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  limit,
  percent,
  icon: Icon,
  status = 'default',
  detailList,
  showRing = false,
}) => {
  // Determine color based on percent if not strictly provided
  let activeStatus = status;
  if (percent !== undefined && status === 'default') {
    if (percent >= 90) activeStatus = 'rose';
    else if (percent >= 70) activeStatus = 'amber';
    else activeStatus = 'emerald';
  }

  const statusConfig = {
    emerald: {
      badge: 'Normal',
      badgeClass: 'text-status-emerald bg-status-emerald/10 border-status-emerald/30',
      iconBox: 'text-status-emerald bg-status-emerald/10 border-status-emerald/20',
      progress: 'from-emerald-500 to-teal-400',
      glow: 'hover:shadow-glow-emerald',
      stroke: '#10b981',
    },
    amber: {
      badge: 'Waspada',
      badgeClass: 'text-status-amber bg-status-amber/10 border-status-amber/30',
      iconBox: 'text-status-amber bg-status-amber/10 border-status-amber/20',
      progress: 'from-amber-500 to-yellow-400',
      glow: 'hover:shadow-glow-amber',
      stroke: '#f59e0b',
    },
    rose: {
      badge: 'Kritis',
      badgeClass: 'text-status-rose bg-status-rose/10 border-status-rose/30',
      iconBox: 'text-status-rose bg-status-rose/10 border-status-rose/20',
      progress: 'from-rose-500 to-red-400',
      glow: 'hover:shadow-glow-rose',
      stroke: '#f43f5e',
    },
    default: {
      badge: 'Optimal',
      badgeClass: 'text-cobalt-400 bg-cobalt-500/10 border-cobalt-500/30',
      iconBox: 'text-cobalt-400 bg-cobalt-500/10 border-cobalt-500/20',
      progress: 'from-cobalt-600 to-indigo-500',
      glow: 'hover:shadow-glow-cobalt',
      stroke: '#3b82f6',
    },
  };

  const currentTheme = statusConfig[activeStatus];
  const safePercent = percent !== undefined ? Math.min(100, Math.max(0, percent)) : 0;

  // SVG Circular Gauge calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className={`glass-card rounded-2xl p-5 sm:p-5 flex flex-col justify-between transition-all duration-300 ${currentTheme.glow} group`}>
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              {label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {percent !== undefined && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentTheme.badgeClass}`}>
                {currentTheme.badge}
              </span>
            )}
            <div className={`p-2 rounded-xl border ${currentTheme.iconBox} transition-transform group-hover:scale-110 duration-200`}>
              <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Main Metric & Mini Radial Gauge */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
                {value}
              </span>
              {limit && (
                <span className="text-xs text-zinc-400 tabular-nums font-mono">
                  / {limit}
                </span>
              )}
            </div>

            {subValue && (
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">{subValue}</p>
            )}
          </div>

          {percent !== undefined && (
            <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 54 54">
                <circle
                  cx="27"
                  cy="27"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="27"
                  cy="27"
                  r={radius}
                  stroke={currentTheme.stroke}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute text-[11px] font-bold font-mono text-zinc-200 tabular-nums">
                {safePercent}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar (Dual Indicator for instant visibility) */}
      {percent !== undefined && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="w-full bg-black/40 rounded-full h-2 p-0.5 border border-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${currentTheme.progress} transition-all duration-500`}
              style={{ width: `${safePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Detailed Spec List */}
      {detailList && detailList.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-white/5 space-y-2 text-xs">
          {detailList.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-zinc-400 font-mono text-[11px]">
              <span className="text-zinc-500">{item.label}</span>
              <span className="text-zinc-200 font-medium tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
