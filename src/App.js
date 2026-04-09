import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

// Supabase Initialization
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// UUIDs MUST match the ESP32 Arduino code exactly
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

export default function App() {
  const [devices, setDevices] = useState([]);
  const deviceRefs = useRef(new Map());
  const nativePushTimes = useRef(new Map());

  // Prompt the user for OS-level Push Notification Permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const updateDevice = (id, updates) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const parseDataString = (decoded) => {
    let parsedSensorData = { gas: '--', humidity: '--', temperature: '--' };
    try {
      const data = JSON.parse(decoded);
      if (data.gas !== undefined || data.humidity !== undefined || data.temperature !== undefined) {
        parsedSensorData = {
          gas: data.gas !== undefined ? data.gas : '--',
          humidity: data.humidity !== undefined ? data.humidity : '--',
          temperature: data.temperature !== undefined ? data.temperature : '--',
        };
        return parsedSensorData;
      }
    } catch (e) {
      const parts = decoded.split(',').map(s => s.trim());
      if (parts.length >= 3) {
        parsedSensorData = {
          gas: parts[0] || '--',
          humidity: parts[1] || '--',
          temperature: parts[2] || '--'
        };
      }
    }
    return parsedSensorData;
  };

  const executeNativePush = (key, title, body) => {
    const lastSent = nativePushTimes.current.get(key) || 0;
    const now = Date.now();
    // Throttle native OS push notifications to once every 60 seconds per alert type
    if (now - lastSent > 60000) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: '/logo192.png' });
        nativePushTimes.current.set(key, now);
      }
    }
  };

  const checkAlertsAndHistory = (deviceId, deviceName, parsedData) => {
    const gasVal = parseFloat(parsedData.gas);
    const tempVal = parseFloat(parsedData.temperature);
    const humVal = parseFloat(parsedData.humidity);

    // Beautiful UI Threshold Alerts & Native OS Pushes
    if (!isNaN(gasVal) && gasVal >= 700) {
      toast.error(`High Gas Warning: ${gasVal} PPM detected on ${deviceName}!`, { id: `gas-${deviceId}`, duration: 5000 });
      executeNativePush(`gas-${deviceId}`, '⚠️ Critical Gas Detected', `${gasVal} PPM detected on ${deviceName}! Proceed with caution.`);
    }
    if (!isNaN(tempVal) && tempVal >= 30) {
      toast.error(`High Temperature Alert: ${tempVal}°C on ${deviceName}!`, { id: `temp-${deviceId}`, duration: 5000 });
      executeNativePush(`temp-${deviceId}`, '🔥 High Temperature', `${tempVal}°C reached on ${deviceName}!`);
    }

    // Safely insert history to Supabase Database
    if (supabase && !isNaN(gasVal) && !isNaN(tempVal) && !isNaN(humVal)) {
      supabase.from('sensor_history')
        .insert([{ device_id: deviceId, gas: gasVal, humidity: humVal, temperature: tempVal }])
        .then(({ error }) => {
          if (error) console.error("Supabase insert error", error);
        });
    }
  };

  const connectToNewDevice = async () => {
    // Attempt asking for Push Notification permissions explicitly if user presses connect
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32_GATT_Server' }],
        optionalServices: [SERVICE_UUID]
      });

      const deviceId = device.id;
      const deviceName = device.name || "Unknown ESP32";

      setDevices(prev => {
        const filtered = prev.filter(d => d.id !== deviceId);
        return [...filtered, {
          id: deviceId,
          name: deviceName,
          status: "Connecting...",
          isConnected: false,
          readValue: "--",
          sensorData: { gas: '--', humidity: '--', temperature: '--' },
          isReading: false
        }];
      });

      deviceRefs.current.set(deviceId, { device, characteristic: null });

      device.addEventListener('gattserverdisconnected', () => {
        updateDevice(deviceId, {
          status: "Disconnected",
          isConnected: false,
          readValue: "--",
          sensorData: { gas: '--', humidity: '--', temperature: '--' }
        });
        const refs = deviceRefs.current.get(deviceId);
        if (refs) refs.characteristic = null;
        toast('Device disconnected.', { icon: '⚠️', id: `disc-${deviceId}` });
        executeNativePush(`disc-${deviceId}`, 'Sensor Disconnected', `${deviceName} has lost connection.`);
      });

      const server = await device.gatt.connect();
      updateDevice(deviceId, { status: "Getting Service..." });

      const service = await server.getPrimaryService(SERVICE_UUID);
      updateDevice(deviceId, { status: "Getting Characteristic..." });

      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      deviceRefs.current.get(deviceId).characteristic = characteristic;

      updateDevice(deviceId, { status: "Connected", isConnected: true });
      toast.success(`Successfully connected to ${deviceName}`, { id: `success-${deviceId}` });

      try {
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
          const dataView = event.target.value;
          const decoder = new TextDecoder('utf-8');
          const decoded = decoder.decode(dataView);

          const parsedSensorData = parseDataString(decoded);

          updateDevice(deviceId, {
            readValue: decoded,
            sensorData: parsedSensorData
          });

          // Perform Check Data
          checkAlertsAndHistory(deviceId, deviceName, parsedSensorData);
        });
        updateDevice(deviceId, { status: "Live Updates Active" });
      } catch (e) {
        console.warn("Notifications not supported, falling back to manual read");
      }

    } catch (error) {
      console.error("Connection failed!", error);
    }
  };

  const readFromDevice = async (deviceId) => {
    const refs = deviceRefs.current.get(deviceId);
    if (!refs || !refs.characteristic) return;

    updateDevice(deviceId, { isReading: true });

    try {
      const dataView = await refs.characteristic.readValue();
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(dataView);

      const parsedSensorData = parseDataString(decoded);

      updateDevice(deviceId, {
        readValue: decoded,
        sensorData: parsedSensorData
      });

      // Find device name for alerts
      const deviceObj = devices.find(d => d.id === deviceId);
      const dName = deviceObj ? deviceObj.name : "Device";

      checkAlertsAndHistory(deviceId, dName, parsedSensorData);
    } catch (error) {
      console.error("Read failed!", error);
    } finally {
      updateDevice(deviceId, { isReading: false });
    }
  };

  const disconnectDevice = (deviceId) => {
    const refs = deviceRefs.current.get(deviceId);
    if (refs && refs.device.gatt.connected) {
      refs.device.gatt.disconnect();
    }
  };

  const removeDeviceUi = (deviceId) => {
    disconnectDevice(deviceId);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    deviceRefs.current.delete(deviceId);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 pb-20">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155'
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
      }} />

      {/* Navbar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">AquaAir<span className="text-cyan-400 font-light">Dash</span></span>
            </div>

            <div className="flex items-center gap-4">
              {supabase ? (
                <span className="hidden sm:flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  Supabase Active
                </span>
              ) : (
                <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20" title="Add REACT_APP_SUPABASE_URL and KEY to .env">
                  Supabase Offline
                </span>
              )}

              <button
                onClick={connectToNewDevice}
                className="bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 text-sm font-semibold py-1.5 px-4 rounded-full transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                Pair New Sensor
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* Quick Overview Roster */}
        {devices.length > 0 && (
          <section className="mb-12 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
              Active Sensor Roster
            </h3>
            <div className="flex flex-wrap gap-3">
              {devices.map((device, i) => (
                <div key={device.id} className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/50 px-4 py-2.5 rounded-xl shadow-sm hover:border-cyan-500/30 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${device.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></div>
                  <span className="text-sm font-semibold text-slate-200">
                    {device.name} <span className="text-slate-500 font-mono ml-1">#{i + 1}</span>
                  </span>
                  {device.isConnected && (
                    <div className="flex items-center gap-3 border-l border-slate-700/80 pl-3 ml-1 text-xs font-mono text-cyan-400">
                      <span title="Temperature">{device.sensorData.temperature}°C</span>
                      <span title="Humidity" className="text-blue-400">{device.sensorData.humidity}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Active Sensor Arrays</h2>
            <p className="text-slate-400 mb-8 max-w-md">Begin monitoring by pairing your first ESP32 environment sensor. You can pair multiple arrays simultaneously.</p>
            <button
              onClick={connectToNewDevice}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-cyan-500/20"
            >
              Connect Sensor Array
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {devices.map((device, index) => (
              <div key={device.id} className="relative">
                {/* Array Separator - Only show between arrays */}
                {index > 0 && <div className="absolute -top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>}

                {/* Device Header */}
                <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                      <span className="text-slate-400 font-mono font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        {device.name}
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${device.isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${device.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></div>
                          {device.status}
                        </div>
                      </h2>
                      <p className="text-xs font-mono text-slate-500 mt-1">ID: {device.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {device.isConnected ? (
                      <button
                        onClick={() => disconnectDevice(device.id)}
                        className="flex-1 md:flex-none text-sm bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-400 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => removeDeviceUi(device.id)}
                        className="flex-1 md:flex-none text-sm bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Cards Grid for this Device */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-300 ${!device.isConnected ? 'opacity-40 grayscale' : ''}`}>

                  {/* Temperature Card */}
                  <div className={`relative group overflow-hidden rounded-3xl bg-slate-900 border ${(!isNaN(parseFloat(device.sensorData.temperature)) && parseFloat(device.sensorData.temperature) >= 30) ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-800'} p-8 hover:border-orange-500/30 transition-all`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-24 h-24 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.485-6.485l-1.414 1.414M6.929 17.071l-1.414 1.414M17.071 17.071l1.414 1.414M6.929 6.929L5.515 5.515M12 16a4 4 0 100-8 4 4 0 000 8z" />
                      </svg>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.485-6.485l-1.414 1.414M6.929 17.071l-1.414 1.414M17.071 17.071l1.414 1.414M6.929 6.929L5.515 5.515M12 16a4 4 0 100-8 4 4 0 000 8z"></path></svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-300">Temperature</h3>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold text-white tracking-tight">{device.sensorData.temperature}</span>
                        <span className="text-xl text-slate-500 font-medium">°C</span>
                      </div>
                    </div>
                    <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-colors ${(!isNaN(parseFloat(device.sensorData.temperature)) && parseFloat(device.sensorData.temperature) >= 30) ? 'bg-red-500/40' : 'bg-orange-500/20 group-hover:bg-orange-500/30'}`}></div>
                  </div>

                  {/* Humidity Card */}
                  <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-24 h-24 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-300">Humidity</h3>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold text-white tracking-tight">{device.sensorData.humidity}</span>
                        <span className="text-xl text-slate-500 font-medium">%</span>
                      </div>
                    </div>
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-blue-500/30 transition-colors"></div>
                  </div>

                  {/* Gas Card */}
                  <div className={`relative group overflow-hidden rounded-3xl bg-slate-900 border ${(!isNaN(parseFloat(device.sensorData.gas)) && parseFloat(device.sensorData.gas) >= 700) ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-800'} p-8 hover:border-emerald-500/30 transition-all`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-24 h-24 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-300">Gas Density</h3>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold text-white tracking-tight">{device.sensorData.gas}</span>
                        <span className="text-xl text-slate-500 font-medium">PPM</span>
                      </div>
                    </div>
                    <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-colors ${(!isNaN(parseFloat(device.sensorData.gas)) && parseFloat(device.sensorData.gas) >= 700) ? 'bg-red-500/40' : 'bg-emerald-500/20 group-hover:bg-emerald-500/30'}`}></div>
                  </div>

                </div>

                {/* Footer Controls & Stream for this device */}
                {device.isConnected && (
                  <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
                    <p className="text-xs text-slate-600 font-mono tracking-wider truncate w-full md:w-1/2">
                      RAW STREAM: {device.readValue}
                    </p>
                    <button
                      onClick={() => readFromDevice(device.id)}
                      disabled={!device.isConnected || device.isReading}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <svg className={`w-3.5 h-3.5 ${device.isReading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Fetch Manually
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}