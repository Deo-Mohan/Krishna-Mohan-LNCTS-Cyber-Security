import React, { useState, useEffect } from 'react';
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
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score;
    if (end === 0) {
      return;
    }
    
    const duration = 1200; // 1.2s total animation
    const increment = Math.ceil(end / (duration / 16)); // ~60fps step
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayScore(end);
        clearInterval(timer);
      } else {
        setDisplayScore(start);
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [score]);

  // Derive counts from verified breakdown data
  const passedControls = breakdown.filter(item => item.score === 100).length;
  const failedControls = breakdown.filter(item => item.score === 0).length;
  const infoControls = breakdown.filter(item => item.score > 0 && item.score < 100).length;

  const statusColor = status === 'SECURE' 
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';

  const gaugeColor = status === 'SECURE' ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="flex flex-col glass-card p-6 shadow-premium transition-all duration-300 animate-slide-up">
      <div className="flex items-center justify-between border-b border-border-color pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Security Posture</h2>
          <p className="text-[11px] text-text-muted mt-0.5">Project-defined verification scoring matrix</p>
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
                className="text-subtle-bg"
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
                strokeDashoffset={251.2 - (251.2 * displayScore) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-foreground transition-all duration-150">{displayScore}</span>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">of 100</span>
            </div>
          </div>

          {/* Counts Overview */}
          <div className="flex gap-2 text-[10px] uppercase font-mono">
            <span className="text-emerald-600 dark:text-emerald-400">{passedControls} Pass</span>
            <span className="text-text-muted/40">•</span>
            <span className="text-amber-600 dark:text-amber-400">{infoControls} Info</span>
            <span className="text-text-muted/40">•</span>
            <span className="text-rose-600 dark:text-rose-400">{failedControls} Fail</span>
          </div>
        </div>

        {/* Score Breakdown List */}
        <div className="flex-1 space-y-3.5 w-full">
          {breakdown.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted font-medium">{item.name}</span>
                <span className={`font-semibold ${item.score === 100 ? 'text-emerald-600 dark:text-emerald-400' : item.score >= 90 ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                  {item.score}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-subtle-bg overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    item.score === 100 
                      ? 'bg-emerald-500' 
                      : item.score >= 90 
                        ? 'bg-slate-400 dark:bg-zinc-400' 
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md bg-subtle-bg/50 border border-border-color p-3">
        <p className="text-[10px] leading-relaxed text-text-muted">
          <span className="font-semibold text-foreground">Notice:</span> This security posture score represents a custom project verification benchmark. It does not imply compliance with external industry-standard audits, and accounts for the lack of host-level vulnerability scanners (Trivy/Grype) which limits image vulnerability validation.
        </p>
      </div>
    </div>
  );
}
