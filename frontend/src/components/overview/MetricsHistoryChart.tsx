import React, { useState, useRef, useEffect } from 'react';
import { MetricHistoryPoint } from '../../types';
import { Activity, Cpu, Layers, HardDrive } from 'lucide-react';

interface MetricsHistoryChartProps {
  history?: MetricHistoryPoint[];
}

export const MetricsHistoryChart: React.FC<MetricsHistoryChartProps> = ({ history = [] }) => {
  const [metricKey, setMetricKey] = useState<'cpu' | 'ram' | 'ep'>('cpu');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth) {
      return Math.max(320, window.innerWidth - 320);
    }
    return 800;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };

    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setContainerWidth(Math.round(w));
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!history || history.length < 2) {
    return (
      <div className="bg-canvas-surface/70 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Activity className="w-4 h-4 text-cobalt-400" />
          <span>Mengumpulkan riwayat telemetri hosting...</span>
        </div>
      </div>
    );
  }

  // Extract values based on metric
  const points = history.map((item) => {
    if (metricKey === 'cpu') return { val: item.cpu, label: `${item.cpu.toFixed(1)}%`, time: item.time };
    if (metricKey === 'ram') return { val: item.ram_mb, label: `${item.ram_mb} MB`, time: item.time };
    return { val: item.ep, label: `${item.ep} EP`, time: item.time };
  });

  const values = points.map((p) => p.val);
  const minVal = 0;
  const maxVal = Math.max(...values, metricKey === 'cpu' ? 10 : (metricKey === 'ep' ? 5 : 500)) * 1.15;
  const avgVal = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const peakVal = Math.max(...values).toFixed(1);

  // SVG dimensions
  const width = Math.max(containerWidth, 320);
  const height = 176;
  const paddingX = 0;
  const paddingY = 20;

  const chartWidth = width;
  const chartHeight = height - paddingY * 2;

  // Generate SVG coordinates
  const coords = points.map((p, idx) => {
    const x = points.length > 1 ? (idx / (points.length - 1)) * chartWidth : chartWidth / 2;
    const y = paddingY + chartHeight - ((p.val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, ...p };
  });

  // Build SVG path
  const pathD = coords.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[idx - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpX2 = cpX1;
    return `${acc} C ${cpX1} ${prev.y}, ${cpX2} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = coords.length > 0
    ? `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
    : '';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (coords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / (rect.width || 1)) * width;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const diff = Math.abs(coords[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  const colorConfig = {
    cpu: {
      stroke: '#3b82f6',
      fillFrom: 'rgba(59, 130, 246, 0.35)',
      fillTo: 'rgba(59, 130, 246, 0.0)',
      accent: 'text-cobalt-400',
      name: 'vCPU Usage (4 Cores Quota)',
      unit: '%',
    },
    ram: {
      stroke: '#10b981',
      fillFrom: 'rgba(16, 185, 129, 0.35)',
      fillTo: 'rgba(16, 185, 129, 0.0)',
      accent: 'text-status-emerald',
      name: 'Physical RAM (4 GB Limit)',
      unit: 'MB',
    },
    ep: {
      stroke: '#a855f7',
      fillFrom: 'rgba(168, 85, 247, 0.35)',
      fillTo: 'rgba(168, 85, 247, 0.0)',
      accent: 'text-purple-400',
      name: 'Entry Processes (60 EP Quota)',
      unit: 'EP',
    },
  }[metricKey];

  return (
    <div className="bg-white/90 dark:bg-canvas-surface/80 border border-slate-200 dark:border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-sm dark:shadow-glow-card relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-12 right-0 w-64 h-32 bg-cobalt-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-cobalt-500 dark:text-cobalt-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-wide flex items-center gap-2">
              <span>Trend Telemetri</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cobalt-500/10 text-cobalt-600 dark:text-cobalt-300 border border-cobalt-500/20">
                Live Data
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              {colorConfig.name}
            </p>
          </div>
        </div>

        {/* Tab switcher & stat pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setMetricKey('cpu')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                metricKey === 'cpu'
                  ? 'bg-cobalt-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>CPU</span>
            </button>
            <button
              onClick={() => setMetricKey('ram')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                metricKey === 'ram'
                  ? 'bg-status-emerald text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>RAM</span>
            </button>
            <button
              onClick={() => setMetricKey('ep')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                metricKey === 'ep'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>EP</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono">
            <div>
              <span className="text-zinc-500 mr-1.5">Avg:</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{avgVal} {colorConfig.unit}</span>
            </div>
            <div className="w-px h-3 bg-slate-200 dark:bg-white/10" />
            <div>
              <span className="text-zinc-500 mr-1.5">Peak:</span>
              <span className={`${colorConfig.accent} font-semibold`}>{peakVal} {colorConfig.unit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Area Chart */}
      <div ref={containerRef} className="relative w-full select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-44 overflow-visible block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${metricKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorConfig.fillFrom} />
              <stop offset="100%" stopColor={colorConfig.fillTo} />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={0}
            y1={paddingY}
            x2={width}
            y2={paddingY}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
          <line
            x1={0}
            y1={paddingY + chartHeight / 2}
            x2={width}
            y2={paddingY + chartHeight / 2}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
          <line
            x1={0}
            y1={height - paddingY}
            x2={width}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.12)"
          />

          {/* Gradient area fill */}
          {areaD && <path d={areaD} fill={`url(#grad-${metricKey})`} />}

          {/* Curved trend line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={colorConfig.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#lineGlow)"
            />
          )}

          {/* Hover pointer & points */}
          {coords.map((pt, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === idx ? 6 : (coords.length > 50 ? 1.5 : 2.5)}
                fill={hoverIndex === idx ? '#ffffff' : colorConfig.stroke}
                stroke={colorConfig.stroke}
                strokeWidth={hoverIndex === idx ? 3 : 1}
                className="transition-all duration-150"
              />
            </g>
          ))}

          {/* Hover vertical crosshair */}
          {hoverIndex !== null && coords[hoverIndex] && (
            <line
              x1={coords[hoverIndex].x}
              y1={paddingY}
              x2={coords[hoverIndex].x}
              y2={height - paddingY}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="3 3"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Hover Tooltip Floating Card */}
        {hoverIndex !== null && coords[hoverIndex] && (
          <div
            className="absolute -top-1 pointer-events-none bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/20 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md text-xs font-mono z-30 transition-all duration-75"
            style={{
              left: `${(coords[hoverIndex].x / width) * 100}%`,
              transform:
                (coords[hoverIndex].x / width) * 100 < 10
                  ? 'translateX(0%)'
                  : (coords[hoverIndex].x / width) * 100 > 90
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{coords[hoverIndex].time} WIB</div>
            <div className={`font-bold text-sm ${colorConfig.accent}`}>
              {coords[hoverIndex].label}
            </div>
          </div>
        )}

        {/* Time X-axis indicators */}
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pt-2 border-t border-slate-200 dark:border-white/5">
          <span>{history[0]?.time || '00:00'} WIB</span>
          <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">Sampel aktual · {points.length} titik riwayat</span>
          <span>{history[history.length - 1]?.time || 'Now'} WIB (Live)</span>
        </div>
      </div>
    </div>
  );
};
