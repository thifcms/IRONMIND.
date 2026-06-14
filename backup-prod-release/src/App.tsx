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
import { loadChatHistory, saveChatHistory, chatWithCoach } from './services/geminiService';
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
    try {
        const saved = localStorage.getItem('weightHistory');
        return saved ? JSON.parse(saved) : [
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, weight: 85 },
          { date: Date.now() - 20 * 24 * 60 * 60 * 1000, weight: 84.5 },
          { date: Date.now() - 10 * 24 * 60 * 60 * 1000, weight: 83.2 },
          { date: Date.now(), weight: 82.5 }
        ];
    } catch {
        return [
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, weight: 85 },
          { date: Date.now() - 20 * 24 * 60 * 60 * 1000, weight: 84.5 },
          { date: Date.now() - 10 * 24 * 60 * 60 * 1000, weight: 83.2 },
          { date: Date.now(), weight: 82.5 }
        ];
    }
  });
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementEntry[]>(() => {
    try {
        const saved = localStorage.getItem('measurementHistory');
        return saved ? JSON.parse(saved) : [
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, label: 'Braço', value: 38, unit: 'cm' },
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, label: 'Peito', value: 102, unit: 'cm' },
          { date: Date.now(), label: 'Braço', value: 39.5, unit: 'cm' },
          { date: Date.now(), label: 'Peito', value: 105, unit: 'cm' }
        ];
    } catch {
        return [
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, label: 'Braço', value: 38, unit: 'cm' },
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, label: 'Peito', value: 102, unit: 'cm' },
          { date: Date.now(), label: 'Braço', value: 39.5, unit: 'cm' },
          { date: Date.now(), label: 'Peito', value: 105, unit: 'cm' }
        ];
    }
  });
  const [loadHistory, setLoadHistory] = useState<LoadEntry[]>(() => {
    try {
        const saved = localStorage.getItem('loadHistory');
        return saved ? JSON.parse(saved) : [
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, exercise: 'Supino Reto', weight: 60 },
          { date: Date.now() - 15 * 24 * 60 * 60 * 1000, exercise: 'Supino Reto', weight: 65 },
          { date: Date.now(), exercise: 'Supino Reto', weight: 70 }
        ];
    } catch {
        return [
          { date: Date.now() - 30 * 24 * 60 * 60 * 1000, exercise: 'Supino Reto', weight: 60 },
          { date: Date.now() - 15 * 24 * 60 * 60 * 1000, exercise: 'Supino Reto', weight: 65 },
          { date: Date.now(), exercise: 'Supino Reto', weight: 70 }
        ];
    }
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
        const saved = localStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : { height: 180 };
    } catch {
        return { height: 180 };
    }
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = loadChatHistory();
    return saved.length > 0 ? saved : [
      { role: 'model', text: 'Saudações. Eu sou o IronMind Neural. Sou o núcleo de inteligência deste ecossistema. Como posso otimizar sua performance hoje?' }
    ];
  });

  // Persist chat, plans, and biometrics
  useEffect(() => {
    saveChatHistory(chatHistory);
  }, [chatHistory]);

  const talkToIronMindAI = useCallback(async (message: string) => {
    try {
      const response = await chatWithCoach(chatHistory, message);
      setChatHistory(prev => [...prev, response]);
    } catch (e) {
      console.error("Handshake Link Error:", e);
    }
  }, [chatHistory]);

  useEffect(() => { 
    // Handshake inicial 
    talkToIronMindAI("Estabelecer conexão neural: Agente Integração Alpha Status."); 
  }, []);

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
        const parsed = JSON.parse(savedTraining) as TrainingPlan;
        
        // Safety check: heal duplicate IDs or missing IDs
        if (parsed && Array.isArray(parsed.days)) {
          let modified = false;
          const seenIds = new Set<string>();
          
          parsed.days = parsed.days.map(day => ({
            ...day,
            exercises: (day.exercises || []).map(ex => {
              if (!ex.id || seenIds.has(ex.id)) {
                modified = true;
                const newId = `ex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                seenIds.add(newId);
                return { ...ex, id: newId };
              }
              seenIds.add(ex.id);
              return ex;
            })
          }));

          if (modified) {
            localStorage.setItem('trainingPlan', JSON.stringify(parsed));
          }

          setTrainingPlan(parsed);
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

    // Check for 90 days renewal (90 * 24 * 60 * 60 * 1000)
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const needsTrainingRenewal = savedTraining && JSON.parse(savedTraining).createdAt && (now - JSON.parse(savedTraining).createdAt > NINETY_DAYS);
    const needsDietRenewal = savedDiet && JSON.parse(savedDiet).createdAt && (now - JSON.parse(savedDiet).createdAt > NINETY_DAYS);

    if (needsTrainingRenewal || needsDietRenewal) {
      setShowRenewalAlert(true);
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
  const [showConfirmHardReset, setShowConfirmHardReset] = useState(false);
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

  const hardReset = () => {
    const keysToKeep = ['darkMode', 'theme_config']; // Preserve settings but clear data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
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
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
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
        <header className={`px-4 py-2.5 flex justify-between items-center bg-slate-100 border-slate-200 border-b gap-2`}>
          <div className="flex items-center flex-none">
            {/* 3D Stone Block Logo Container - Refined size for better balance */}
            <div className="group relative flex items-center gap-2 bg-gradient-to-br from-slate-50 via-slate-200 to-slate-400 p-1.5 px-3 rounded-[2px] border-t border-l border-white border-r border-b border-slate-500 shadow-[2px_2px_0px_#0f172a,inset_1px_1px_1px_white] hover:shadow-[3px_3px_0px_#0f172a] transition-all overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20 pointer-events-none"></div>
              <div className="relative w-7 h-7 bg-slate-900 rounded-[1px] flex items-center justify-center shadow-inner text-white shrink-0">
                 <Dumbbell className="w-4 h-4 transform -rotate-12" />
              </div>
              <div className="flex flex-col leading-tight border-l border-slate-400/30 pl-2">
                <h1 className="font-[1000] text-[20px] uppercase flex items-center justify-center gap-[2px] italic notranslate leading-none tracking-[-0.08em]" translate="no">
                   <span className="text-slate-950 [text-shadow:1.5px_1.5px_0px_rgba(255,255,255,0.7),_-1px_-1px_0px_rgba(0,0,0,0.4)]">Iron</span>
                   <span className="text-blue-700 text-[18px] font-black [text-shadow:1px_1px_0px_rgba(255,255,255,0.5),_-1px_-1px_0px_rgba(0,0,0,0.3)]">Mind</span>
                </h1>
                <span className="text-[6px] font-black uppercase tracking-[0.3em] text-slate-700 mt-[2px] leading-none">Strength • Resilience</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center flex-1 min-w-0">
            <div className={`px-3 py-1.5 rounded-xl border-2 bg-white border-slate-200 flex items-center gap-2 shadow-[2px_2px_0px_#1e293b]`}>
               <Timer className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
               <span className={`text-[10px] font-mono font-black text-slate-700`}>{formatSessionTime(sessionTime)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 flex-none">
            <button 
              onClick={() => setActiveTab(Tab.HISTORICO)}
              className={`p-2 rounded-xl border-2 bg-white border-slate-200 text-slate-400 hover:text-blue-600 transition-all active:scale-95 shadow-[2px_2px_0px_#1e293b] shrink-0`}
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
            const threshold = 100;
            const velocityThreshold = 20;
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
                  <p className="text-[10px] opacity-90">Seu protocolo (Treino/Dieta) precisa ser renovado para novos ganhos.</p>
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
                userContext={{
                  profile: userProfile,
                  weight: weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null,
                  measurements: measurementHistory
                }}
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
                  onClearChat={() => setShowConfirmClearChat(true)}
                  onClearTraining={() => setShowConfirmClearTraining(true)}
                  onClearDiet={() => setShowConfirmClearDiet(true)}
                  onHardReset={() => setShowConfirmHardReset(true)}
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
        {(showConfirmClearTraining || showConfirmClearDiet || showConfirmClearChat || showConfirmClearHistory || showConfirmHardReset) && (
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
              <div className={`w-12 h-12 ${showConfirmHardReset ? 'bg-red-50' : 'bg-rose-50'} rounded-2xl flex items-center justify-center mb-4`}>
                <X className={`w-6 h-6 ${showConfirmHardReset ? 'text-red-500' : 'text-rose-500'}`} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2">
                {showConfirmHardReset ? 'LIMPEZA PROFUNDA' : 'Confirmar Exclusão'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase mb-6 leading-relaxed">
                {showConfirmClearTraining && 'Isso apagará seu protocolo de treino atual e todo o histórico de carga associado.'}
                {showConfirmClearDiet && 'Isso apagará seu protocolo de dieta atual.'}
                {showConfirmClearChat && (
                  <span>Isso apagará todo o histórico da conversa com o <span translate="no" className="notranslate">IronMind</span>.</span>
                )}
                {showConfirmClearHistory && 'Isso apagará permanentemente todo o seu histórico de biometria, medidas e cargas.'}
                {showConfirmHardReset && 'AVISO: Isso apagará ABSOLUTAMENTE TUDO (Treinos, Dietas, Histórico e Configurações) e resetará o app para o estado inicial.'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmClearTraining(false);
                    setShowConfirmClearDiet(false);
                    setShowConfirmClearChat(false);
                    setShowConfirmClearHistory(false);
                    setShowConfirmHardReset(false);
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
                    if (showConfirmHardReset) hardReset();
                  }}
                  className={`flex-1 py-3 ${showConfirmHardReset ? 'bg-red-600' : 'bg-rose-600'} text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100`}
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
    // Timer principal para fechar a splash (duração da animação 3D)
    const timer = setTimeout(onComplete, 2600);
    
    // Fallback visual caso algo trave
    const fallbackTimer = setTimeout(() => setShowButton(true), 2700);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950"
      style={{ perspective: 1200 }}
    >
      {/* Brilho de Fundo Cinematográfico */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950 opacity-80" />
      
      <div className="relative flex flex-col items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
        
        {/* LOGO EM 3D */}
        <motion.div
           initial={{ rotateX: 55, rotateZ: -30, y: -40, translateZ: -300, opacity: 0, scale: 0.8 }}
           animate={{ rotateX: 0, rotateZ: 0, y: 0, translateZ: 0, opacity: 1, scale: 1 }}
           transition={{ duration: 1.4, delay: 0.1, ease: [0.25, 1, 0.4, 1] }}
           className="relative flex items-center gap-5 sm:gap-6"
           style={{ transformStyle: "preserve-3d" }}
        >
          {/* O Bloco de Concreto */}
          <motion.div 
            initial={{ translateZ: 80 }}
            animate={{ translateZ: 0 }}
            transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
            className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 border-t-2 border-l-2 border-white border-r-2 border-b-2 border-slate-600 flex items-center justify-center shadow-[15px_15px_30px_rgba(0,0,0,0.8),inset_4px_4px_10px_white] relative rounded-[2px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
            
            {/* O Haltere 'Flutuando' sob o bloco */}
            <motion.div
              initial={{ translateZ: 20 }}
              animate={{ translateZ: [20, -5, 20] }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            >
              <Dumbbell className="w-10 h-10 sm:w-14 sm:h-14 text-slate-900 transform -rotate-12 drop-shadow-[2px_2px_0px_rgba(255,255,255,0.7)]" />
            </motion.div>
            
            {/* Camadas 3D Traseiras */}
            <div className="absolute -inset-0.5 bg-slate-400 translate-x-[2px] translate-y-[2px] -z-10 rounded-[2px]"></div>
            <div className="absolute -inset-0.5 bg-slate-500 translate-x-[4px] translate-y-[4px] -z-20 rounded-[2px]"></div>
            <div className="absolute -inset-0.5 bg-slate-800 translate-x-[6px] translate-y-[6px] -z-30 rounded-[2px] blur-[2px]"></div>
          </motion.div>

          {/* Textos em 3D vindo da lateral */}
          <div className="flex flex-col items-start leading-[0.9]" style={{ transformStyle: "preserve-3d" }}>
            <motion.h1 
              initial={{ x: -40, opacity: 0, translateZ: -100 }}
              animate={{ x: 0, opacity: 1, translateZ: 0 }}
              transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
              className="font-[1000] text-5xl sm:text-7xl uppercase tracking-tighter flex items-center gap-[2px] italic notranslate" translate="no"
            >
               <span className="text-slate-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] [text-shadow:2px_2px_0px_#475569]">Iron</span>
               <span className="text-blue-500 font-black drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] [text-shadow:2px_2px_0px_#1e3a8a,0_0_30px_#2563eb]">Mind</span>
            </motion.h1>
            <motion.span 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
              className="text-[9px] sm:text-[13px] font-black uppercase tracking-[0.55em] text-slate-400 mt-2 ml-1"
            >
              Strength • Resilience
            </motion.span>
          </div>
        </motion.div>

        {/* LOADING BAR (Sync com o timer) - Flutuando e brilhando */}
        <motion.div 
          initial={{ opacity: 0, y: 30, rotateX: -45 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 1.1, duration: 0.6, ease: "easeOut" }}
          className="mt-16 sm:mt-20 w-64 max-w-[80vw] h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5 relative shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
          style={{ transformStyle: "preserve-3d", translateZ: 50 }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, delay: 0.9, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-blue-700 via-blue-400 to-slate-200 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
          />
        </motion.div>

        {/* BOTÃO DE EMERGÊNCIA */}
        <AnimatePresence>
          {showButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={onComplete}
              className="mt-8 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2px] font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all border border-blue-400"
            >
              Iniciar Sistema 
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
