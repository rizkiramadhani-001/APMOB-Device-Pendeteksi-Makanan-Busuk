import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useBluetooth } from './hooks/useBluetooth';
import Navbar from './components/Navbar';
import DeviceCard from './components/DeviceCard';
import DeviceManager from './components/DeviceManager';
import AuthPage from './components/AuthPage';
import IntroPage from './components/IntroPage';


function Dashboard({ isDarkMode, setIsDarkMode }) {
  const { user } = useAuth();
  const { devices, isLoadingDB, connectToNewDevice, connectToSavedDevice, disconnectDevice, removeDeviceUi, renameDevice, sendWifiCredentials } = useBluetooth(user?.id);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <Navbar 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
        connectToNewDevice={connectToNewDevice} 
      />

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-24">
        {isLoadingDB ? (
          <div className="flex justify-center py-20 text-slate-500 dark:text-slate-400 font-medium text-xs">
            Loading saved devices...
          </div>
        ) : (
          <div className="space-y-5">
            <DeviceManager 
              devices={devices} 
              connectToNewDevice={connectToNewDevice}
              connectToSavedDevice={connectToSavedDevice}
              disconnectDevice={disconnectDevice}
              removeDeviceUi={removeDeviceUi}
              renameDevice={renameDevice}
            />
            {devices.some(d => d.isConnected) && (
              <div className="space-y-5">
                {devices.filter(d => d.isConnected).map((device, index) => (
                  <DeviceCard 
                    key={device.id}
                    device={device}
                    index={index}
                    isDarkMode={isDarkMode}
                    disconnectDevice={disconnectDevice}
                    removeDeviceUi={removeDeviceUi}
                    sendWifiCredentials={sendWifiCredentials}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MobileLayoutContainer({ children, isDarkMode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f5f5f7] to-[#e5e5ea] dark:from-[#000000] dark:to-[#0c0c0e] flex items-center justify-center p-0 font-sans selection:bg-cyan-500/30 transition-colors duration-300 relative overflow-hidden">
      
      {/* Apple-Style Dynamic Fluid Wallpaper (Soft, elegant blurred circles in background for PC displays) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden sm:block">
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-rose-400/[0.14] dark:bg-rose-500/[0.04] rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] bg-indigo-400/[0.14] dark:bg-indigo-500/[0.04] rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[35%] left-[40%] w-[450px] h-[450px] bg-cyan-400/[0.12] dark:bg-cyan-500/[0.03] rounded-full blur-[90px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[30%] left-[15%] w-[400px] h-[400px] bg-violet-400/[0.1] dark:bg-violet-500/[0.03] rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Clean Centered Mobile Column Layout (Apple Frosted Glass aesthetic, full height, border-x) */}
      <div className="w-full h-screen sm:max-w-[420px] bg-slate-950 sm:backdrop-blur-3xl sm:border-x border-slate-200/40 dark:border-neutral-900/60 shadow-[0_0_80px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col relative overflow-hidden z-10 transition-all duration-300">
        
        {/* Persistent Photorealistic Kitchen Background Image for Dashboard & App */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            src="/intro_kitchen_bg.png" 
            alt="Kitchen Background" 
            className="w-full h-full object-cover opacity-90 scale-105"
          />
          {/* Apple-style layered dark gradient overlay for ultimate contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/95"></div>
        </div>

        {/* Global Notifications toaster */}
        <div className="relative z-20">
          <Toaster position="top-center" toastOptions={{
            style: isDarkMode ? { background: '#1c1c1e', color: '#f5f5f7', border: '1px solid #2c2c2e', fontSize: '11px', borderRadius: '14px', backdropFilter: 'blur(20px)' } : { background: '#ffffff', color: '#1c1c1e', border: '1px solid #e5e5ea', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', borderRadius: '14px' },
            success: { iconTheme: { primary: '#30d158', secondary: isDarkMode ? '#1c1c1e' : '#ffffff' } },
            error: { iconTheme: { primary: '#ff453a', secondary: isDarkMode ? '#1c1c1e' : '#ffffff' } },
          }} />
        </div>

        {/* Dynamic Inner Application Page Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {children}
        </div>

      </div>
    </div>
  );
}

function AppContent({ isDarkMode, setIsDarkMode }) {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (!user) {
      setShowIntro(true);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 animate-pulse">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs tracking-wider">MEMUAT...</p>
        </div>
      </div>
    );
  }

  return (
    <MobileLayoutContainer isDarkMode={isDarkMode}>
      {!user ? (
        showIntro ? (
          <IntroPage onGetStarted={() => setShowIntro(false)} />
        ) : (
          <AuthPage />
        )
      ) : (
        <Dashboard isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      )}
    </MobileLayoutContainer>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <AuthProvider>
      <AppContent isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </AuthProvider>
  );
}