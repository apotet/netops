import React from 'react';

const Layers = () => (
  <svg viewBox="0 0 36 36" className="w-full h-full">
    <rect x="8" y="7" width="20" height="4" rx="2" fill="#22d3ee" />
    <rect x="6" y="15" width="24" height="4" rx="2" fill="#22d3ee" />
    <rect x="8" y="23" width="20" height="4" rx="2" fill="#22d3ee" />
    <circle r="1.6" fill="#e0fbff">
      <animate attributeName="cx" values="14;20;16;22;18" dur="2.4s" repeatCount="indefinite" />
      <animate attributeName="cy" values="9;9;17;17;25" dur="2.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="1;0.4;1;0.4;1" dur="2.4s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const Route = () => (
  <svg viewBox="0 0 36 36" className="w-full h-full">
    <rect x="2" y="2" width="32" height="32" rx="8" fill="none" stroke="#22d3ee" strokeWidth="2" />
    <circle cx="10" cy="10" r="2.2" fill="#22d3ee">
      <animate attributeName="opacity" values="1;0.45;1" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="18" cy="16" r="2.2" fill="#22d3ee">
      <animate attributeName="opacity" values="0.45;1;0.45" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="26" cy="24" r="2.2" fill="#22d3ee">
      <animate attributeName="opacity" values="1;0.45;1" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
    </circle>
    <path d="M12 11.5 L16 14.5 M20 17.5 L24 22" stroke="#22d3ee" strokeWidth="1.6" />
    <path d="M14 26 h8" stroke="#22d3ee" strokeWidth="1.6" />
    <path d="M20 24 l2 2 -2 2" fill="none" stroke="#22d3ee" strokeWidth="1.6" />
    <circle r="1.4" fill="#e0fbff">
      <animate attributeName="cx" values="10;18;26;10" dur="2.2s" repeatCount="indefinite" />
      <animate attributeName="cy" values="10;16;24;10" dur="2.2s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const Gauge = () => (
  <svg viewBox="0 0 36 36" className="w-full h-full">
    <path d="M8 22 A10 10 0 1 1 28 22" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="0">
      <animate attributeName="stroke-dashoffset" values="40;0;40" dur="2.6s" repeatCount="indefinite" />
    </path>
    <g>
      <animateTransform attributeName="transform" type="scale" values="1;1.12;1" dur="1.4s" repeatCount="indefinite" additive="sum" />
      <path d="M15 21 c0-4 1.4-6 2-8 0.6 2 2 4 2 8 a2 2 0 1 1 -4 0z" fill="#22d3ee" />
    </g>
    <rect x="21" y="16" width="6" height="7" rx="1" fill="#22d3ee" />
    <path d="M22.5 18.5 h3 M24 17 v3" stroke="#07111f" strokeWidth="0.8" />
  </svg>
);

const Hex = () => (
  <svg viewBox="0 0 36 36" className="w-full h-full">
    <path d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" fill="none" stroke="#22d3ee" strokeWidth="1.8">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
    </path>
    <path d="M7 18 h6" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="2 2">
      <animate attributeName="stroke-dashoffset" values="8;0" dur="0.6s" repeatCount="indefinite" />
    </path>
    <rect x="13" y="15" width="10" height="6" rx="1.5" fill="#22d3ee">
      <animate attributeName="x" values="11;15;11" dur="1.6s" repeatCount="indefinite" />
    </rect>
    <path d="M24 18 h4" stroke="#22d3ee" strokeWidth="1.4" />
  </svg>
);

const marks = [Route, Hex, Gauge, Layers];

export function NetOpsLogo() {
  const day = new Date().getDay();
  const Mark = marks[day % marks.length];
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#07111f] border border-cyan-400/40 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
        <Mark />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-sm sm:text-base tracking-tight truncate">
          <span className="text-slate-900 dark:text-white">Net</span>
          <span className="text-cyan-500">Ops</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">сеть под контролем</p>
      </div>
    </div>
  );
}
