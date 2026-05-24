import React, { useState } from 'react';

export default function DeviceManager({ devices, connectToNewDevice, connectToSavedDevice, disconnectDevice, removeDeviceUi, renameDevice }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const startEdit = (device) => {
    setEditingId(device.id);
    setEditName(device.name);
  };

  const saveEdit = (id) => {
    if (editName.trim()) {
      renameDevice(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <section className="mb-5 p-4 sm:p-6 rounded-[22px] sm:rounded-[28px] bg-white/70 dark:bg-black/40 border border-slate-200/50 dark:border-white/10 shadow-sm backdrop-blur-xl relative overflow-hidden transition-all duration-300 select-none">
      
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-2 min-w-[130px] sm:min-w-[150px] flex-1">
          {/* iOS Solid Icon Squircle backing */}
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/10 text-white">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-display font-black text-xs text-slate-800 dark:text-white">
              Sensor Node Registry
            </h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">Daftar modul pemantau makanan Anda.</p>
          </div>
        </div>

        <button
          onClick={connectToNewDevice}
          className="glow-btn bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white text-[10px] font-black py-2 px-3 rounded-full flex items-center justify-center gap-1.5 shrink-0 ml-auto"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>Pasang</span>
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-slate-200/50 dark:border-white/10 rounded-2xl bg-slate-100/40 dark:bg-black/40 relative group transition-all duration-300">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-200/40 dark:border-neutral-800/60 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-xs">Belum ada sensor terdaftar</p>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 max-w-[240px] leading-normal text-center">Pasangkan modul ESP32 Bluetooth Anda untuk memulai visualisasi telemetri.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 relative z-10">
          {devices.map((device) => {
            const isActive = device.isConnected || 
                             device.status === 'WiFi Active' || 
                             device.status === 'Live Monitoring Active' || 
                             device.status === 'Connected';
            return (
              <div 
                key={device.id} 
                className={`flex flex-wrap items-center justify-between p-3.5 rounded-2xl bg-slate-100/50 dark:bg-black/50 border transition-all duration-300 group/row active:scale-[0.99] gap-2.5 ${
                  isActive 
                    ? 'border-emerald-500/30 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/[0.02] bg-emerald-500/[0.015]' 
                    : 'border-slate-200/50 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {/* Left Side: Microchip Icon & Status Indicator */}
                <div className="flex items-center gap-2.5 min-w-[130px] sm:min-w-[150px] flex-1">
                  {/* iOS Solid Icon Squircle in Row */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-emerald-500/10'
                      : 'bg-slate-100 dark:bg-neutral-800 border border-slate-200/40 dark:border-neutral-700/50 text-slate-400 dark:text-slate-500'
                  }`}>
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>

                  {/* Device Titles / Edit Form */}
                  <div className="text-left min-w-0 flex-1">
                    {editingId === device.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => saveEdit(device.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(device.id)}
                        className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-cyan-500 rounded-lg px-2 py-0.5 outline-none w-full"
                      />
                    ) : (
                      <div 
                        onClick={() => startEdit(device)} 
                        className="flex items-center gap-1.5 cursor-pointer group/name" 
                        title="Klik untuk mengubah nama"
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover/name:text-cyan-500 transition-colors truncate max-w-[90px] sm:max-w-[140px]">
                          {device.name}
                        </span>
                        <svg className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActive 
                          ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' 
                          : 'bg-slate-400 dark:bg-slate-600'
                      }`}></span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">
                        ID: {device.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {!device.isConnected ? (
                    <>
                      <button 
                        onClick={() => connectToSavedDevice(device.id, device.name)} 
                        className="text-[9px] bg-cyan-500/10 dark:bg-cyan-500/15 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-3 py-1.5 rounded-full font-bold transition-all border border-cyan-500/10 uppercase tracking-wider active:scale-95"
                      >
                        Connect
                      </button>
                      <button 
                        onClick={() => removeDeviceUi(device.id)} 
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 transition-all active:scale-90"
                        title="Hapus perangkat"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => disconnectDevice(device.id)} 
                      className="text-[9px] text-rose-500 bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-500/15 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-full font-bold transition-all border border-rose-500/10 uppercase tracking-wider active:scale-95"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
