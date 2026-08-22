'use client';

import React from 'react';
import { POSTURE_SCORE, SCORE_BREAKDOWN } from '../../lib/mock-data';

interface SecurityScoreProps {
  score?: number;
  status?: string;
  breakdown?: Array<{ name: string; score: number }>;
}

export default function SecurityScore({ 
  score = POSTURE_SCORE, 
  status = 'DEGRADED', 
  breakdown = SCORE_BREAKDOWN 
}: SecurityScoreProps) {
  // Derive counts from verified breakdown data
  const passedControls = breakdown.filter(item => item.score === 100).length;
  const failedControls = breakdown.filter(item => item.score === 0).length;
  const infoControls = breakdown.filter(item => item.score > 0 && item.score < 100).length;

  const statusColor = status === 'SECURE' 
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
    : 'bg-amber-500/10 border-amber-500/20 text-amber-400';

  const gaugeColor = status === 'SECURE' ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-200">Security Posture</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Project-defined verification scoring matrix</p>
        </div>
        <span className={`rounded px-2.5 py-0.5 text-xs font-bold border ${statusColor}`}>
          {status}
        </span>
      </div>

      <div className="mt-6 flex flex-col md:flex-row items-center gap-6 justify-between">
        {/* Gauge Chart UI */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Ring */}
              <circle
                className="text-zinc-900"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              {/* Value Circle */}
              <circle
                className={`${gaugeColor} transition-all duration-1000 ease-out`}
                strokeWidth="8"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * score) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-zinc-100">{score}</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">of 100</span>
            </div>
          </div>

          {/* Counts Overview */}
          <div className="flex gap-2 text-[10px] uppercase font-mono">
            <span className="text-emerald-400">{passedControls} Pass</span>
            <span className="text-zinc-500">•</span>
            <span className="text-amber-400">{infoControls} Info</span>
            <span className="text-zinc-500">•</span>
            <span className="text-rose-500">{failedControls} Fail</span>
          </div>
        </div>

        {/* Score Breakdown List */}
        <div className="flex-1 space-y-3.5 w-full">
          {breakdown.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">{item.name}</span>
                <span className={`font-semibold ${item.score === 100 ? 'text-emerald-400' : item.score >= 90 ? 'text-zinc-300' : 'text-amber-400'}`}>
                  {item.score}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    item.score === 100 
                      ? 'bg-emerald-500' 
                      : item.score >= 90 
                        ? 'bg-zinc-400' 
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md bg-zinc-900/50 border border-zinc-800/40 p-3">
        <p className="text-[10px] leading-relaxed text-zinc-500">
          <span className="font-semibold text-zinc-400">Notice:</span> This security posture score represents a custom project verification benchmark. It does not imply compliance with external industry-standard audits, and accounts for the lack of host-level vulnerability scanners (Trivy/Grype) which limits image vulnerability validation.
        </p>
      </div>
    </div>
  );
}
