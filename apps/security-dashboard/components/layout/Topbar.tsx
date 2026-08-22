'use client';

import React, { useState, useEffect } from 'react';
import { HARDENED_NAMESPACE } from '../../lib/mock-data';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTimeString(new Date().toLocaleTimeString());
    };
    
    // Defer initial execution to avoid synchronous state update in effect body
    const timeoutId = setTimeout(updateTime, 0);
    const interval = setInterval(updateTime, 5000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button 
          onClick={onMenuClick}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 lg:hidden"
          aria-label="Toggle Sidebar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* SECUREHAVEN EXAM and ● LIVE */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wider text-zinc-200 uppercase">SECUREHAVEN</span>
          <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-900/30 font-mono uppercase">
            {HARDENED_NAMESPACE}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Compact refresh indicator & Update timestamp */}
        <div className="flex items-center gap-3 text-right text-[11px] text-zinc-500 hidden md:flex">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono text-zinc-400">Auto-refresh (5s)</span>
          </div>
          <div className="border-l border-zinc-850 h-3" />
          <div>
            <span>Last Updated: </span>
            <span className="font-mono text-zinc-300">{timeString || 'Syncing...'}</span>
          </div>
        </div>

        {/* User profile avatar */}
        <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
          <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-between overflow-hidden">
            <svg 
              className="h-full w-full text-zinc-500 mt-1" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
