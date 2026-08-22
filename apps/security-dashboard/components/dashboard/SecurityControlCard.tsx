'use client';

import React from 'react';
import { SecurityControl } from '../../types/security';

interface SecurityControlCardProps {
  control: SecurityControl;
  onViewDetails: (control: SecurityControl) => void;
}

export default function SecurityControlCard({ control, onViewDetails }: SecurityControlCardProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'INFO':
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'FAIL':
      default:
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-400';
      case 'INFO':
      case 'WARNING':
        return 'bg-amber-400';
      case 'FAIL':
      default:
        return 'bg-rose-400';
    }
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'text-emerald-400';
      case 'INFO':
      case 'WARNING':
        return 'text-amber-400';
      case 'FAIL':
      default:
        return 'text-rose-400';
    }
  };

  // Return icons based on control category
  const getIcon = (id: string, colorClass: string) => {
    switch (id) {
      case 'container-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'filesystem-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'network-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        );
      case 'rbac-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'secrets-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-5-2a5 5 0 11-5 5M12 7V4m0 16v-3m0-6V9a3 3 0 00-3-3H9" />
          </svg>
        );
      case 'resources-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'image-sec':
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const status = control.status;
  const colorClass = getIconColor(status);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm transition-all hover:border-zinc-700/60">
      <div>
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2.5 ${status === 'PASS' ? 'bg-emerald-500/10' : status === 'INFO' || status === 'WARNING' ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
            {getIcon(control.id, colorClass)}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${getStatusStyle(status)}`}>
            <span className={`h-1 w-1 rounded-full ${getStatusDot(status)}`} />
            {status}
          </span>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-200">{control.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{control.category}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-3">
            {control.description}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-900 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Metric / Identity</span>
          <span className="text-xs font-mono text-zinc-300 font-medium truncate max-w-[140px] mt-0.5">
            {control.metric || 'Active'}
          </span>
        </div>
        <button
          onClick={() => onViewDetails(control)}
          className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 group"
        >
          View Details
          <svg 
            className="h-3 w-3 transform group-hover:translate-x-0.5 transition-transform" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
