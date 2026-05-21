import React from 'react';

export default function EmptyState({ connectToNewDevice }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-5 rounded-[26px] bg-white/70 dark:bg-black/40 border border-slate-200/50 dark:border-white/10 shadow-sm backdrop-blur-xl relative overflow-hidden group transition-all duration-300">
      
      {/* Soft Background Grid Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Pulsing Radar Beacon */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Radar Rings */}
        <div className="absolute w-22 h-22 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 animate-ping-slow"></div>
        <div className="absolute w-16 h-16 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 animate-ping" style={{ animationDelay: '1s' }}></div>
        
        {/* Core Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 z-10 animate-pulse-slow">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12z" />
          </svg>
        </div>
      </div>

      <h2 className="text-base font-display font-black text-slate-800 dark:text-white mb-2 tracking-tight">
        Sensor APMOB Offline
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs leading-relaxed mb-6 font-semibold">
        Belum ada sensor terhubung. Aktifkan Bluetooth dan pasangkan modul ESP32 Anda untuk memantau dekomposisi makanan.
      </p>

      <button
        onClick={connectToNewDevice}
        className="glow-btn bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-extrabold py-3 px-6 rounded-full flex items-center gap-2 text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.96] hover:scale-[1.02] transition-all duration-300"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
        </svg>
        <span>SAMBUNGKAN SENSOR</span>
      </button>
    </div>
  );
}

