'use client';

import React, { useState, useEffect } from 'react';
import { HARDENED_NAMESPACE } from '../../lib/mock-data';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [timeString, setTimeString] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setTimeString(new Date().toLocaleTimeString());
    };
    
    // Defer initial execution to avoid synchronous state update in effect body
    const timeoutId = setTimeout(updateTime, 0);
    const interval = setInterval(updateTime, 5000);
    
    // Read the actual theme class already set by the blocking head script
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border-color bg-sidebar-bg backdrop-blur-md px-6 transition-all duration-300 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button 
          onClick={onMenuClick}
          className="rounded p-1.5 text-text-muted hover:bg-subtle-bg hover:text-foreground lg:hidden"
          aria-label="Toggle Sidebar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* SECUREHAVEN EXAM and ● LIVE */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wider text-foreground uppercase">SECUREHAVEN</span>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 font-mono uppercase">
            {HARDENED_NAMESPACE}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Compact refresh indicator & Update timestamp */}
        <div className="flex items-center gap-3 text-right text-[11px] text-text-muted hidden md:flex">
          <div className="flex items-center gap-1.5 bg-subtle-bg border border-border-color px-2 py-0.5 rounded text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono text-text-muted">Auto-refresh (5s)</span>
          </div>
          <div className="border-l border-border-color h-3" />
          <div className="text-text-muted">
            <span>Last Updated: </span>
            <span className="font-mono text-foreground">{timeString || 'Syncing...'}</span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-muted hover:bg-subtle-bg hover:text-foreground transition-colors border border-border-color bg-subtle-bg/30 active:scale-95 duration-150"
          aria-label="Toggle Theme"
        >
          {!mounted ? (
            <div className="h-4.5 w-4.5" />
          ) : theme === 'dark' ? (
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-3.636l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User profile avatar */}
        <div className="flex items-center gap-2 border-l border-border-color pl-4">
          <div className="h-8 w-8 rounded-full bg-subtle-bg border border-border-color flex items-center justify-between overflow-hidden">
            <svg 
              className="h-full w-full text-text-muted mt-1" 
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
