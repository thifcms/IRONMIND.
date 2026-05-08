import React, { useState, useRef } from 'react';
import { DietPlan } from '../types';
import { Clock, CheckCircle2, Camera, Loader2, Info, AlertTriangle } from 'lucide-react';
import { analyzeFoodImage } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function DietTab({ 
  plan, 
  onClearPlan, 
  onRequestNew 
}: { 
  plan: DietPlan;
  onClearPlan: () => void;
  onRequestNew: () => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ food: string, calories: number, color: 'green' | 'yellow' | 'red', explanation: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setAnalysis(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const result = await analyzeFoodImage(base64);
        setAnalysis(result);
      } catch (error) {
        alert("Erro ao analisar a imagem. Tente novamente.");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getIntensityColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-emerald-500';
      case 'yellow': return 'bg-amber-500';
      case 'red': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const getIntensityBg = (color: string) => {
    switch (color) {
      case 'green': return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20';
      case 'yellow': return 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20';
      case 'red': return 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20';
      default: return 'bg-slate-50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800';
    }
  };

  const getIntensityText = (color: string) => {
    switch (color) {
      case 'green': return 'text-emerald-700 dark:text-emerald-400';
      case 'yellow': return 'text-amber-700 dark:text-amber-400';
      case 'red': return 'text-rose-700 dark:text-rose-400';
      default: return 'text-slate-700 dark:text-slate-400';
    }
  };

  return (
    <div className="p-4 pb-20 space-y-4 bg-slate-50 dark:bg-[#0a0a0a] min-h-full transition-colors duration-300">
      <header className="flex flex-col gap-3 bg-white dark:bg-[#121212] p-4 -mx-4 -mt-4 border-b border-slate-200 dark:border-slate-800 mb-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Diet Routine</p>
            <h2 className="text-xl font-[1000] text-slate-900 dark:text-slate-100 tracking-tighter leading-none italic uppercase">{plan.name}</h2>
          </div>
          
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <Info className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 mt-1 w-full">
          <div className="flex gap-1.5 w-full">
             <button 
               onClick={onRequestNew}
               className="flex-1 px-3 py-3 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors border border-slate-200 dark:border-slate-800"
             >
               Novo Protocolo
             </button>
             <button 
               onClick={() => {
                 if(fileInputRef.current) fileInputRef.current.click();
               }}
               className="flex-1 px-3 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2"
             >
               <Camera className="w-3 h-3" /> Scan Refeição
             </button>
          </div>
          <button 
            onClick={onClearPlan}
            className="w-full py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors border border-slate-900 shadow-sm"
          >
            Limpar Protocolo
          </button>
        </div>
      </header>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`border rounded-2xl p-4 relative overflow-hidden ${getIntensityBg(analysis.color)}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${getIntensityColor(analysis.color)}`} />
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Análise de IA de Ingestão</h4>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{analysis.food}</p>
              </div>
              <div className={`${getIntensityColor(analysis.color)} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                ~{analysis.calories} kcal
              </div>
            </div>
            
            <div className="flex items-start gap-2 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-white/50 dark:border-slate-800">
              <Info className={`w-4 h-4 mt-0.5 shrink-0 ${getIntensityText(analysis.color)}`} />
              <p className={`text-[10px] leading-relaxed font-medium ${getIntensityText(analysis.color)}`}>
                {analysis.explanation}
              </p>
            </div>
            
            <button 
              onClick={() => setAnalysis(null)}
              className="absolute top-2 right-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro info if no analysis */}
      {!analysis && !analyzing && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-4 flex gap-3 items-center">
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shrink-0 border dark:border-slate-800">
             <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">Controle de Ingestão Colorida</p>
            <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">Mande uma foto do seu prato para calcular calorias e ver se o alimento está no sinal verde.</p>
          </div>
        </div>
      )}

      <div className="space-y-4 relative before:absolute before:left-[1rem] before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-slate-800 pt-4">
        {plan.meals.map((meal, i) => (
          <div key={i} className="relative pl-8">
            <div className="absolute left-0 top-1 w-8 h-8 bg-blue-600 border-4 border-white dark:border-[#0a0a0a] rounded-full flex items-center justify-center z-10 text-white shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            
            <div className="bg-white dark:bg-[#121212] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight uppercase italic">{meal.name}</h3>
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 px-2 py-0.5 rounded-md uppercase tracking-widest">
                  {meal.time}
                </span>
              </div>
              
              <ul className="space-y-2">
                {meal.items.map((item, j) => (
                  <li key={j} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Camera Button - REMOVED per user request */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
      />
    </div>
  );
}

