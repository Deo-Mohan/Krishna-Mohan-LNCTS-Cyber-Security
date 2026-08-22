'use client';

import React from 'react';
import { Workload } from '../../types/security';

interface WorkloadCardProps {
  workload: Workload;
}

export default function WorkloadCard({ workload }: WorkloadCardProps) {
  const isRunning = workload.status === 'Running';
  const sc = workload.securityContext;
  const res = workload.resources;

  const securityChecks = [
    {
      name: 'Non-Root UID',
      status: sc ? (sc.runAsNonRoot ? 'PASS' : 'FAIL') : 'N/A'
    },
    {
      name: 'Read-Only FS',
      status: sc ? (sc.readOnlyRootFilesystem ? 'PASS' : 'FAIL') : 'N/A'
    },
    {
      name: 'Cap Drop (ALL)',
      status: sc ? (sc.capabilitiesDrop?.includes('ALL') ? 'PASS' : 'FAIL') : 'N/A'
    },
    {
      name: 'NetworkPolicy',
      status: workload.hasNetworkPolicy === undefined ? 'N/A' : (workload.hasNetworkPolicy ? 'PASS' : 'FAIL')
    },
    {
      name: 'Resource Limits',
      status: res ? (res.limits?.cpu !== 'N/A' && res.limits?.memory !== 'N/A' ? 'PASS' : 'FAIL') : 'N/A'
    }
  ];

  const getCheckStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10';
      case 'FAIL':
        return 'text-rose-400 bg-rose-500/5 border-rose-500/10';
      case 'N/A':
      default:
        return 'text-zinc-500 bg-zinc-900/40 border-zinc-800/40';
    }
  };

  const getCheckStatusSymbol = (status: string) => {
    switch (status) {
      case 'PASS':
        return '✓';
      case 'FAIL':
        return '✕';
      case 'N/A':
      default:
        return '—';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full ${workload.type === 'Application' ? 'bg-indigo-500' : 'bg-teal-500'}`} />
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">{workload.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{workload.type}</span>
              <span className="text-[10px] text-zinc-650 font-mono">•</span>
              <span className="text-[10px] text-zinc-500 font-mono">ns/{workload.namespace || 'exam'}</span>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
          isRunning 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {workload.status}
        </span>
      </div>

      {/* Basic Metrics Grid */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs border-b border-zinc-900/60 pb-3.5">
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Ready Replicas</span>
          <span className="font-mono text-zinc-200 font-semibold">{workload.ready}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Restart Count</span>
          <span className="font-mono text-zinc-200 font-semibold">{workload.restarts}</span>
        </div>
        <div className="col-span-2">
          <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Container Image</span>
          <span className="font-mono text-zinc-400 text-[10.5px] truncate block mt-0.5" title={workload.image}>
            {workload.image || 'N/A'}
          </span>
        </div>
      </div>

      {/* CPU & Memory Requests/Limits Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs border-b border-zinc-900/60 pb-3.5">
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">CPU Request / Limit</span>
          <div className="font-mono text-[11px] text-zinc-300 font-medium space-x-1">
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">{res?.requests?.cpu || 'N/A'}</span>
            <span className="text-zinc-650">/</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300">{res?.limits?.cpu || 'N/A'}</span>
          </div>
        </div>
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Memory Req / Limit</span>
          <div className="font-mono text-[11px] text-zinc-300 font-medium space-x-1">
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">{res?.requests?.memory || 'N/A'}</span>
            <span className="text-zinc-650">/</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300">{res?.limits?.memory || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Security Context & Network Controls Checklist */}
      <div className="space-y-2">
        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-semibold font-mono">Security Context Audits</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {securityChecks.map((check) => (
            <div 
              key={check.name} 
              className={`flex items-center justify-between border rounded px-2 py-1 text-[10.5px] font-medium font-mono ${getCheckStatusBadge(check.status)}`}
            >
              <span className="truncate max-w-[120px]">{check.name}</span>
              <span className="font-bold">{getCheckStatusSymbol(check.status)} {check.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
