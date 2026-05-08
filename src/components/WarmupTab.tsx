import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, Wind, RotateCcw, Play, Pause } from 'lucide-react';

export default function WarmupTab() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((300 - timeLeft) / 300) * 100;

  return (
    <div className="p-4 pb-16 space-y-4 h-full flex flex-col bg-slate-50 transition-colors duration-300">
      <div className="space-y-3">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Início</p>
          <h2 className="text-2xl font-[1000] text-slate-900 tracking-tighter uppercase italic">Aquecimento</h2>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[8px] font-black uppercase text-blue-600">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
          <Wind className="w-6 h-6 text-blue-500" />
        </div>
        <div className="text-5xl font-bold font-mono text-blue-600 tracking-tighter">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { setTimeLeft(300); setIsActive(false); }} className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-100">
          <RotateCcw className="w-4 h-4" />
          <span>Reiniciar</span>
        </button>
        <button onClick={() => setIsActive(!isActive)} className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md uppercase tracking-widest ${isActive ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white shadow-blue-100'}`}>
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isActive ? 'Pausar' : 'Iniciar'}</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3 items-center">
        <Zap className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-[10px] text-blue-800 leading-tight font-medium italic">
          O aquecimento previne lesões. Não pule!
        </p>
      </div>
    </div>
  );
}

