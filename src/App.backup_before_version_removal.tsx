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
  ExternalLink,
  Menu
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
import ProfileTab from './components/ProfileTab';

import { useAuth } from './components/AuthProvider';
import Login from './components/Login';
import Register from './components/Register';
import { getFirestoreInstance } from './lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';

export default function App() {
  const db = getFirestoreInstance();
  const { user, profile, loading, setProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TREINADOR);
  const [isOpening, setIsOpening] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementEntry[]>([]);
  const [loadHistory, setLoadHistory] = useState<LoadEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Saudações. Eu sou o IronMind Neural. Sou o núcleo de inteligência deste ecossistema. Como posso otimizar sua performance hoje?' }
  ]);
  const [showRegister, setShowRegister] = useState(false);
  const [showConfirmClearTraining, setShowConfirmClearTraining] = useState(false);
  const [showConfirmClearDiet, setShowConfirmClearDiet] = useState(false);
  const [showConfirmClearChat, setShowConfirmClearChat] = useState(false);
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false);
  const [showConfirmHardReset, setShowConfirmHardReset] = useState(false);
  const [isSplitSelectorOpen, setIsSplitSelectorOpen] = useState(false);

  useEffect(() => {
    const localTraining = localStorage.getItem('ironmind_training');
    if (localTraining) {
      try {
        setTrainingPlan(JSON.parse(localTraining));
      } catch (e) {}
    }
    const localDiet = localStorage.getItem('ironmind_diet');
    if (localDiet) {
      try {
        setDietPlan(JSON.parse(localDiet));
      } catch (e) {}
    }
  }, []);

  // Load data from Firestore when user changes
  useEffect(() => {
    if (!user) return;

    const userDoc = doc(db, 'users', user.uid);
    
    // Listen to chat history
    const chatQuery = query(collection(userDoc, 'chats'), orderBy('timestamp', 'asc'), limit(50));
    const unsubChat = onSnapshot(chatQuery, 
      (snap) => {
        const msgs = snap.docs.map(d => ({
          role: d.data().role,
          text: d.data().text,
          proposal: d.data().proposal
        } as ChatMessage));
        if (msgs.length > 0) {
          setChatHistory(msgs);
        } else {
          setChatHistory([
            { role: 'model', text: 'Saudações. Eu sou o IronMind Neural. Sou o núcleo de inteligência deste ecossistema. Como posso otimizar sua performance hoje?' }
          ]);
        }
      },
      (err) => {
        console.warn("Real-time chats listener suspended/disconnected:", err);
      }
    );

    // Load plans and history
    const loadData = async () => {
      const snap = await getDoc(userDoc);
      if (snap.exists()) {
        const data = snap.data();
        if (data.trainingPlan) {
          setTrainingPlan(data.trainingPlan);
          try {
            localStorage.setItem('ironmind_training', JSON.stringify(data.trainingPlan));
          } catch (e) {}
        }
        if (data.dietPlan) {
          setDietPlan(data.dietPlan);
          try {
            localStorage.setItem('ironmind_diet', JSON.stringify(data.dietPlan));
          } catch (e) {}
        }
        if (data.weightHistory) setWeightHistory(data.weightHistory);
        if (data.measurementHistory) setMeasurementHistory(data.measurementHistory);
        if (data.loadHistory) setLoadHistory(data.loadHistory);
      }
    };
    loadData();

    return () => unsubChat();
  }, [user]);

  const talkToIronMindAI = useCallback(async (message: string) => {
    if (!user) return;
    try {
      // Optimistic update
      const userMsg: ChatMessage = { role: 'user', text: message };
      setChatHistory(prev => [...prev, userMsg]);
      
      // Save to Firestore
      const userDoc = doc(db, 'users', user.uid);
      const chatCol = collection(userDoc, 'chats');
      await setDoc(doc(chatCol), { ...userMsg, timestamp: new Date().toISOString() });

      const response = await chatWithCoach(chatHistory, message, profile, user.uid);
      
      // Save response to Firestore
      await setDoc(doc(chatCol), { ...response, timestamp: new Date().toISOString() });
      setChatHistory(prev => [...prev, response]);
    } catch (e) {
      console.error("Handshake Link Error:", e);
    }
  }, [chatHistory, user, profile]);

  // Sync biometrics to Firestore
  useEffect(() => {
    if (!user || weightHistory.length === 0) return;
    const handler = setTimeout(() => {
      updateDoc(doc(db, 'users', user.uid), { weightHistory })
        .catch(err => console.warn("Failsafe: error syncing weight history:", err));
    }, 2000);
    return () => clearTimeout(handler);
  }, [weightHistory, user]);

  useEffect(() => {
    if (!user || measurementHistory.length === 0) return;
    const handler = setTimeout(() => {
      updateDoc(doc(db, 'users', user.uid), { measurementHistory })
        .catch(err => console.warn("Failsafe: error syncing measurement history:", err));
    }, 2000);
    return () => clearTimeout(handler);
  }, [measurementHistory, user]);

  useEffect(() => {
    if (!user || loadHistory.length === 0) return;
    const handler = setTimeout(() => {
      updateDoc(doc(db, 'users', user.uid), { loadHistory })
        .catch(err => console.warn("Failsafe: error syncing load history:", err));
    }, 2000);
    return () => clearTimeout(handler);
  }, [loadHistory, user]);

  useEffect(() => {
    localStorage.removeItem('darkMode');
    document.documentElement.classList.remove('dark');
  }, []);

  // Check for 90 days renewal (90 * 24 * 60 * 60 * 1000)
  useEffect(() => {
    if (!trainingPlan && !dietPlan) return;
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const needsTrainingRenewal = trainingPlan?.createdAt && (now - trainingPlan.createdAt > NINETY_DAYS);
    const needsDietRenewal = dietPlan?.createdAt && (now - dietPlan.createdAt > NINETY_DAYS);

    if (needsTrainingRenewal || needsDietRenewal) {
      setShowRenewalAlert(true);
    }
  }, [trainingPlan, dietPlan]);

  // Session Timer Logic
  useEffect(() => {
    if (isOpening) return;
    
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpening]);

  const handleCloseSplash = useCallback(() => {
    setIsOpening(false);
  }, []);

  const updateTrainingPlan = async (plan: TrainingPlan) => {
    setTrainingPlan(plan);
    try {
      localStorage.setItem('ironmind_training', JSON.stringify(plan));
    } catch (e) {}

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          trainingPlan: plan
        });
      } catch (err) {
        console.error("Erro ao salvar treino no Firestore:", err);
      }
    }
  };

  const updateDietPlan = async (plan: DietPlan) => {
    setDietPlan(plan);
    try {
      localStorage.setItem('ironmind_diet', JSON.stringify(plan));
    } catch (e) {}

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dietPlan: plan
        });
      } catch (err) {
        console.error("Erro ao salvar dieta no Firestore:", err);
      }
    }
  };

  const clearChatHistory = async () => {
    const initialMessage: ChatMessage = { role: 'model', text: 'Saudações. Eu sou o IronMind Neural. Sou o núcleo de inteligência deste ecossistema. Como posso otimizar sua performance hoje?' };
    setChatHistory([initialMessage]);
    
    if (user) {
      try {
        const chatCol = collection(db, 'users', user.uid, 'chats');
        const snap = await getDocs(chatCol);
        const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'users', user.uid, 'chats', docSnap.id)));
        await Promise.all(deletePromises);
      } catch (err) {
        console.warn("Failsafe: error clearing chats in firestore:", err);
      }
    }
    setShowConfirmClearChat(false);
  };

  const formatSessionTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auth Guard
  useEffect(() => {
      console.log("AuthProvider AuthGuard state:", { loading, user: !!user, profile: !!profile });
  }, [loading, user, profile]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black text-sm uppercase tracking-widest">Carregando...</div>;
  if (!user) {
    if (showRegister) return <Register onBack={() => setShowRegister(false)} />;
    return <Login onRegister={() => setShowRegister(true)} />;
  }
  if (!profile) return <Register onBack={() => { localStorage.clear(); window.location.reload(); }} />; 

  const clearTrainingPlan = async () => {
    setTrainingPlan(null);
    localStorage.removeItem('ironmind_training');
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          trainingPlan: null
        });
      } catch (err) {
        console.error("Erro ao limpar treino no Firestore:", err);
      }
    }
    setShowConfirmClearTraining(false);
  };

  const clearDietPlan = async () => {
    setDietPlan(null);
    localStorage.removeItem('ironmind_diet');
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dietPlan: null
        });
      } catch (err) {
        console.error("Erro ao limpar dieta no Firestore:", err);
      }
    }
    setShowConfirmClearDiet(false);
  };

  const clearHistory = async () => {
    setWeightHistory([]);
    setMeasurementHistory([]);
    setLoadHistory([]);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { 
          weightHistory: [], 
          measurementHistory: [], 
          loadHistory: [] 
        });
      } catch (err) {
        console.error("Erro ao limpar histórico no Firestore:", err);
      }
    }
    setShowConfirmClearHistory(false);
  };

  const hardReset = async () => {
    if (user) {
      try {
        // Redefinir documento do usuário para apenas o perfil básico
        await setDoc(doc(db, 'users', user.uid), profile);
        // Deletar subcoleção de chats
        const chatCol = collection(db, 'users', user.uid, 'chats');
        const snap = await getDocs(chatCol);
        const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'users', user.uid, 'chats', docSnap.id)));
        await Promise.all(deletePromises);
      } catch (e) {
        console.error("Hard Reset Error:", e);
      }
    }
    
    // Preserve authentication and settings, only clear data
    const keysToKeep = ['darkMode', 'theme_config', 'user', 'profile'];
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Reset all state to empty
    setTrainingPlan(null);
    setDietPlan(null);
    setChatHistory([]);
    setWeightHistory([]);
    setMeasurementHistory([]);
    setLoadHistory([]);
    
    // Close modal
    setShowConfirmHardReset(false);
  };

  const saveTraining = (plan: TrainingPlan) => {
    console.log("saveTraining called with plan:", plan);
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
    { id: Tab.PERFIL, label: 'Perfil', icon: UserCircle2 },
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

  return (
    <div className={`flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden relative transition-colors duration-300`} style={{ height: '100%', minHeight: '-webkit-fill-available' }}>
      <AnimatePresence>
        {isOpening && (
          <SplashScreen onComplete={handleCloseSplash} />
        )}
      </AnimatePresence>

        {/* Header & Navigation */}
        <div className={`bg-slate-50 border-b border-slate-200 shadow-sm z-20`}>
          <header className={`px-4 py-3 flex justify-between items-center bg-slate-50`}>
            {/* Logo */}
            <div className="group relative flex items-center gap-2 bg-gradient-to-br from-slate-50 via-slate-200 to-slate-400 p-2 px-4 rounded-[2px] border-t border-l border-white border-r border-b border-slate-500 shadow-[2px_2px_0px_#0f172a,inset_1px_1px_1px_white] transition-all overflow-hidden shrink-0 scale-90 origin-left">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20 pointer-events-none"></div>
              <div className="relative w-8 h-8 bg-slate-900 rounded-[1px] flex items-center justify-center shadow-inner text-white shrink-0">
                 <Dumbbell className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none border-l border-slate-400/30 pl-2">
                <h1 className="font-[1000] text-xl uppercase flex items-center justify-center gap-[1px] italic notranslate tracking-[-0.05em]" translate="no">
                   <span className="text-slate-950">Iron</span>
                   <span className="text-blue-700 font-black">Mind</span>
                </h1>
              </div>
            </div>
            
            {/* Timer & Version Info */}
            <div className="flex items-center gap-1.5">
              <div className="px-1.5 py-0.5 rounded-[3px] border bg-slate-900 border-slate-800 text-slate-100 text-[8px] font-mono font-black uppercase tracking-wider shadow-[1px_1px_0px_#475569]">
                v1.0.4-PROD
              </div>
              <div className={`px-2 py-1 rounded-sm border bg-white border-slate-200 flex items-center gap-1 shadow-[1px_1px_0px_#1e293b]`}>
                 <Timer className="w-3 h-3 text-blue-500 animate-pulse" />
                 <span className="text-[10px] font-mono font-black text-slate-700">{formatSessionTime(sessionTime)}</span>
              </div>
            </div>
            
            {/* Hamburger Button */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-slate-800 hover:text-blue-600 transition-colors"
            >
              <Menu className="w-8 h-8" />
            </button>
          </header>
        </div>

        {/* Navigation Sidebar */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              />
              {/* Sidebar */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-[280px] bg-slate-900 z-50 shadow-2xl flex flex-col p-6 text-white"
              >
                 <div className="flex justify-between items-center mb-8">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Menu</span>
                  <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                 </div>

                 {/* User Profile */}
                 <div className="flex items-center gap-4 mb-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                   <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-black text-xl shadow-lg">
                     {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                   </div>
                   <div>
                     <p className="font-bold text-sm tracking-tight">{profile?.name || 'Usuário'}</p>
                     <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Atleta</p>
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-1 flex-1">
                  {tabs.map((tab) => {
                     const Icon = tab.icon;
                     const isActive = activeTab === tab.id;
                     return (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                          className={`flex items-center gap-4 text-[13px] font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all ${
                            isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {tab.label}
                        </button>
                     );
                  })}
                  
                  <div className="h-px bg-slate-800 my-4" />

                  <button 
                    onClick={() => { localStorage.clear(); window.location.reload(); }} 
                    className="flex items-center gap-4 text-[13px] font-bold uppercase tracking-wider py-3 px-4 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
                  >
                    <X className="w-5 h-5" />
                    Sair
                  </button>
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
              className="h-full w-full overflow-hidden flex flex-col relative"
            >
            {activeTab === Tab.TREINADOR && (
              <TreinadorTab 
                history={chatHistory} 
                setHistory={setChatHistory} 
                onAcceptTraining={saveTraining}
                onAcceptDiet={saveDiet}
                onClearChat={() => setShowConfirmClearChat(true)}
                userContext={{
                  profile: profile,
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
                  userProfile={profile}
                  setUserProfile={setProfile}
                  onClearHistory={() => setShowConfirmClearHistory(true)}
                  onClearChat={() => setShowConfirmClearChat(true)}
                  onClearTraining={() => setShowConfirmClearTraining(true)}
                  onClearDiet={() => setShowConfirmClearDiet(true)}
                  onHardReset={() => setShowConfirmHardReset(true)}
                />
              )}
            {activeTab === Tab.PERFIL && (
              <ProfileTab profile={profile} setProfile={setProfile} />
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
                {showConfirmHardReset && 'AVISO: Isso apagará ABSOLUTAMENTE TUDO (Treinos, Dietas, Histórico de Conversas e Medidas). Sua conta continuará logada.'}
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
  console.log("TrainingPlanView rendering, plan:", plan);
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
