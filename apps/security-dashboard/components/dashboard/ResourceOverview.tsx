'use client';

import React from 'react';
import { RESOURCE_ALLOCATIONS, NAMESPACE_QUOTAS } from '../../lib/mock-data';

interface ResourceOverviewProps {
  quotas?: Array<{ resource: string; used: string; limit: string }> | null;
}

export default function ResourceOverview({ quotas }: ResourceOverviewProps) {
  // Use live quotas if provided, else fall back to static config
  const activeQuotas = quotas || NAMESPACE_QUOTAS;

  // Helper to parse percentages for progress bars
  const getPercentage = (used: string, limit: string) => {
    const u = parseFloat(used);
    const l = parseFloat(limit);
    if (isNaN(u) || isNaN(l)) {
      // Handle CPU millicores or memory units
      const parseVal = (str: string) => {
        const val = parseFloat(str);
        if (str.endsWith('m')) return val; // millicores
        if (str.endsWith('Mi')) return val; // megabytes
        if (str.endsWith('Gi')) return val * 1024;
        return val;
      };
      const parsedU = parseVal(used);
      const parsedL = parseVal(limit);
      if (parsedL === 0) return 0;
      return Math.round((parsedU / parsedL) * 100);
    }
    if (l === 0) return 0;
    return Math.round((u / l) * 100);
  };

  return (
    <div className="glass-card p-6 shadow-premium space-y-6 animate-slide-up hover:scale-[1.01]">
      
      {/* Section 1: Namespace Quotas */}
      <div>
        <div className="border-b border-border-color pb-3">
          <h3 className="text-sm font-semibold text-foreground">Namespace Quota ({activeQuotas.length} rules)</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Cumulative resource usage inside the exam namespace</p>
        </div>
        <div className="mt-4 space-y-3.5">
          {activeQuotas.map((quota) => {
            const pct = getPercentage(quota.used, quota.limit);
            return (
              <div key={quota.resource} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted font-medium">{quota.resource}</span>
                  <span className="text-text-muted">
                    <span className="font-semibold text-foreground font-mono">{quota.used}</span>
                    <span className="mx-1">/</span>
                    <span className="font-mono">{quota.limit}</span>
                    <span className="ml-2 text-[10px] text-text-muted">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-subtle-bg overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500" 
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Container Resource Configurations */}
      <div>
        <div className="border-b border-border-color pb-3">
          <h3 className="text-sm font-semibold text-foreground">Workload Limits & Requests</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Enforced resource controls per pod container</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-color text-text-muted font-medium">
                <th className="py-2.5">Workload</th>
                <th className="py-2.5">CPU (Req → Limit)</th>
                <th className="py-2.5">Memory (Req → Limit)</th>
                <th className="py-2.5">Ephemeral (Req → Limit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color text-foreground font-mono">
              {Object.entries(RESOURCE_ALLOCATIONS).map(([name, allocation]) => (
                <tr key={name} className="hover:bg-subtle-bg/10">
                  <td className="py-3 font-sans font-semibold text-foreground">{name}</td>
                  <td className="py-3">
                    {allocation.cpuRequest} <span className="text-text-muted/40">→</span> {allocation.cpuLimit}
                  </td>
                  <td className="py-3">
                    {allocation.memoryRequest} <span className="text-text-muted/40">→</span> {allocation.memoryLimit}
                  </td>
                  <td className="py-3">
                    {allocation.ephemeralRequest || 'N/A'} <span className="text-text-muted/40">→</span> {allocation.ephemeralLimit || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
