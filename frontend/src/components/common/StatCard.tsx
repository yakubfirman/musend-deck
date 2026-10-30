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
}) => {
  // Determine color based on percent if not strictly provided
  let activeStatus = status;
  if (percent !== undefined && status === 'default') {
    if (percent >= 90) activeStatus = 'rose';
    else if (percent >= 70) activeStatus = 'amber';
    else activeStatus = 'emerald';
  }

  const statusColorMap = {
    emerald: 'text-status-emerald border-status-emerald/30 bg-status-emerald/10',
    amber: 'text-status-amber border-status-amber/30 bg-status-amber/10',
    rose: 'text-status-rose border-status-rose/30 bg-status-rose/10',
    default: 'text-zinc-400 border-white/10 bg-white/5',
  };

  const progressBgMap = {
    emerald: 'bg-status-emerald',
    amber: 'bg-status-amber',
    rose: 'bg-status-rose',
    default: 'bg-cobalt-600',
  };

  return (
    <div className="bg-canvas-surface border border-hairline rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-hairline-hover transition-colors">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
          <div className={`p-1.5 rounded border ${statusColorMap[activeStatus]}`}>
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
            {value}
          </span>
          {limit && (
            <span className="text-xs sm:text-sm text-zinc-500 tabular-nums font-mono">
              / {limit}
            </span>
          )}
        </div>

        {subValue && (
          <p className="text-xs text-zinc-400 mb-3 font-mono">{subValue}</p>
        )}
      </div>

      {percent !== undefined && (
        <div className="mt-3 pt-3 border-t border-hairline">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-1.5 font-mono">
            <span>Kapasitas</span>
            <span className="font-semibold text-zinc-200 tabular-nums">{percent}%</span>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressBgMap[activeStatus]}`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        </div>
      )}

      {detailList && detailList.length > 0 && (
        <div className="mt-3 pt-3 border-t border-hairline space-y-1.5 text-xs">
          {detailList.map((item, idx) => (
            <div key={idx} className="flex justify-between text-zinc-400 font-mono">
              <span>{item.label}</span>
              <span className="text-zinc-200 tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
