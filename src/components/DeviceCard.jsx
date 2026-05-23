import React, { useState } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateFreshness, exportToCSV } from '../utils/sensorUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/85 border border-slate-800/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl text-left">
        <p className="text-[10px] text-slate-500 font-mono mb-1">{label || 'Sensor Log'}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-xs font-extrabold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DeviceCard({ device, index, isDarkMode, disconnectDevice, removeDeviceUi, sendWifiCredentials }) {
  const freshness = calculateFreshness(device.sensorData.mq4, device.sensorData.mq135, device.sensorData.humidity);
  const [showWifiForm, setShowWifiForm] = useState(false);
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [isSendingWifi, setIsSendingWifi] = useState(false);

  const wifiStatus = device.wifiStatus || { status: 'NOT_CONFIGURED', ip: '', ssid: '' };

  const isActive = device.isConnected || 
                   device.status === 'WiFi Active' || 
                   device.status === 'Live Monitoring Active' || 
                   device.status === 'Connected';

  const getStatusBadgeStyles = () => {
    const status = device.status?.toLowerCase() || '';
    if (device.isConnected || status === 'wifi active' || status === 'live monitoring active' || status === 'connected') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500 animate-pulse'
      };
    } else if (status.includes('connecting') || status.includes('getting') || status.includes('service')) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500 animate-pulse'
      };
    } else {
      return {
        bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
        dot: 'bg-slate-400'
      };
    }
  };
  const badgeStyles = getStatusBadgeStyles();

  const handleSendWifi = async (e) => {
    e.preventDefault();
    if (!wifiSSID.trim()) return;
    setIsSendingWifi(true);
    const success = await sendWifiCredentials(device.id, wifiSSID.trim(), wifiPassword);
    setIsSendingWifi(false);
    if (success) {
      setShowWifiForm(false);
    }
  };

  return (
    <div className="mb-5 p-4 sm:p-6 rounded-[22px] sm:rounded-[28px] bg-white/70 dark:bg-black/40 border border-slate-200/50 dark:border-white/10 shadow-sm backdrop-blur-xl relative select-none transition-all duration-300 hover:shadow-md">
      
      {/* Device Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2.5 min-w-[160px] flex-1">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-md shadow-cyan-500/10 text-white shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-display font-black text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
              <span>{device.name}</span>
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 border shrink-0 ${badgeStyles.bg}`}>
                <div className={`w-1 h-1 rounded-full ${badgeStyles.dot}`}></div>
                <span>{device.status}</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">
                ID: {device.id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            onClick={() => exportToCSV(device)}
            className="p-2 text-slate-500 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-400 bg-slate-50 dark:bg-black/30 border border-slate-200/40 dark:border-neutral-800/60 rounded-full transition-all duration-200 active:scale-90 hover:scale-105"
            title="Ekspor CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          
          {device.isConnected ? (
            <button
              onClick={() => disconnectDevice(device.id)}
              className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-black/40 border border-slate-200/40 dark:border-neutral-800/60 hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 py-2 px-3 rounded-full transition-all duration-200 active:scale-95"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => removeDeviceUi(device.id)}
              className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 py-2 px-3 rounded-full transition-all duration-200 active:scale-95"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Freshness Health Gauge Banner (Apple Fitness Glass style) */}
      <div className={`mb-5 rounded-[22px] border p-5 flex items-center justify-between gap-4 backdrop-blur-md transition-all duration-300 ${
        freshness.bg
      } ${freshness.border} ${!isActive && 'opacity-75'}`}>
        
        {/* Diagnosis text block */}
        <div className="flex-1 text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/45 dark:bg-black/20`}>
              <svg className={`w-3.5 h-3.5 shrink-0 ${freshness.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`font-display font-black text-xs tracking-tight ${freshness.color}`}>
              Kelayakan: {freshness.label}
            </h3>
          </div>
          <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-normal max-w-[200px]">
            {freshness.message}
          </p>
        </div>

        {/* SVG concentric health ring meter (Apple Fitness Ring style) */}
        <div className="flex-shrink-0 relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 56 56">
            {/* Background circle track */}
            <circle
              cx="28"
              cy="28"
              r="22"
              className="text-slate-200/50 dark:text-neutral-800/40"
              stroke="currentColor"
              strokeWidth="4.5"
              fill="transparent"
            />
            {/* Foreground animated progress path */}
            <circle
              cx="28"
              cy="28"
              r="22"
              className={`transition-all duration-1000 ease-out ${
                freshness.score >= 80 
                  ? 'text-emerald-500 dark:text-emerald-400' 
                  : freshness.score >= 50 
                    ? 'text-amber-500 dark:text-amber-400' 
                    : 'text-rose-500 dark:text-rose-400'
              }`}
              stroke="currentColor"
              strokeWidth="4.5"
              strokeDasharray="138.23"
              strokeDashoffset={138.23 - (freshness.score / 100) * 138.23}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            <span className={`block text-sm font-black tracking-tight leading-none ${freshness.color}`}>{freshness.score}</span>
            <span className="block text-[6px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mt-0.5">Score</span>
          </div>
        </div>

      </div>

      {/* WiFi Configuration Accordion Panel */}
      {device.isConnected && (
        <div className="mb-5 rounded-[22px] border border-slate-200/40 dark:border-white/10 bg-slate-100/50 dark:bg-black/50 overflow-hidden transition-all duration-300">
          
          <button
            onClick={() => setShowWifiForm(!showWifiForm)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100/40 dark:hover:bg-neutral-900/30 transition-colors"
          >
            <div className="flex items-center gap-3 text-left min-w-0">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[11px] font-display font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Jaringan WiFi</h3>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                  {wifiStatus.status === 'CONNECTED' && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Terhubung: {wifiStatus.ssid} &bull; {wifiStatus.ip}</span>
                  )}
                  {wifiStatus.status === 'CONNECTING' && (
                    <span className="text-amber-600 dark:text-amber-400 animate-pulse font-medium">Menghubungkan {wifiStatus.ssid}...</span>
                  )}
                  {wifiStatus.status === 'DISCONNECTED' && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">Terputus: {wifiStatus.ssid}</span>
                  )}
                  {wifiStatus.status === 'NOT_CONFIGURED' && (
                    <span>Perangkat belum terhubung WiFi</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[7px] font-extrabold uppercase tracking-widest border shrink-0 ${
                wifiStatus.status === 'CONNECTED'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : wifiStatus.status === 'CONNECTING'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-200/50 dark:bg-neutral-800 border-slate-300/40 dark:border-neutral-700/60 text-slate-500 dark:text-slate-400'
              }`}>
                <span>{wifiStatus.status === 'NOT_CONFIGURED' ? 'OFFLINE' : wifiStatus.status}</span>
              </span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${showWifiForm ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Collapsible Form */}
          {showWifiForm && (
            <div className="px-4 pb-4 border-t border-slate-200/20 dark:border-neutral-800/40">
              <form onSubmit={handleSendWifi} className="flex flex-col gap-3 pt-3.5 text-left">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">SSID Jaringan</label>
                  <input
                    type="text"
                    value={wifiSSID}
                    onChange={(e) => setWifiSSID(e.target.value)}
                    placeholder="Nama WiFi / SSID"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Password WiFi"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingWifi || !wifiSSID.trim()}
                  className="w-full py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 hover:scale-[1.01] active:scale-95"
                >
                  {isSendingWifi ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  <span>{isSendingWifi ? 'MENGIRIM...' : 'KIRIM KE ESP32'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Sensor Dashboard Metrics Grid (Apple Health Style Widgets) */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${!isActive ? 'opacity-90' : ''}`}>
        
        {/* Metric Row: MQ-4 Methane */}
        <div className="group rounded-[22px] bg-slate-100/50 dark:bg-black/50 border border-slate-200/50 dark:border-white/10 p-5 hover:border-emerald-500/35 dark:hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/[0.015] active:scale-[0.98] transition-all duration-200 flex items-center justify-between gap-4 text-left cursor-pointer">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-[9px] font-display font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Metana (MQ-4)</h3>
            </div>
            <div className="flex items-baseline gap-1 pl-1">
              <span className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">{device.sensorData.mq4}</span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">PPM</span>
            </div>
          </div>

          {/* Minimal Area Trend Sparkline */}
          <div className="h-[52px] w-[120px] shrink-0 overflow-hidden relative">
            {device.history && device.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={device.history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`glowMq4-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mq4" stroke="#10b981" strokeWidth={1.8} fillOpacity={1} fill={`url(#glowMq4-${device.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[8px] text-slate-400 font-medium">Loading...</div>
            )}
          </div>
        </div>

        {/* Metric Row: MQ-135 Air Quality */}
        <div className="group rounded-[22px] bg-slate-100/50 dark:bg-black/50 border border-slate-200/50 dark:border-white/10 p-5 hover:border-orange-500/35 dark:hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/[0.015] active:scale-[0.98] transition-all duration-200 flex items-center justify-between gap-4 text-left cursor-pointer">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.485-6.485l-1.414 1.414M6.929 17.071l-1.414 1.414M17.071 17.071l1.414 1.414M6.929 6.929L5.515 5.515M12 16a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
              <h3 className="text-[9px] font-display font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Polusi (MQ-135)</h3>
            </div>
            <div className="flex items-baseline gap-1 pl-1">
              <span className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">{device.sensorData.mq135}</span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">PPM</span>
            </div>
          </div>

          {/* Minimal Area Trend Sparkline */}
          <div className="h-[52px] w-[120px] shrink-0 overflow-hidden relative">
            {device.history && device.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={device.history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`glowMq135-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mq135" stroke="#f97316" strokeWidth={1.8} fillOpacity={1} fill={`url(#glowMq135-${device.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[8px] text-slate-400 font-medium">Loading...</div>
            )}
          </div>
        </div>

        {/* Metric Row: Humidity */}
        <div className="group rounded-[22px] bg-slate-100/50 dark:bg-black/50 border border-slate-200/50 dark:border-white/10 p-5 hover:border-blue-500/35 dark:hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/[0.015] active:scale-[0.98] transition-all duration-200 flex items-center justify-between gap-4 text-left cursor-pointer font-sans">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-[9px] font-display font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Kelembaban (DHT22)</h3>
            </div>
            <div className="flex items-baseline gap-1 pl-1">
              <span className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">{device.sensorData.humidity}</span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">% RH</span>
            </div>
          </div>

          {/* Minimal Area Trend Sparkline */}
          <div className="h-[52px] w-[120px] shrink-0 overflow-hidden relative">
            {device.history && device.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={device.history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`glowHumidity-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={1.8} fillOpacity={1} fill={`url(#glowHumidity-${device.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[8px] text-slate-400 font-medium">Loading...</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
