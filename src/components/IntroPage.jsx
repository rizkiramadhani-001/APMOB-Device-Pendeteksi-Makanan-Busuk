import React, { useState, useEffect } from 'react';

export default function IntroPage({ onGetStarted }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Smart Food,\nEssentials",
      subtitle: "Mendeteksi kesegaran makanan secara presisi melalui modul sensor gas cerdas MQ-4 & MQ-135.",
      badge: "Sensor Node Active",
      metric: "MQ-4: 120 PPM (Aman)"
    },
    {
      title: "Bluetooth BLE,\nSeamless Control",
      subtitle: "Hubungkan modul sensor Anda secara instan menggunakan Bluetooth Low Energy yang andal dan hemat daya.",
      badge: "BLE Connectivity",
      metric: "GATT Server Connected"
    },
    {
      title: "Cloud Sync,\nPush Alerts",
      subtitle: "Simpan riwayat ke Supabase dan dapatkan notifikasi instan ketika makanan dideteksi mulai membusuk.",
      badge: "Supabase Database",
      metric: "Sync Status: Active"
    }
  ];

  // Auto-advance slides every 5 seconds, resetting when currentSlide changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentSlide, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-y-auto select-none flex flex-col justify-between p-6">
      
      {/* Background Image with Ken Burns zoom effect */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
        <img 
          src="/intro_kitchen_bg.png" 
          alt="Kitchen Background" 
          className="w-full h-full object-cover opacity-90 transition-transform duration-[5000ms] ease-out transform scale-105"
          style={{ transform: `scale(1.05) translate(${-currentSlide * 1}%, 0px)` }}
        />
        {/* Apple-style layered dark gradient overlay for ultimate contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/95"></div>
      </div>

      {/* Top Header: Brand Typography & Slide indicators */}
      <div className="relative z-10 flex items-center justify-between pt-2">
        {/* Left Side: Brand Typography */}
        <div className="flex items-center">
          <span className="font-display font-black text-base tracking-tight text-white select-none">
            safe<span className="text-cyan-400 font-light">dish</span>
          </span>
        </div>

        {/* Right Side: Page dots inside iOS pill */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-full px-3.5 py-1.5 flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentSlide 
                  ? 'bg-cyan-400 w-5 h-1.5 shadow-[0_0_8px_rgba(34,211,238,0.6)]' 
                  : 'bg-white/35 w-1.5 h-1.5 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Floating Organic Info Badge (Middle section of screen 1) */}
      <div 
        className="relative z-10 my-auto self-start transform transition-all duration-500 ease-out"
        style={{ transform: 'translateY(-10px)' }}
      >
        <div className="bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full pl-1.5 pr-5 py-1.5 flex items-center gap-3 shadow-lg shadow-black/25 hover:bg-white/15 transition-all">
          <div className="w-9 h-9 rounded-full bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src="/esp32-sensor.png" 
              alt="ESP32 Mini Preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback inside case image fails to load
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="text-left">
            <span className="block text-[9px] font-bold text-cyan-300 uppercase tracking-widest leading-none">safedish IoT</span>
            <span className="block text-xs font-black text-white mt-0.5 leading-none">{slides[currentSlide].badge}</span>
          </div>
        </div>
      </div>

      {/* Slide Content Overlay */}
      <div className="relative z-10 text-left mb-6 space-y-4">
        {/* Dynamic badge for specific telemetry metric */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[9px] font-bold text-white/95 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{slides[currentSlide].metric}</span>
        </div>

        {/* Big Bold Headline */}
        <h2 className="text-[26px] sm:text-[32px] font-display font-black text-white leading-[1.08] tracking-tight whitespace-pre-line animate-fade-in">
          {slides[currentSlide].title}
        </h2>

        {/* Description Text */}
        <p className="text-xs text-slate-300 leading-relaxed font-semibold max-w-[320px]">
          {slides[currentSlide].subtitle}
        </p>
      </div>

      {/* Premium Apple-style Glass Onboarding Bar */}
      <div className="relative z-10 w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[30px] p-2 flex items-center justify-between shadow-2xl shrink-0">
        
        {/* Get Started Capsule Pill */}
        <button
          onClick={onGetStarted}
          className="flex-1 py-3.5 px-6 rounded-[22px] bg-white/10 hover:bg-white/15 border border-white/10 active:scale-[0.98] transition-all duration-300 flex items-center justify-between text-left group"
        >
          <span className="text-xs font-black text-white uppercase tracking-wider">Get Started</span>
          
          {/* Animating chevrons */}
          <div className="flex items-center text-cyan-300 font-black tracking-tighter text-xs">
            <span className="animate-pulse">/</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>/</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>/</span>
          </div>
        </button>

      </div>

    </div>
  );
}
