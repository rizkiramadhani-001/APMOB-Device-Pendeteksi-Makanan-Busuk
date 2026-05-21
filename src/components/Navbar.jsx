import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ isDarkMode, setIsDarkMode, connectToNewDevice }) {
  const { signOut } = useAuth();

  return (
    <nav className="h-16 border-b border-slate-200/40 dark:border-white/10 bg-white/75 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-40 shrink-0 select-none flex items-center justify-between px-6 transition-all duration-300">
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/15 animate-pulse-slow">
          <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="font-display font-black text-sm tracking-tight text-slate-800 dark:text-white">
          AquaAir<span className="text-gradient font-light">Dash</span>
        </span>
      </div>

      {/* Header controls */}
      <div className="flex items-center gap-2">
        {/* Connection Trigger */}
        <button
          onClick={connectToNewDevice}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-full text-xs font-black shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-[0.96] hover:scale-[1.02] transition-all duration-200 flex items-center gap-1.5 shrink-0"
          title="Pair sensor"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>Pair</span>
        </button>

        {/* Theme switch */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full bg-slate-50 dark:bg-white/10 border border-slate-200/40 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/25 active:scale-90 hover:rotate-12 transition-all duration-300"
          aria-label="Theme toggle"
        >
          {isDarkMode ? (
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707m-9.021-9.021l-.707-.707m12.728 0l-.707.707m-9.021 11.314l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 active:scale-90 transition-all duration-200"
          title="Sign out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
