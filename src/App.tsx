/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Flame, 
  Play, 
  Utensils, 
  UserCircle2, 
  Music, 
  Timer,
  TrendingUp,
  Heart,
  X,
  ExternalLink
} from 'lucide-react';
import { Tab, TrainingPlan, DietPlan, ChatMessage, WeightEntry, UserProfile, MeasurementEntry, LoadEntry } from './types';
import { loadChatHistory, saveChatHistory } from './services/geminiService';
import TreinadorTab from './components/TreinadorTab';
import TrainingTab from './components/TrainingTab';
import CardioTab from './components/CardioTab';
import DietTab from './components/DietTab';
import MusicTab from './components/MusicTab';
import WarmupTab from './components/WarmupTab';
import VideosTab from './components/VideosTab';
import HistoryTab from './components/HistoryTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TREINADOR);
  const [isOpening, setIsOpening] = useState(true);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
    const saved = localStorage.getItem('weightHistory');
    return saved ? JSON.parse(saved) : [
      { date: Date.now() - 30 * 24 * 60 * 60 * 1000, weight: 85 },
      { date: Date.now() - 20 * 24 * 60 * 60 * 1000, weight: 84.5 },
      { date: Date.now() - 10 * 24 * 60 * 60 * 1000, weight: 83.2 },
      { date: Date.now(), weight: 82.5 }
    ];
  });
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementEntry[]>(() => {
    const saved = localStorage.getItem('measurementHistory');
    return saved ? JSON.parse(saved) : [
      { date: Date.now() - 30 * 24 * 60 * 60 * 1000, label: 'Braço', value: 38, unit: 'cm' },
      { date: Date.now() - 30 * 24 * 60 * 60 * 1000, label: 'Peito', value: 102, unit: 'cm' },
      { date: Date.now(), label: 'Braço', value: 39.5, unit: 'cm' },
      { date: Date.now(), label: 'Peito', value: 105, unit: 'cm' }
    ];
  });
  const [loadHistory, setLoadHistory] = useState<LoadEntry[]>(() => {
    const saved = localStorage.getItem('loadHistory');
    return saved ? JSON.parse(saved) : [
      { date: Date.now() - 30 * 24 * 60 * 60 * 1000, exercise: 'Supino Reto', weight: 60 },
      { date: Date.now() - 15 * 24 * 60 * 60 * 1000, exercise: 'Supino Reto', weight: 65 },
      { date: Date.now(), exercise: 'Supino Reto', weight: 70 }
    ];
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { height: 180 };
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = loadChatHistory();
    return saved.length > 0 ? saved : [
      { role: 'model', text: 'Olá! Sou o IronMind, seu treinador pessoal. Como posso te ajudar hoje? Quer montar um treino novo ou uma dieta?' }
    ];
  });

  // Persist chat, plans, and biometrics
  useEffect(() => {
    saveChatHistory(chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('weightHistory', JSON.stringify(weightHistory));
  }, [weightHistory]);

  useEffect(() => {
    localStorage.setItem('measurementHistory', JSON.stringify(measurementHistory));
  }, [measurementHistory]);

  useEffect(() => {
    localStorage.setItem('loadHistory', JSON.stringify(loadHistory));
  }, [loadHistory]);

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.removeItem('darkMode');
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const savedTraining = localStorage.getItem('trainingPlan');
    const savedDiet = localStorage.getItem('dietPlan');
    
    if (savedTraining) {
      try {
        const parsed = JSON.parse(savedTraining);
        // Safety check: new structure uses 'days', old used 'exercises' in root
        if (parsed && Array.isArray(parsed.days)) {
          setTrainingPlan(parsed);
          
          // Check for 90 days (90 * 24 * 60 * 60 * 1000)
          const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
          if (parsed.createdAt && (Date.now() - parsed.createdAt > NINETY_DAYS)) {
            setShowRenewalAlert(true);
          }
        } else {
          console.warn("Legacy training plan detected, clearing for safety.");
          localStorage.removeItem('trainingPlan');
        }
      } catch (e) {
        localStorage.removeItem('trainingPlan');
      }
    }
    
    if (savedDiet) {
      try {
        setDietPlan(JSON.parse(savedDiet));
      } catch (e) {
        localStorage.removeItem('dietPlan');
      }
    }
  }, []);

  // Session Timer Logic
  useEffect(() => {
    if (isOpening) return;
    
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpening]);

  const formatSessionTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateTrainingPlan = (plan: TrainingPlan) => {
    setTrainingPlan(plan);
    localStorage.setItem('trainingPlan', JSON.stringify(plan));
  };

  const [showConfirmClearTraining, setShowConfirmClearTraining] = useState(false);
  const [showConfirmClearDiet, setShowConfirmClearDiet] = useState(false);
  const [showConfirmClearChat, setShowConfirmClearChat] = useState(false);
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false);
  const [isSplitSelectorOpen, setIsSplitSelectorOpen] = useState(false);

  const clearTrainingPlan = () => {
    setTrainingPlan(null);
    localStorage.removeItem('trainingPlan');
    setShowConfirmClearTraining(false);
  };

  const clearDietPlan = () => {
    setDietPlan(null);
    localStorage.removeItem('dietPlan');
    setShowConfirmClearDiet(false);
  };

  const clearChatHistory = () => {
    const initialMessage: ChatMessage = { role: 'model', text: 'Olá! Sou o IronMind, seu treinador pessoal. Como posso te ajudar hoje? Quer montar um treino novo ou uma dieta?' };
    setChatHistory([initialMessage]);
    localStorage.removeItem('ironmind_chat_history');
    setShowConfirmClearChat(false);
  };

  const clearHistory = () => {
    setWeightHistory([]);
    setMeasurementHistory([]);
    setLoadHistory([]);
    localStorage.removeItem('weightHistory');
    localStorage.removeItem('measurementHistory');
    localStorage.removeItem('loadHistory');
    setShowConfirmClearHistory(false);
  };

  const updateDietPlan = (plan: DietPlan) => {
    setDietPlan(plan);
    localStorage.setItem('dietPlan', JSON.stringify(plan));
  };

  const saveTraining = (plan: TrainingPlan) => {
    updateTrainingPlan(plan);
    setActiveTab(Tab.TREINO);
  };

  const saveDiet = (plan: DietPlan) => {
    updateDietPlan(plan);
    setActiveTab(Tab.DIETA);
  };

  const buildManualTraining = (split: string) => {
    const daysCount = split === 'AB' ? 2 : split === 'ABC' ? 3 : split === 'ABCD' ? 4 : 5;
    const days = Array.from({ length: daysCount }, (_, i) => ({
      label: `Treino ${String.fromCharCode(65 + i)}`,
      exercises: []
    }));

    const manualPlan: TrainingPlan = {
      id: crypto.randomUUID(),
      name: `Treino Manual (${split})`,
      description: `Plano ${split} montado manualmente pelo usuário.`,
      createdAt: Date.now(),
      days: days
    };
    updateTrainingPlan(manualPlan);
    setActiveTab(Tab.TREINO);
    setIsSplitSelectorOpen(false);
  };

  const tabs = [
    { id: Tab.TREINADOR, label: 'Treinador', icon: UserCircle2 },
    { id: Tab.AQUECIMENTO, label: 'Aquec.', icon: Timer },
    { id: Tab.TREINO, label: 'Treino', icon: Dumbbell },
    { id: Tab.VIDEOS, label: 'Vídeos', icon: Play },
    { id: Tab.CARDIO, label: 'Cardio', icon: Heart },
    { id: Tab.DIETA, label: 'Dieta', icon: Utensils },
    { id: Tab.SOM, label: 'Som', icon: Music },
    { id: Tab.HISTORICO, label: 'Hist.', icon: TrendingUp },
  ];

  const handleSwipe = (direction: 'left' | 'right') => {
    // Para navegação por swipe, ignoramos o histórico se estivermos lá ou se for o destino,
    // ou deixamos fluir naturalmente se for o último? 
    // Vamos permitir navegar para fora de qualquer aba.
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    } else if (direction === 'right' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const handleCloseSplash = useCallback(() => {
    setIsOpening(false);
  }, []);

  return (
    <div className={`flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative transition-colors duration-300`}>
      <AnimatePresence>
        {isOpening && (
          <SplashScreen onComplete={handleCloseSplash} />
        )}
      </AnimatePresence>

      {/* Header & Navigation */}
      <div className={`bg-white border-slate-200 border-b shadow-sm z-20`}>
        <header className={`px-4 py-2.5 flex justify-between items-center bg-slate-100 border-slate-200 border-b`}>
          <div className="flex items-center gap-4">
            {/* 3D Stone Block Logo Container - Refined size for better balance */}
            <div className={`group relative flex items-center gap-3.5 from-slate-200 to-slate-400 shadow-[4px_4px_0px_#475569] bg-gradient-to-br p-2 px-6 rounded-sm transform transition-all hover:translate-y-0.5 hover:translate-x-0.5 border border-slate-300 overflow-hidden`}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20 pointer-events-none"></div>
              <div className="relative w-8 h-8 bg-slate-900 rounded-px flex items-center justify-center shadow-inner text-white">
                 <Dumbbell className="w-5 h-5 transform -rotate-12" />
              </div>
              <div className="flex flex-col leading-none">
                <h1 className="font-[1000] text-2xl uppercase tracking-tighter flex items-center italic notranslate" translate="no">
                   <span className="text-slate-900 drop-shadow-sm">Iron</span>
                   <span className="text-blue-700 font-black drop-shadow-sm">Mind</span>
                </h1>
                <span className="text-[8px] font-black uppercase tracking-[0.35em] text-slate-800 -mt-0.5">Strength • Resilience</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className={`px-3 py-1.5 rounded-xl border-2 bg-white border-slate-200 flex items-center gap-2 shadow-[2px_2px_0px_#1e293b]`}>
               <Timer className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
               <span className={`text-[10px] font-mono font-black text-slate-700`}>{formatSessionTime(sessionTime)}</span>
            </div>
            <button 
              onClick={() => setActiveTab(Tab.HISTORICO)}
              className={`p-2 rounded-xl border-2 bg-white border-slate-200 text-slate-400 hover:text-blue-600 transition-all active:scale-95 shadow-[2px_2px_0px_#1e293b]`}
              title="Ver Dashboard"
            >
              <TrendingUp className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        <nav className="flex justify-between items-center px-0.5 pb-1">
          {tabs.filter(t => t.id !== Tab.HISTORICO).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 transition-all relative rounded-lg flex-1 min-w-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[7px] uppercase font-[1000] tracking-tighter truncate w-full text-center px-0.25">{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-active-bar"
                    className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-slate-50">
        <motion.div 
          className="h-full w-full relative flex flex-col overflow-hidden"
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => {
            const threshold = 50;
            const velocityThreshold = 10;
            if (info.offset.x > threshold && info.velocity.x > velocityThreshold) handleSwipe('right');
            else if (info.offset.x < -threshold && info.velocity.x < -velocityThreshold) handleSwipe('left');
          }}
        >
          <AnimatePresence>
            {showRenewalAlert && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between border border-blue-400"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-[11px] uppercase tracking-wider">Ciclo de 90 dias atingido!</p>
                  <p className="text-[10px] opacity-90">Seu treino precisa ser renovado para novos ganhos.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setActiveTab(Tab.TREINADOR);
                    setShowRenewalAlert(false);
                  }}
                  className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                >
                  Falar com Treinador
                </button>
                <button onClick={() => setShowRenewalAlert(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="h-full overflow-y-auto touch-pan-y"
            >
            {activeTab === Tab.TREINADOR && (
              <TreinadorTab 
                history={chatHistory} 
                setHistory={setChatHistory} 
                onAcceptTraining={saveTraining}
                onAcceptDiet={saveDiet}
                onClearChat={() => setShowConfirmClearChat(true)}
              />
            )}
            {activeTab === Tab.AQUECIMENTO && <WarmupTab />}
            {activeTab === Tab.TREINO && (
              <TrainingPlanView 
                plan={trainingPlan} 
                setActiveTab={setActiveTab} 
                onUpdatePlan={updateTrainingPlan} 
                onClearPlan={() => setShowConfirmClearTraining(true)} 
                onOpenSplitSelector={() => setIsSplitSelectorOpen(true)}
              />
            )}
            {activeTab === Tab.VIDEOS && (
              trainingPlan ? <VideosTab plan={trainingPlan} /> : <EmptyState type="vídeos" onClick={() => setActiveTab(Tab.TREINADOR)} />
            )}
            {activeTab === Tab.CARDIO && <CardioTab />}
            {activeTab === Tab.DIETA && <DietPlanView plan={dietPlan} setActiveTab={setActiveTab} onUpdatePlan={updateDietPlan} onClearPlan={() => setShowConfirmClearDiet(true)} />}
            {activeTab === Tab.SOM && <MusicTab />}
            {activeTab === Tab.HISTORICO && (
                <HistoryTab 
                  weightHistory={weightHistory} 
                  setWeightHistory={setWeightHistory} 
                  measurementHistory={measurementHistory}
                  setMeasurementHistory={setMeasurementHistory}
                  loadHistory={loadHistory}
                  setLoadHistory={setLoadHistory}
                  userProfile={userProfile}
                  setUserProfile={setUserProfile}
                  onClearHistory={() => setShowConfirmClearHistory(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Split Selector Modal */}
      <AnimatePresence>
        {isSplitSelectorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-[1000] text-slate-900 uppercase tracking-tighter italic leading-none">Divisão de Treino</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">Escolha como quer dividir sua semana</p>
                </div>
                <button 
                  onClick={() => setIsSplitSelectorOpen(false)}
                  className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {['AB', 'ABC', 'ABCD', 'ABCDE'].map((split) => (
                  <button
                    key={split}
                    onClick={() => buildManualTraining(split)}
                    className="w-full p-4 bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 group-hover:border-blue-500">
                        <Dumbbell className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-lg font-black tracking-tight">{split}</h4>
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                          {split === 'AB' && '2 Dias • Iniciante'}
                          {split === 'ABC' && '3 Dias • Intermediário'}
                          {split === 'ABCD' && '4 Dias • Avançado'}
                          {split === 'ABCDE' && '5 Dias • Bodybuilder'}
                        </p>
                      </div>
                    </div>
                    <Flame className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsSplitSelectorOpen(false)}
                className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {(showConfirmClearTraining || showConfirmClearDiet || showConfirmClearChat || showConfirmClearHistory) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase mb-6 leading-relaxed">
                {showConfirmClearTraining && 'Isso apagará seu protocolo de treino atual e todo o histórico de carga associado.'}
                {showConfirmClearDiet && 'Isso apagará seu protocolo de dieta atual.'}
                {showConfirmClearChat && (
                  <span>Isso apagará todo o histórico da conversa com o <span translate="no" className="notranslate">IronMind</span>.</span>
                )}
                {showConfirmClearHistory && 'Isso apagará permanentemente todo o seu histórico de biometria, medidas e cargas.'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmClearTraining(false);
                    setShowConfirmClearDiet(false);
                    setShowConfirmClearChat(false);
                    setShowConfirmClearHistory(false);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (showConfirmClearTraining) clearTrainingPlan();
                    if (showConfirmClearDiet) clearDietPlan();
                    if (showConfirmClearChat) clearChatHistory();
                    if (showConfirmClearHistory) clearHistory();
                  }}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrainingPlanView({ plan, setActiveTab, onUpdatePlan, onClearPlan, onOpenSplitSelector }: { plan: TrainingPlan | null, setActiveTab: (t: Tab) => void, onUpdatePlan: (p: TrainingPlan) => void, onClearPlan: () => void, onOpenSplitSelector: () => void }) {
  if (!plan) return <EmptyState type="treino" onClick={() => setActiveTab(Tab.TREINADOR)} onManualBuild={onOpenSplitSelector} />;
  return <TrainingTab plan={plan} onUpdatePlan={onUpdatePlan} onClearPlan={onClearPlan} onOpenSplitSelector={onOpenSplitSelector} />;
}

function DietPlanView({ plan, setActiveTab, onUpdatePlan, onClearPlan }: { plan: DietPlan | null, setActiveTab: (t: Tab) => void, onUpdatePlan: (p: DietPlan) => void, onClearPlan: () => void }) {
  return <DietTab plan={plan} onClearPlan={onClearPlan} onRequestNew={() => setActiveTab(Tab.TREINADOR)} />;
}

function EmptyState({ type, onClick, onManualBuild }: { type: string, onClick: () => void, onManualBuild?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800">
        <Dumbbell className="w-8 h-8 text-slate-600" />
      </div>
      <h2 className="text-base font-bold text-slate-800 mb-1 leading-none uppercase">Sem {type}</h2>
      <p className="text-slate-500 mb-6 text-[11px] max-w-[200px]">
        {type === 'treino' 
          ? 'Escolha uma das opções abaixo para começar sua jornada.' 
          : `Peça ao Treinador para gerar seu ${type} agora.`}
      </p>
      
      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <button 
          onClick={onClick}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md shadow-blue-100 flex items-center justify-center gap-2"
        >
          Ir para Treinador
        </button>

        {type === 'treino' && onManualBuild && (
          <button 
            onClick={onManualBuild}
            className="w-full px-6 py-3 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm border border-slate-200 flex items-center justify-center gap-2"
          >
            Monte seu Treino
          </button>
        )}
      </div>
    </div>
  );
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Timer principal para fechar (impacto mais ágil)
    const timer = setTimeout(onComplete, 1600);
    
    // Fallback visual caso algo trave
    const fallbackTimer = setTimeout(() => setShowButton(true), 1000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
    >
      {/* Brilho Azulado de Fundo (Combinando com o Azul do Plano de Treino) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/20 blur-[100px] rounded-full" />
      
      <div className="relative flex flex-col items-center">
        {/* LOGO BOX - Inclinada e Sombreada */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: "backOut" }}
          className="relative mb-10"
        >
          {/* O Quadrado do Logo (Cores do seu App) */}
          <div className="w-28 h-28 bg-slate-200 rounded-none flex items-center justify-center shadow-[12px_12px_0px_#2563eb] border-2 border-white/10 relative">
            <Dumbbell className="w-14 h-14 text-slate-900 transform -rotate-12" />
          </div>
        </motion.div>

        {/* TEXTO IRONMIND */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="font-[1000] text-6xl uppercase tracking-tighter italic text-white leading-none notranslate" translate="no">
            IRON<span className="text-blue-500">MIND</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mt-3">
            EST. 2026 • ELITE TREINADOR
          </p>
        </motion.div>

        {/* LOADING BAR (Sync com o timer) */}
        <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "linear" }}
            className="h-full bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
          />
        </div>

        {/* BOTÃO DE EMERGÊNCIA (Aparece se demorar mais que o esperado) */}
        <AnimatePresence>
          {showButton && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onComplete}
              className="mt-10 px-6 py-2 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[9px] shadow-lg active:scale-95 transition-transform"
            >
              Entrar Agora
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

