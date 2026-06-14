import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, Footprints, Timer, Zap, MapPin, Youtube, Gauge, TrendingUp, Weight, Pause, Play, MonitorPlay, Activity, Heart, AlertTriangle } from 'lucide-react';
import { bioMonitor } from '../services/bioMonitor';
import { mediaMaestro } from '../services/mediaMaestro';

type CardioMode = 'corrida' | 'esteira' | 'bicicleta';

export default function CardioTab() {
  const [mode, setMode] = useState<CardioMode>('esteira');
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  
  // PiP Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Input states
  const [speed, setSpeed] = useState(6.0); // km/h
  const [incline, setIncline] = useState(0); // % for treadmill
  const [load, setLoad] = useState(5); // Resistance for bike

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, speed]);

  // Update PiP Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stats = getStats();
    
    // Clear and draw background (Deep Black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circular main frame
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = (canvas.width / 2) - 10;

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#111827'; // Darker blue-gray
    ctx.fill();
    
    // 1. BRANDING (Top, small but sharp)
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 30px Inter, sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText('IRONMIND CARDIO', centerX, centerY - 250);

    // 2. MAIN TIMER (MASSIVE & CENTERED)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 230px monospace'; // Slightly reduced size
    ctx.fillText(formatTime(time), centerX, centerY + 80);

    // 3. STATS (Below Timer, high contrast)
    ctx.fillStyle = '#60a5fa'; // Brighter blue
    ctx.font = 'bold 38px monospace';
    const distText = `${stats.distance} KM`;
    const speedText = `${speed.toFixed(1)} KM/H`;
    ctx.fillText(distText, centerX - 120, centerY + 180);
    ctx.fillText(speedText, centerX + 120, centerY + 180);

    ctx.fillStyle = '#94a3b8';
    let variantLabel = mode === 'bicicleta' ? `L:${load}` : `I:${incline}%`;
    const footerText = `${variantLabel}`;
    ctx.font = 'bold 32px monospace';
    ctx.fillText(footerText.toUpperCase(), centerX, centerY + 240);

    // Status Indicator (Blinking at very bottom)
    if (isActive) {
      ctx.fillStyle = (Math.floor(Date.now() / 500) % 2 === 0) ? '#10b981' : '#064e3b';
      ctx.beginPath();
      ctx.arc(centerX, centerY + 300, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [time, speed, incline, load, mode, isActive]);

  // Handle PiP stream initialization
  useEffect(() => {
    const initializeStream = async () => {
      if (canvasRef.current && videoRef.current && !videoRef.current.srcObject) {
        try {
          const stream = (canvasRef.current as any).captureStream(30);
          videoRef.current.srcObject = stream;
          // Pre-play muted video to have it ready for PiP
          await videoRef.current.play().catch(() => {});
        } catch (e) {
          console.error("Failed to initialize PiP stream", e);
        }
      }
    };
    initializeStream();
  }, []);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        // Ensure video is playing before requesting PiP
        // If it was interrupted, we try to play again
        if (video.paused) {
          await video.play();
        }
        await video.requestPictureInPicture();
        
        // Maestro de Mídia: Ajustar áudio ao entrar em modo flutuante
        mediaMaestro.duckVolume(0.5);
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStats = () => {
    // Distance in km based on current speed
    const distance = ((time / 3600) * speed).toFixed(2);
    
    // Calorie calculation (simplified MET-based)
    let met = speed * 0.8; 
    if (mode === 'esteira') {
      met += (incline * 0.15);
    } else if (mode === 'bicicleta') {
      met = (speed * 0.4) + (load * 0.3);
    }
    
    // Average weight 70kg for calculation
    const calories = ((met * 70 * (time / 3600))).toFixed(0);
    return { distance, calories };
  };

  const handleMediaClick = (url: string) => {
    if (!isActive) setIsActive(true);
    
    // Abrir o streaming e ativar o Visor Flutuante no mesmo gesto
    togglePiP().then(() => {
        window.open(url, '_blank');
    }).catch(err => {
        console.error("Erro ao ativar visor flutuante:", err);
        window.open(url, '_blank');
    });
  };

  const stats = getStats();

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden relative transition-colors duration-300">
      <div className="opacity-0 pointer-events-none absolute -z-50 overflow-hidden w-px h-px">
        <canvas ref={canvasRef} width={720} height={720} />
        <video ref={videoRef} playsInline muted />
      </div>

      {/* Mode Selection */}
      <div className="p-2 flex gap-2 flex-shrink-0">
        {(['corrida', 'esteira', 'bicicleta'] as CardioMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setTime(0); setIsActive(false); }}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all capitalize font-bold text-[8px] tracking-widest border-2 ${
              mode === m 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md dark:shadow-none' 
                : 'bg-white dark:bg-[#121212] text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${mode === m ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-900'}`}>
              {m === 'corrida' && <MapPin className="w-3.5 h-3.5" />}
              {m === 'esteira' && <Footprints className="w-3.5 h-3.5" />}
              {m === 'bicicleta' && <Bike className="w-3.5 h-3.5" />}
            </div>
            {m}
          </button>
        ))}
      </div>

      {/* Main Stats Display */}
      <div className="px-4 py-1 flex flex-col items-center gap-4 flex-1 overflow-y-auto min-h-0">
        <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Animated Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                    cx="64" cy="64" r="60" 
                    className="stroke-slate-200 dark:stroke-slate-800 fill-none" 
                    strokeWidth="3"
                />
                <motion.circle 
                    cx="64" cy="64" r="60" 
                    className="stroke-blue-600 fill-none transition-all duration-1000" 
                    strokeWidth="3"
                    strokeDasharray="377"
                    animate={{ strokeDashoffset: 377 - (377 * (Math.min(time / 1800, 1))) }}
                    strokeLinecap="round"
                />
            </svg>
            
            <div className="text-center z-10">
                <span className="block text-2xl font-mono font-black tracking-tighter text-slate-900 dark:text-white">{formatTime(time)}</span>
                <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tempo</span>
            </div>
        </div>

        {/* Dynamic Inputs with Sliders */}
        <div className="w-full bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-4">
           <div className="space-y-3">
              {/* Speed Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-blue-500" />
                    <span className="text-[8px] font-black uppercase">Velocidade (KM/H)</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">{speed.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="25" step="0.5" 
                  value={speed} 
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {mode === 'esteira' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span className="text-[8px] font-black uppercase">Inclinação (%)</span>
                    </div>
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">{incline}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="15" step="1" 
                    value={incline} 
                    onChange={(e) => setIncline(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              {mode === 'bicicleta' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Weight className="w-3 h-3 text-blue-500" />
                      <span className="text-[8px] font-black uppercase">Resistência</span>
                    </div>
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">{load}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="20" step="1" 
                    value={load} 
                    onChange={(e) => setLoad(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-white dark:bg-[#121212] rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 mb-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="text-[6px] font-black uppercase tracking-widest">Distância</span>
                </div>
                <span className="text-lg font-mono font-black text-slate-900 dark:text-slate-100">{stats.distance} <span className="text-[7px] text-slate-400 dark:text-slate-500">km</span></span>
            </div>
            <div className="bg-white dark:bg-[#121212] rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 mb-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    <span className="text-[6px] font-black uppercase tracking-widest">Calorias</span>
                </div>
                <span className="text-lg font-mono font-black text-slate-900 dark:text-slate-100">{stats.calories} <span className="text-[7px] text-slate-400 dark:text-slate-500">kcal</span></span>
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-3 bg-white dark:bg-[#121212] border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-full py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all ${
                isActive 
                    ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/20' 
                    : 'bg-blue-600 text-white shadow-lg dark:shadow-none'
            }`}
        >
            {isActive ? 'PONTUALIZAR / PAUSAR' : 'INICIAR TREINO'}
        </button>

        <div className="flex gap-2 pb-2">
            <button 
              onClick={() => handleMediaClick('https://www.netflix.com')}
              className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              NETFLIX
            </button>
            <button 
              onClick={() => handleMediaClick('https://www.youtube.com')}
              className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
            </button>
        </div>
      </div>
    </div>
  );
}

