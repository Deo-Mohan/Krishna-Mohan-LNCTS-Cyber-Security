'use client';

import React from 'react';
import { VERIFICATION_TESTS } from '../../lib/mock-data';

interface VerificationPanelProps {
  tests?: Array<{ name: string; status: string }>;
}

export default function VerificationPanel({ tests = VERIFICATION_TESTS }: VerificationPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
      <div className="border-b border-zinc-900 pb-4">
        <h2 className="text-base font-semibold text-zinc-200">Runtime Verification Tests</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Results of verified cluster security configuration validation tests</p>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {tests.map((test) => {
          const isPass = test.status === 'PASS';
          return (
            <div 
              key={test.name}
              className="flex items-center justify-between rounded-lg bg-zinc-900/40 border border-zinc-800/40 p-3 hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  isPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {isPass ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-zinc-300">{test.name}</span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono tracking-wider ${
                isPass ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              }`}>
                {test.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
