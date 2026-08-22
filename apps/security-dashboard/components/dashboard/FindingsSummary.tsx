'use client';

import React from 'react';
import { FINDINGS } from '../../lib/mock-data';

export default function FindingsSummary() {
  const severityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: FINDINGS.length
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
      <div className="border-b border-zinc-900 pb-4">
        <h2 className="text-base font-semibold text-zinc-200">Security Findings</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Summary of non-compliance issues and audit findings</p>
      </div>

      {/* Severity Badges Grid */}
      <div className="mt-5 grid grid-cols-5 gap-2 text-center">
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
          <span className="text-[10px] font-semibold text-zinc-500 block uppercase">Critical</span>
          <span className="mt-1 font-mono text-lg font-bold text-zinc-400">{severityCounts.CRITICAL}</span>
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
          <span className="text-[10px] font-semibold text-zinc-500 block uppercase">High</span>
          <span className="mt-1 font-mono text-lg font-bold text-zinc-400">{severityCounts.HIGH}</span>
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
          <span className="text-[10px] font-semibold text-zinc-500 block uppercase">Medium</span>
          <span className="mt-1 font-mono text-lg font-bold text-zinc-400">{severityCounts.MEDIUM}</span>
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
          <span className="text-[10px] font-semibold text-zinc-500 block uppercase">Low</span>
          <span className="mt-1 font-mono text-lg font-bold text-zinc-400">{severityCounts.LOW}</span>
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 bg-blue-500/5 border-blue-500/10">
          <span className="text-[10px] font-semibold text-blue-400 block uppercase">Info</span>
          <span className="mt-1 font-mono text-lg font-bold text-blue-400">{severityCounts.INFO}</span>
        </div>
      </div>

      {/* Findings List */}
      <div className="mt-6 space-y-4">
        {FINDINGS.map((finding) => (
          <div 
            key={finding.id} 
            className="flex gap-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 p-4"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                    {finding.severity === 'INFO' ? 'INFORMATIONAL' : finding.severity}
                  </span>
                  <h4 className="text-xs font-semibold text-zinc-200">{finding.title}</h4>
                </div>
                <span className="text-[9px] font-medium text-zinc-500 uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono shrink-0">
                  {finding.category}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">{finding.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md bg-zinc-900/50 border border-zinc-800/40 p-3">
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          <span className="font-semibold text-zinc-400">Disclaimer:</span> Informational findings denote limitations in current testing capabilities or project boundaries, and are not classified as vulnerabilities in the deployed application environment.
        </p>
      </div>
    </div>
  );
}
