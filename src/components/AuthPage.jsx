import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSpecsDrawer, setShowSpecsDrawer] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await signIn(username, password);
        if (result.error) setError(result.error.message);
      } else {
        if (!fullName.trim()) {
          setError('Nama lengkap harus diisi.');
          setIsLoading(false);
          return;
        }
        if (username.length < 3) {
          setError('Username minimal 3 karakter.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password minimal 6 karakter.');
          setIsLoading(false);
          return;
        }
        const result = await signUp(username, password, fullName.trim());
        if (result.error) setError(result.error.message);
      }
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setPassword('');
    setFullName('');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden select-none">
      
      {/* Background Image with Ken Burns zoom effect */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
        <img 
          src="/intro_kitchen_bg.png" 
          alt="Kitchen Background" 
          className="w-full h-full object-cover opacity-90 transition-transform duration-[5000ms] ease-out transform scale-105"
        />
        {/* Apple-style layered dark gradient overlay for ultimate contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/95"></div>
      </div>

      {/* Floating Info Button to trigger slide-up drawer */}
      <button
        onClick={() => setShowSpecsDrawer(true)}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/10 text-white hover:text-cyan-300 flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-sm"
        title="Spesifikasi Alat Sensor"
        aria-label="Sensor Specs"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Brand Header */}
      <div className="pt-6 text-center z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 shadow-lg shadow-cyan-500/25 mb-5 animate-pulse-slow">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-xl font-display font-black text-white tracking-tight">
          AquaAir<span className="text-cyan-400 font-light">Dash</span>
        </h1>
        <p className="text-[10px] text-cyan-300 uppercase tracking-widest font-black leading-none mt-1.5">Sistem Deteksi Pembusukan Makanan</p>
      </div>

      {/* Auth Box Container (Apple Frosted Glass) */}
      <div className="my-auto py-6 z-10 w-full">
        <div className="bg-black/40 border border-white/10 backdrop-blur-2xl p-6 rounded-[26px] text-left shadow-2xl">
          
          <h2 className="text-lg font-display font-black text-white mb-1.5">
            {isLogin ? 'Masuk ke Akun' : 'Daftar Baru'}
          </h2>
          <p className="text-xs text-slate-300 mb-5 leading-normal font-semibold">
            {isLogin
              ? 'Kelola dan pantau telemetri sensor Anda secara real-time.'
              : 'Daftar untuk menghubungkan array sensor IoT pertama Anda.'}
          </p>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-start gap-2.5 leading-normal">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-cyan-300 uppercase tracking-widest leading-none mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-cyan-300 uppercase tracking-widest leading-none mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  minLength={3}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-cyan-300 uppercase tracking-widest leading-none mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>MENGHUBUNGKAN...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={isLogin ? "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"} />
                  </svg>
                  <span>{isLogin ? 'MASUK KE DASBOR' : 'DAFTAR & BUAT AKUN'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-slate-300">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
              <button
                onClick={switchMode}
                className="text-cyan-400 hover:text-cyan-300 hover:underline font-bold transition-colors ml-0.5 focus:outline-none"
              >
                {isLogin ? 'Daftar Sekarang' : 'Masuk'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <p className="text-[10px] text-white/40 font-mono tracking-wide z-10 pt-2 shrink-0">
        APMOB IoT System &copy; {new Date().getFullYear()}
      </p>

      {/* Slide-Up Bottom Specs Drawer Overlay */}
      {showSpecsDrawer && (
        <div 
          onClick={() => setShowSpecsDrawer(false)}
          className="absolute inset-0 bg-slate-950/80 z-30 transition-opacity duration-300"
        ></div>
      )}

      {/* Slide-Up Bottom Specs Drawer Panel (iOS Modal Sheet) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 max-h-[85%] bg-slate-950/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] p-6 pb-8 overflow-y-auto z-40 transition-transform duration-300 text-left shadow-[0_-15px_35px_rgba(0,0,0,0.3)] ${
          showSpecsDrawer ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* iOS Pull Drawer grab handle indicator */}
        <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mb-5"></div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-display font-black text-white">Spesifikasi Sensor APMOB</h3>
          <button 
            onClick={() => setShowSpecsDrawer(false)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-slate-300 text-xs leading-relaxed mb-5 font-semibold">
          Modul detektor makanan AquaAir dilengkapi sensor presisi tinggi untuk menganalisis laju dekomposisi organik:
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Detektor Metana MQ-4</h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-normal font-semibold">Mengukur akumulasi gas Metana ($CH_4$) hasil dekomposisi zat organik pada makanan busuk.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.485-6.485l-1.414 1.414M6.929 17.071l-1.414 1.414M17.071 17.071l1.414 1.414M6.929 6.929L5.515 5.515M12 16a4 4 0 100-8 4 4 0 000 8z" /></svg>
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Kualitas Udara MQ-135</h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-normal font-semibold">Mendeteksi amonia ($NH_3$), senyawa sulfida beracun, dan alkohol yang dilepaskan bakteri pembusuk.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Kelembaban Udara DHT22</h4>
              <p className="text-[10px] text-slate-300 mt-1 leading-normal font-semibold">Mengukur kelembaban udara sekitar bahan makanan, yang memicu percepatan perkembangbiakan jamur.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
