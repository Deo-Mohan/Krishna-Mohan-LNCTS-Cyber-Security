'use client';

import React from 'react';

export default function NetworkOverview() {
  return (
    <div className="glass-card p-6 shadow-premium transition-all duration-300 animate-slide-up">
      <div className="border-b border-border-color pb-4">
        <h2 className="text-base font-semibold text-foreground">Network Policy / Allowed Paths</h2>
        <p className="text-[11px] text-text-muted mt-0.5">Zero-trust microsegmentation and ingress/egress boundaries</p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-6 items-stretch">
        {/* Allowed Traffic Flow Column */}
        <div className="flex-1 flex flex-col items-center bg-subtle-bg/20 border border-border-color rounded-lg p-5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted mb-4">Allowed Policy Paths</span>

          {/* DNS Node */}
          <div className="flex flex-col items-center">
            <div className="rounded bg-subtle-bg border border-border-color px-4 py-2 text-center w-36 shadow-sm">
              <span className="text-xs font-semibold text-foreground block font-mono">DNS</span>
              <span className="text-[9px] text-text-muted font-mono">kube-dns:53</span>
            </div>
            {/* Arrow down */}
            <div className="flex flex-col items-center my-1.5">
              <span className="text-emerald-500 text-xs font-mono">│</span>
              <span className="text-emerald-500 text-[10px] font-mono">▼</span>
            </div>
          </div>

          {/* exam-app Node */}
          <div className="flex flex-col items-center w-full">
            <div className="rounded border border-indigo-500/20 bg-indigo-500/5 px-5 py-3 text-center w-44 shadow shadow-indigo-500/5">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 block font-mono">exam-app</span>
              <span className="text-[9px] text-indigo-500 dark:text-indigo-400/80 font-mono mt-0.5 block">Port :8083</span>
            </div>
            {/* Arrow down */}
            <div className="flex flex-col items-center my-2">
              <span className="text-emerald-500 text-xs font-mono">│</span>
              <span className="text-emerald-600 dark:text-emerald-500 text-[9px] font-mono bg-subtle-bg px-2 py-0.5 border border-border-color rounded">TCP 1521</span>
              <span className="text-emerald-500 text-xs font-mono">│</span>
              <span className="text-emerald-500 text-[10px] font-mono">▼</span>
            </div>
          </div>

          {/* exam-db Node */}
          <div className="flex flex-col items-center">
            <div className="rounded border border-teal-500/20 bg-teal-500/5 px-5 py-3 text-center w-44 shadow shadow-teal-500/5">
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-300 block font-mono">exam-db</span>
              <span className="text-[9px] text-teal-500 dark:text-teal-400/80 font-mono mt-0.5 block">PostgreSQL</span>
            </div>
          </div>
        </div>

        {/* Blocked/Denied Boundary Column */}
        <div className="flex-1 flex flex-col bg-rose-500/5 dark:bg-rose-950/5 border border-rose-200 dark:border-rose-950/20 rounded-lg p-5 justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 font-semibold block mb-4">Blocked (Fail-Closed)</span>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-subtle-bg/25 border border-border-color rounded p-2.5">
                <span className="text-rose-500 dark:text-rose-500 font-bold shrink-0 text-sm">✕</span>
                <div>
                  <span className="text-[11px] font-semibold text-foreground block">Unauthorized Ingress</span>
                  <span className="text-[9.5px] text-text-muted block leading-tight">All external ingress is blocked except through defined API controllers.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-subtle-bg/25 border border-border-color rounded p-2.5">
                <span className="text-rose-500 dark:text-rose-500 font-bold shrink-0 text-sm">✕</span>
                <div>
                  <span className="text-[11px] font-semibold text-foreground block">Cross-Namespace Traffic</span>
                  <span className="text-[9.5px] text-text-muted block leading-tight">Lateral traffic from student, faculty, and research namespaces is drop-blocked.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-subtle-bg/25 border border-border-color rounded p-2.5">
                <span className="text-rose-500 dark:text-rose-500 font-bold shrink-0 text-sm">✕</span>
                <div>
                  <span className="text-[11px] font-semibold text-foreground block">Unauthorized Egress</span>
                  <span className="text-[9.5px] text-text-muted block leading-tight">All egress connections to external IP ranges or unmapped services are blocked.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 p-3 text-[10px] text-rose-600 dark:text-rose-400 font-mono leading-relaxed">
            <span className="font-bold uppercase block mb-0.5">Default Deny Mode</span>
            Active NetworkPolicies enforce default isolation; only explicitly allowed flows resolve.
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-subtle-bg/50 border border-border-color p-3">
        <p className="text-[10px] text-text-muted leading-relaxed">
          <span className="font-semibold text-foreground">Notice:</span> This is a static policy boundaries visualization based on Calico/K8s NetworkPolicy rules. It indicates permitted network routes rather than live packet traffic metrics.
        </p>
      </div>
    </div>
  );
}
