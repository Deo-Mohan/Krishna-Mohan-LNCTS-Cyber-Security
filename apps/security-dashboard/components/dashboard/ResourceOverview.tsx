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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm space-y-6">
      
      {/* Section 1: Namespace Quotas */}
      <div>
        <div className="border-b border-zinc-900 pb-3">
          <h3 className="text-sm font-semibold text-zinc-200">Namespace Quota ({activeQuotas.length} rules)</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Cumulative resource usage inside the exam namespace</p>
        </div>
        <div className="mt-4 space-y-3.5">
          {activeQuotas.map((quota) => {
            const pct = getPercentage(quota.used, quota.limit);
            return (
              <div key={quota.resource} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-medium">{quota.resource}</span>
                  <span className="text-zinc-500">
                    <span className="font-semibold text-zinc-300 font-mono">{quota.used}</span>
                    <span className="mx-1">/</span>
                    <span className="font-mono">{quota.limit}</span>
                    <span className="ml-2 text-[10px] text-zinc-500">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
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
        <div className="border-b border-zinc-900 pb-3">
          <h3 className="text-sm font-semibold text-zinc-200">Workload Limits & Requests</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Enforced resource controls per pod container</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 font-medium">
                <th className="py-2.5">Workload</th>
                <th className="py-2.5">CPU (Req → Limit)</th>
                <th className="py-2.5">Memory (Req → Limit)</th>
                <th className="py-2.5">Ephemeral (Req → Limit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300 font-mono">
              {Object.entries(RESOURCE_ALLOCATIONS).map(([name, allocation]) => (
                <tr key={name} className="hover:bg-zinc-900/10">
                  <td className="py-3 font-sans font-semibold text-zinc-200">{name}</td>
                  <td className="py-3">
                    {allocation.cpuRequest} <span className="text-zinc-600">→</span> {allocation.cpuLimit}
                  </td>
                  <td className="py-3">
                    {allocation.memoryRequest} <span className="text-zinc-600">→</span> {allocation.memoryLimit}
                  </td>
                  <td className="py-3">
                    {allocation.ephemeralRequest || 'N/A'} <span className="text-zinc-600">→</span> {allocation.ephemeralLimit || 'N/A'}
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
