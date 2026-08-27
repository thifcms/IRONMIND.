/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Fingerprint, 
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
  Menu,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Cpu,
  HeartPulse,
  ClipboardCheck,
  Droplets
} from 'lucide-react';
import { Tab, TrainingPlan, DietPlan, ChatMessage, WeightEntry, UserProfile, MeasurementEntry, LoadEntry, CheckinEntry, CardioSession, AppProfile } from './types';
import { loadChatHistory, saveChatHistory, chatWithCoach } from './services/geminiService';
import { safeLocalStorageSet } from './lib/safeStorage';
import { recordActivity } from './lib/streak';
import WorkoutCompleteModal, { diffNewAchievements } from './components/WorkoutCompleteModal';
const PoseRepCounter = lazy(() => import('./components/PoseRepCounter'));
import type { Achievement } from './lib/streak';
import TreinadorTab from './components/TreinadorTab';
import TrainingTab from './components/TrainingTab';
import WarmupTab from './components/WarmupTab';
import CardioTab from './components/CardioTab';
import MediaQuickLaunch from './components/MediaQuickLaunch';
import DietTab from './components/DietTab';
import MusicTab from './components/MusicTab';
import VideosTab from './components/VideosTab';
import HistoryTab from './components/HistoryTab';
import CheckinTab from './components/CheckinTab';
import WaterTab from './components/WaterTab';
import ProfileTab from './components/ProfileTab';

import { useAuth } from './components/AuthProvider';
import Login from './components/Login';
import Register from './components/Register';
import BiometricLock from './components/BiometricLock';
import { isBiometricEnabledOnThisDevice, isBiometricAvailable, registerBiometric, getLocalBiometricUserId } from './services/biometricAuth';
import { getFirestoreInstance, auth } from './lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function App() {
  const db = getFirestoreInstance();
  const { user, profile, loading, setProfile } = useAuth();
  const [workoutCompleteInfo, setWorkoutCompleteInfo] = useState<{ dayLabel: string; exerciseCount: number; streakCount: number; newAchievements: Achievement[] } | null>(null);
  const [showPlanChoice, setShowPlanChoice] = useState(false);
  const [showBiometricOffer, setShowBiometricOffer] = useState(false);
  const [biometricOfferLoading, setBiometricOfferLoading] = useState(false);
  const biometricOfferCheckedRef = useRef(false);
  const [showPoseCounter, setShowPoseCounter] = useState(false);

  const handleWorkoutComplete = useCallback((dayLabel: string, exerciseCount: number) => {
    setProfile((prev) => {
      const before = prev || {};
      const { streak: newStreak, isNewDay } = recordActivity(before.streak);
      const newTotal = (before.totalWorkoutsCompleted || 0) + (isNewDay ? 1 : 0);
      const after = { ...before, streak: newStreak, totalWorkoutsCompleted: newTotal };

      // Só mostra a tela de celebração se for realmente uma atividade nova
      // hoje (evita popup repetido se a pessoa re-renderiza/revisita a
      // mesma sessão já concluída).
      if (isNewDay) {
        const newAchievements = diffNewAchievements(
          { streak: before.streak, totalWorkoutsCompleted: before.totalWorkoutsCompleted },
          { streak: after.streak, totalWorkoutsCompleted: after.totalWorkoutsCompleted }
        );
        setWorkoutCompleteInfo({ dayLabel, exerciseCount, streakCount: newStreak.count, newAchievements });
      }

      return after;
    });
  }, [setProfile]);

  /**
   * Salva a sessão de cardio livre (aba Cardio -> Clássico) no
   * histórico -- antes disso, terminar uma corrida/esteira/bike não
   * deixava rastro nenhum. Conta pra sequência de dias igual um
   * treino de plano normal (handleWorkoutComplete).
   */
  const handleCardioSessionComplete = useCallback((session: { type: 'corrida' | 'esteira' | 'bicicleta'; distance: number; time: number; calories: number }) => {
    setCardioSessionHistory(prev => [...prev, { ...session, date: Date.now() }]);
    const modeLabel = session.type === 'corrida' ? 'Corrida' : session.type === 'esteira' ? 'Esteira' : 'Bicicleta';
    handleWorkoutComplete(`Cardio (${modeLabel})`, 1);
  }, [handleWorkoutComplete]);

  const [biometricLocked, setBiometricLocked] = useState(() => isBiometricEnabledOnThisDevice());
  const [skipPreLoginBiometric, setSkipPreLoginBiometric] = useState(false);
  const [aquecimentoSubTab, setAquecimentoSubTab] = useState<'classico' | 'sugestao'>('classico');
  const [cardioSubTab, setCardioSubTab] = useState<'classico' | 'sugestao'>('classico');

  // Fecha o visor flutuante (PiP) sozinho sempre que o IronMind deixa de
  // estar em primeiro plano (saiu pra outro app) ou volta a estar — em
  // nível de app inteiro, pra funcionar mesmo se a pessoa trocar de aba
  // enquanto estava fora.
  useEffect(() => {
    const closeIfPiP = () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', closeIfPiP);
    return () => document.removeEventListener('visibilitychange', closeIfPiP);
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TREINADOR);
  const [bodyDietBannerDismissed, setBodyDietBannerDismissed] = useState(() => localStorage.getItem('ironmind_bodydiet_banner_dismissed') === 'true');
  const [isOpening, setIsOpening] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(() => {
    try {
      const saved = localStorage.getItem('ironmind_training');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [warmupPlan, setWarmupPlan] = useState<TrainingPlan | null>(() => {
    try {
      const saved = localStorage.getItem('ironmind_warmup');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cardioPlan, setCardioPlan] = useState<TrainingPlan | null>(() => {
    try {
      const saved = localStorage.getItem('ironmind_cardio');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(() => {
    try {
      const saved = localStorage.getItem('ironmind_diet');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [sessionTime, setSessionTime] = useState(0);
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [checkinHistory, setCheckinHistory] = useState<CheckinEntry[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementEntry[]>([]);
  const [loadHistory, setLoadHistory] = useState<LoadEntry[]>([]);
  const [cardioSessionHistory, setCardioSessionHistory] = useState<CardioSession[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ironmind_chat');
      return saved ? JSON.parse(saved) : [
        { role: 'model', text: 'Saudações. Eu sou o IronMind Neural. Sou o núcleo de inteligência deste ecossistema. Como posso otimizar sua performance hoje?' }
      ];
    } catch {
      return [
        { role: 'model', text: 'Saudações. Eu sou o IronMind Neural. Sou o núcleo de inteligência deste ecossistema. Como posso otimizar sua performance hoje?' }
      ];
    }
  });
  const [showRegister, setShowRegister] = useState(false);
  const [showConfirmClearTraining, setShowConfirmClearTraining] = useState(false);
  const [showConfirmClearWarmup, setShowConfirmClearWarmup] = useState(false);
  const [showConfirmClearCardio, setShowConfirmClearCardio] = useState(false);
  const [showConfirmClearDiet, setShowConfirmClearDiet] = useState(false);
  const [showConfirmClearChat, setShowConfirmClearChat] = useState(false);
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false);
  const [showConfirmHardReset, setShowConfirmHardReset] = useState(false);
  const [isSplitSelectorOpen, setIsSplitSelectorOpen] = useState(false);

  useEffect(() => {
    // Redundant because of useState initializer, but keeping for session stats if needed
    // or just remove if only used for plans
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
              safeLocalStorageSet('ironmind_chat', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Load data from Firestore when user changes
  useEffect(() => {
    if (!user) return;

    const userDoc = doc(db, 'users', user.uid);
    
    // Listen to chat history -- pega as ULTIMAS (mais recentes) mensagens,
    // não as primeiras. orderBy(desc) + limit, depois inverte pra ordem
    // cronológica. Antes usava orderBy(asc) + limit, que travava nas 50
    // mensagens MAIS ANTIGAS pra sempre (o treinador nunca via nada novo
    // depois de passar de 50 mensagens no total).
    const chatQuery = query(collection(userDoc, 'chats'), orderBy('timestamp', 'desc'), limit(50));
    const unsubChat = onSnapshot(chatQuery, 
      (snap) => {
        const msgs = snap.docs.map(d => ({
          role: d.data().role,
          text: d.data().text,
          proposal: d.data().proposal
        } as ChatMessage)).reverse();
        if (msgs.length > 0) {
          setChatHistory(msgs);
        } else {
          // Antes disso, um Firestore vazio (mesmo que só temporariamente,
          // ou por uma gravação anterior ter falhado silenciosamente)
          // resetava a conversa pra saudação inicial na hora -- perdendo
          // o que só estava salvo localmente. Agora só reseta se
          // realmente não sobrar nada nem no cache local também.
          try {
            const cached = localStorage.getItem('ironmind_chat');
            const cachedMsgs = cached ? JSON.parse(cached) : [];
            if (Array.isArray(cachedMsgs) && cachedMsgs.length > 0) {
              setChatHistory(cachedMsgs);
              return;
            }
          } catch {
            // cache corrompido/inexistente -- segue pro fallback normal
          }
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
                      safeLocalStorageSet('ironmind_training', JSON.stringify(data.trainingPlan));
        }
        if (data.warmupPlan) {
          setWarmupPlan(data.warmupPlan);
                      safeLocalStorageSet('ironmind_warmup', JSON.stringify(data.warmupPlan));
        }
        if (data.cardioPlan) {
          setCardioPlan(data.cardioPlan);
                      safeLocalStorageSet('ironmind_cardio', JSON.stringify(data.cardioPlan));
        }
        if (data.dietPlan) {
          setDietPlan(data.dietPlan);
                      safeLocalStorageSet('ironmind_diet', JSON.stringify(data.dietPlan));
        }
        if (data.weightHistory) setWeightHistory(data.weightHistory);
        if (data.checkinHistory) setCheckinHistory(data.checkinHistory);
        if (data.measurementHistory) setMeasurementHistory(data.measurementHistory);
        if (data.loadHistory) setLoadHistory(data.loadHistory);
        if (data.cardioSessionHistory) setCardioSessionHistory(data.cardioSessionHistory);
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

      const response = await chatWithCoach(chatHistory, message, { ...profile, checkinHistory }, user.uid);
      
      // Save response to Firestore
      await setDoc(doc(chatCol), { ...response, timestamp: new Date().toISOString() });
      setChatHistory(prev => [...prev, response]);
    } catch (e) {
      console.error("Handshake Link Error -- falha ao conversar ou salvar mensagem no Firestore:", e);
    }
  }, [chatHistory, user, profile, checkinHistory]);

  const handleAddCheckin = useCallback((entry: CheckinEntry) => {
    setCheckinHistory(prev => [...prev, entry]);
  }, []);

  const handleSetTodayWaterCount = useCallback((count: number) => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // lastWaterLogAt: usado pelo lembrete "faz tempo que você não bebe
    // água" -- sem isso só sabíamos o total do dia, não HÁ QUANTAS HORAS
    // desde o último copo registrado.
    setProfile({ ...profile, waterIntake: { ...(profile?.waterIntake || {}), [key]: count }, lastWaterLogAt: Date.now() });
  }, [profile, setProfile]);

  const ADESAO_LABEL: Record<string, string> = { facil: 'fácil', medio: 'média', dificil: 'difícil' };

  const handleAskCoachToAdjust = useCallback((entry: CheckinEntry) => {
    const partes = [
      `Fiz meu check-in semanal. Adesão ao treino: ${ADESAO_LABEL[entry.adesaoTreino]}. Adesão à dieta: ${ADESAO_LABEL[entry.adesaoDieta]}. Nível de energia: ${entry.energia}/5.`,
      entry.peso ? `Peso atual: ${entry.peso}kg.` : '',
      entry.dorOuDificuldade ? `Dor/dificuldade relatada: ${entry.dorOuDificuldade}.` : '',
      entry.observacoes ? `Observações: ${entry.observacoes}.` : '',
      'Com base nisso, ajusta meu próximo treino e/ou dieta -- explica rapidamente o que vai mudar e por quê.',
    ].filter(Boolean);
    setActiveTab(Tab.TREINADOR);
    talkToIronMindAI(partes.join(' '));
  }, [talkToIronMindAI]);

  // Sync biometrics to Firestore
  useEffect(() => {
    if (!user || weightHistory.length === 0) return;
    const handler = setTimeout(() => {
      updateDoc(doc(db, 'users', user.uid), { weightHistory })
        .catch(err => console.warn("Failsafe: error syncing weight history:", err));
    }, 2000);
    return () => clearTimeout(handler);
  }, [weightHistory, user]);

  // Sync check-ins semanais para o Firestore
  useEffect(() => {
    if (!user || checkinHistory.length === 0) return;
    const handler = setTimeout(() => {
      updateDoc(doc(db, 'users', user.uid), { checkinHistory })
        .catch(err => console.warn("Failsafe: error syncing checkin history:", err));
    }, 2000);
    return () => clearTimeout(handler);
  }, [checkinHistory, user]);

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
    if (!user || cardioSessionHistory.length === 0) return;
    const handler = setTimeout(() => {
      updateDoc(doc(db, 'users', user.uid), { cardioSessionHistory })
        .catch(err => console.warn("Failsafe: error syncing cardio session history:", err));
    }, 2000);
    return () => clearTimeout(handler);
  }, [cardioSessionHistory, user]);

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
          safeLocalStorageSet('ironmind_training', JSON.stringify(plan));

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

  const updateWarmupPlan = async (plan: TrainingPlan) => {
    setWarmupPlan(plan);
          safeLocalStorageSet('ironmind_warmup', JSON.stringify(plan));

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          warmupPlan: plan
        });
      } catch (err) {
        console.error("Erro ao salvar aquecimento no Firestore:", err);
      }
    }
  };

  const updateCardioPlan = async (plan: TrainingPlan) => {
    setCardioPlan(plan);
          safeLocalStorageSet('ironmind_cardio', JSON.stringify(plan));

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          cardioPlan: plan
        });
      } catch (err) {
        console.error("Erro ao salvar cardio no Firestore:", err);
      }
    }
  };

  const updateDietPlan = async (plan: DietPlan) => {
    setDietPlan(plan);
          safeLocalStorageSet('ironmind_diet', JSON.stringify(plan));

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
    safeLocalStorageSet('ironmind_chat', JSON.stringify([initialMessage]));
    
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

  // Oferece ativar a biometria logo depois de logar com senha (se o
  // aparelho suportar e ainda não estiver ativada) -- antes só dava pra
  // ativar indo no Perfil manualmente. Só checa/oferece UMA vez por
  // sessão (o ref evita perguntar de novo a cada re-render), e nunca
  // interrompe quem já está com a trava biométrica ativa (isso já é
  // outro fluxo, não faz sentido oferecer de novo nesse caso).
  useEffect(() => {
    if (!user || !profile || biometricLocked || biometricOfferCheckedRef.current) return;
    biometricOfferCheckedRef.current = true;
    if (isBiometricEnabledOnThisDevice()) return;

    isBiometricAvailable().then(available => {
      if (available) setShowBiometricOffer(true);
    });
  }, [user, profile, biometricLocked]);

  const handleAcceptBiometricOffer = async () => {
    if (!user) return;
    setBiometricOfferLoading(true);
    try {
      await registerBiometric(user.uid, profile?.email || user.email || '');
    } catch (e) {
      console.warn('Falha ao ativar biometria pelo convite pós-login:', e);
    } finally {
      setBiometricOfferLoading(false);
      setShowBiometricOffer(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black text-sm uppercase tracking-widest">Carregando...</div>;
  if (!user) {
    if (showRegister) return <Register onBack={() => setShowRegister(false)} />;
    // Se a biometria já estiver configurada neste aparelho (pra algum
    // usuário), oferece ela ANTES da tela de senha -- é assim que a
    // maioria dos apps do mercado funciona: a biometria substitui o
    // login, não é só um extra depois dele.
    if (!skipPreLoginBiometric && isBiometricEnabledOnThisDevice() && getLocalBiometricUserId()) {
      return (
        <BiometricLock
          preLogin
          onUnlocked={() => setBiometricLocked(false)}
          onUseLoginInstead={() => setSkipPreLoginBiometric(true)}
        />
      );
    }
    return <Login onRegister={() => setShowRegister(true)} />;
  }
  if (!profile) return <Register onBack={() => { signOut(auth).catch(() => {}); localStorage.clear(); window.location.reload(); }} />; 
  if (biometricLocked) {
    return (
      <BiometricLock
        userId={user.uid}
        accountLabel={profile?.name || profile?.email || user.email || undefined}
        onUnlocked={() => setBiometricLocked(false)}
        onUseLoginInstead={() => { signOut(auth).catch(() => {}); localStorage.clear(); window.location.reload(); }}
      />
    );
  }

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

  const clearWarmupPlan = async () => {
    setWarmupPlan(null);
    localStorage.removeItem('ironmind_warmup');
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          warmupPlan: null
        });
      } catch (err) {
        console.error("Erro ao limpar aquecimento no Firestore:", err);
      }
    }
    setShowConfirmClearWarmup(false);
  };

  const clearCardioPlan = async () => {
    setCardioPlan(null);
    localStorage.removeItem('ironmind_cardio');
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          cardioPlan: null
        });
      } catch (err) {
        console.error("Erro ao limpar cardio no Firestore:", err);
      }
    }
    setShowConfirmClearCardio(false);
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
    setTrainingPlan(plan);
          safeLocalStorageSet('ironmind_training', JSON.stringify(plan));

    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        trainingPlan: plan
      }).catch(err => console.error("Erro ao salvar treino no Firestore:", err));
    }

    // Não navega mais sozinho pra aba Treino -- a pessoa continua no
    // chat, pra poder ver (e aceitar) a dieta que normalmente vem logo
    // em seguida na mesma conversa, em vez de ser tirada da tela antes
    // disso. Só oferece a escolha "Ir para Treino/Dieta" quando os dois
    // já existirem (a dieta é aceita depois, então isso normalmente
    // dispara em saveDiet -- mas cobre o caso de aceitar treino de novo
    // com a dieta já pronta de antes).
    console.log("Training plan updated, staying in chat");
    if (dietPlan) setShowPlanChoice(true);
  };

  const saveDiet = (plan: DietPlan) => {
    updateDietPlan(plan);
    // Mesma lógica: só oferece a escolha quando o treino também já
    // existe -- normalmente é aqui que isso dispara, já que a dieta
    // costuma ser aceita logo depois do treino na mesma conversa.
    if (trainingPlan) setShowPlanChoice(true);
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
    { id: Tab.TREINADOR, label: 'TREINADOR', icon: UserCircle2, section: 'PRINCIPAL' },
    
    { id: Tab.AQUECIMENTO, label: 'AQUECIMENTO', icon: Timer, section: 'TREINO' },
    { id: Tab.TREINO, label: 'TREINO', icon: Dumbbell, section: 'TREINO' },
    { id: Tab.CARDIO, label: 'CARDIO', icon: Heart, section: 'TREINO' },
    { id: Tab.VIDEOS, label: 'VÍDEOS', icon: Play, section: 'TREINO' },
    { id: Tab.SOM, label: 'SOM', icon: Music, section: 'TREINO' },
    
    { id: Tab.DIETA, label: 'DIETA', icon: Utensils, section: 'NUTRIÇÃO' },
    { id: Tab.AGUA, label: 'ÁGUA', icon: Droplets, section: 'NUTRIÇÃO' },
    
    { id: Tab.PERFIL, label: 'PERFIL', icon: UserCircle2, section: 'CONTA' },
    { id: Tab.HISTORICO, label: 'HISTÓRICO', icon: TrendingUp, section: 'CONTA' },
    { id: Tab.CHECKIN, label: 'CHECK-IN', icon: ClipboardCheck, section: 'CONTA' },
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
          <header className={`px-4 py-3 flex justify-between items-center bg-slate-50`} style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
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
            
            {/* Timer & Menu */}
            <div className="flex items-center gap-4">
              {/* Premium Pill Chronometer Refined */}
              <div className="bg-white/10 backdrop-blur-md border border-blue-500/40 rounded-full px-3 py-1 flex items-center gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] cursor-default">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                <span className="font-share text-base text-[#4488ff] leading-none tracking-tight drop-shadow-[0_0_6px_rgba(68,136,255,0.3)]">
                  {formatSessionTime(sessionTime)}
                </span>
                <div className="h-3 w-px bg-slate-400/30" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Treino</span>
              </div>
              
              {/* Premium Menu Button */}
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="relative w-11 h-11 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:shadow-lg active:scale-90 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <div className="relative z-10 w-5 h-0.5 bg-slate-900 group-hover:bg-white rounded-full transition-colors" />
                <div className="relative z-10 w-5 h-0.5 bg-slate-900 group-hover:bg-white rounded-full transition-colors" />
                <div className="relative z-10 w-5 h-0.5 bg-slate-900 group-hover:bg-white rounded-full transition-colors" />
              </button>
            </div>
          </header>
        </div>

        {/* Sugestão pra completar Corpo & Dieta (dispensável, aparece só até preencher ou dispensar) */}
        {profile && !profile.bodyDietProfile && !bodyDietBannerDismissed && (
          <div className="px-4 pt-3 shrink-0 bg-slate-50">
            <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-600/30 rounded-2xl p-3">
              <HeartPulse className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-tight">Complete sua avaliação de Corpo & Dieta</p>
                <p className="text-[9px] text-blue-600/80 leading-tight mt-0.5">O treinador usa isso pra montar treinos e dieta sob medida.</p>
              </div>
              <button
                onClick={() => { setActiveTab(Tab.PERFIL); }}
                className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest"
              >
                Preencher
              </button>
              <button
                onClick={() => { safeLocalStorageSet('ironmind_bodydiet_banner_dismissed', 'true'); setBodyDietBannerDismissed(true); }}
                className="shrink-0 p-1.5 text-blue-600/60"
                aria-label="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
                className="fixed inset-0 bg-[#0d1b3e]/60 backdrop-blur-md z-40"
              />
              {/* Sidebar */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 h-full w-[300px] bg-[#0d1b3e] z-50 shadow-[20px_0_40px_rgba(0,0,0,0.4)] flex flex-col p-6 text-white border-r border-white/5"
              >
                 {/* Header Drawer */}
                 <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                       <Dumbbell className="w-5 h-5 text-blue-500" />
                       <h2 className="font-[1000] text-lg uppercase tracking-tight italic" translate="no">Iron<span className="text-blue-500">Mind</span></h2>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 ml-7">Strength · Resilience</span>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)} 
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:text-white transition-all border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                 </div>

                 {/* User Card - High End */}
                 <div className="flex items-center gap-4 mb-10 p-4 bg-white/5 rounded-2xl border border-white/10 shadow-xl">
                   <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_4px_20px_rgba(37,99,235,0.4)] border border-white/20">
                     {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                   </div>
                   <div className="flex flex-col">
                     <p className="font-bebas text-2xl tracking-wide text-white leading-none uppercase">{profile?.name || 'Usuário'}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-[4px] text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">Atleta</span>
                        <div className="w-1 h-1 rounded-full bg-slate-500" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Season {new Date().getFullYear()}</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar pb-6">
                  {['PRINCIPAL', 'TREINO', 'NUTRIÇÃO', 'CONTA'].map((sectionName) => (
                    <div key={sectionName} className="flex flex-col gap-1">
                      <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mb-2">{sectionName}</h3>
                      {tabs.filter(t => t.section === sectionName).map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                            className={`group flex items-center justify-between py-3.5 px-4 rounded-xl transition-all relative overflow-hidden ${
                              isActive 
                                ? 'bg-gradient-to-r from-[#1a66ff] to-[#0044cc] text-white shadow-[0_8px_20px_rgba(0,68,204,0.4)] border border-white/20' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                              <span className="text-[12px] font-black uppercase tracking-widest">{tab.label}</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white translate-x-1' : 'text-slate-700 group-hover:text-white group-hover:translate-x-1'}`} />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                 </div>

                 {/* Footer Sair */}
                 <div className="pt-4 border-t border-white/5 mt-auto">
                    <button 
                      onClick={() => { signOut(auth).catch(() => {}); localStorage.clear(); window.location.reload(); }} 
                      className="w-full flex items-center justify-center gap-3 py-4 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/20 rounded-2xl transition-all group"
                    >
                      <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Sair do Sistema</span>
                    </button>
                    <p className="text-center text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-4">
                      Versão {__APP_VERSION__}
                    </p>
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
                onAcceptWarmup={updateWarmupPlan}
                onAcceptCardio={updateCardioPlan}
                onAcceptDiet={saveDiet}
                onClearChat={() => setShowConfirmClearChat(true)}
                userContext={{
                  profile: profile,
                  weight: weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null,
                  measurements: measurementHistory,
                  checkinHistory: checkinHistory,
                  loadHistory: loadHistory,
                  cardioSessionHistory: cardioSessionHistory,
                  trainingPlan: trainingPlan,
                  warmupPlan: warmupPlan,
                  cardioPlan: cardioPlan,
                  dietPlan: dietPlan
                }}
              />
            )}
            {activeTab === Tab.AQUECIMENTO && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex gap-2 p-3 pb-0 flex-shrink-0">
                  <button
                    onClick={() => setAquecimentoSubTab('classico')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      aquecimentoSubTab === 'classico' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Aquecimento
                  </button>
                  <button
                    onClick={() => setAquecimentoSubTab('sugestao')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      aquecimentoSubTab === 'sugestao' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Sugestão do Treinador
                  </button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {aquecimentoSubTab === 'classico' ? (
                    <WarmupTab />
                  ) : (
                    <>
                      <div className="flex-1 overflow-hidden">
                        {warmupPlan
                          ? <TrainingTab plan={warmupPlan} onUpdatePlan={updateWarmupPlan} onClearPlan={() => setShowConfirmClearWarmup(true)} onOpenSplitSelector={() => setActiveTab(Tab.TREINADOR)} onWorkoutComplete={handleWorkoutComplete} onOpenPoseCounter={() => setShowPoseCounter(true)} />
                          : <EmptyState type="aquecimento" onClick={() => setActiveTab(Tab.TREINADOR)} />}
                      </div>
                      <MediaQuickLaunch />
                    </>
                  )}
                </div>
              </div>
            )}
            {activeTab === Tab.TREINO && (
              <TrainingPlanView 
                plan={trainingPlan} 
                setActiveTab={setActiveTab} 
                onUpdatePlan={updateTrainingPlan} 
                onClearPlan={() => setShowConfirmClearTraining(true)} 
                onOpenSplitSelector={() => setIsSplitSelectorOpen(true)}
                onWorkoutComplete={handleWorkoutComplete}
                onOpenPoseCounter={() => setShowPoseCounter(true)}
              />
            )}
            {activeTab === Tab.VIDEOS && (
              trainingPlan ? <VideosTab plan={trainingPlan} /> : <EmptyState type="vídeos" onClick={() => setActiveTab(Tab.TREINADOR)} />
            )}
            {activeTab === Tab.CARDIO && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex gap-2 p-3 pb-0 flex-shrink-0">
                  <button
                    onClick={() => setCardioSubTab('classico')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      cardioSubTab === 'classico' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Aeróbico
                  </button>
                  <button
                    onClick={() => setCardioSubTab('sugestao')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      cardioSubTab === 'sugestao' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Sugestão do Treinador
                  </button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {cardioSubTab === 'classico' ? (
                    <CardioTab onSessionComplete={handleCardioSessionComplete} />
                  ) : (
                    <>
                      <div className="flex-1 overflow-hidden">
                        {cardioPlan
                          ? <TrainingTab plan={cardioPlan} onUpdatePlan={updateCardioPlan} onClearPlan={() => setShowConfirmClearCardio(true)} onOpenSplitSelector={() => setActiveTab(Tab.TREINADOR)} onWorkoutComplete={handleWorkoutComplete} onOpenPoseCounter={() => setShowPoseCounter(true)} />
                          : <EmptyState type="cardio" onClick={() => setActiveTab(Tab.TREINADOR)} />}
                      </div>
                      <MediaQuickLaunch />
                    </>
                  )}
                </div>
              </div>
            )}
            {activeTab === Tab.DIETA && <DietPlanView plan={dietPlan} setActiveTab={setActiveTab} onUpdatePlan={updateDietPlan} onClearPlan={() => setShowConfirmClearDiet(true)} userProfile={profile} userId={user?.uid} />}
            {activeTab === Tab.AGUA && (
              <WaterTab
                profile={profile}
                waterIntake={profile?.waterIntake || {}}
                onSetTodayCount={handleSetTodayWaterCount}
                dietAguaLitrosDia={dietPlan?.aguaLitrosDia}
              />
            )}
            {activeTab === Tab.SOM && <MusicTab />}
            {activeTab === Tab.HISTORICO && (
                <HistoryTab 
                  weightHistory={weightHistory} 
                  setWeightHistory={setWeightHistory} 
                  measurementHistory={measurementHistory}
                  setMeasurementHistory={setMeasurementHistory}
                  loadHistory={loadHistory}
                  setLoadHistory={setLoadHistory}
                  checkinHistory={checkinHistory}
                  cardioSessionHistory={cardioSessionHistory}
                  userProfile={profile}
                  setUserProfile={setProfile}
                  onClearHistory={() => setShowConfirmClearHistory(true)}
                  onClearChat={() => setShowConfirmClearChat(true)}
                  onClearTraining={() => setShowConfirmClearTraining(true)}
                  onClearDiet={() => setShowConfirmClearDiet(true)}
                  onHardReset={() => setShowConfirmHardReset(true)}
                />
              )}
            {activeTab === Tab.CHECKIN && (
              <CheckinTab
                history={checkinHistory}
                onAddCheckin={handleAddCheckin}
                onAskCoachToAdjust={handleAskCoachToAdjust}
                lastWeight={weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null}
              />
            )}
            {activeTab === Tab.PERFIL && (
              <ProfileTab profile={profile} setProfile={setProfile} userId={user?.uid} onNavigateToTreinador={() => setActiveTab(Tab.TREINADOR)} />
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
        {(showConfirmClearTraining || showConfirmClearWarmup || showConfirmClearCardio || showConfirmClearDiet || showConfirmClearChat || showConfirmClearHistory || showConfirmHardReset) && (
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
                {showConfirmClearWarmup && 'Isso apagará seu protocolo de aquecimento atual.'}
                {showConfirmClearCardio && 'Isso apagará seu protocolo de cardio atual.'}
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
                    setShowConfirmClearWarmup(false);
                    setShowConfirmClearCardio(false);
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
                    if (showConfirmClearWarmup) clearWarmupPlan();
                    if (showConfirmClearCardio) clearCardioPlan();
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

      {workoutCompleteInfo && (
        <WorkoutCompleteModal
          dayLabel={workoutCompleteInfo.dayLabel}
          exerciseCount={workoutCompleteInfo.exerciseCount}
          streakCount={workoutCompleteInfo.streakCount}
          newAchievements={workoutCompleteInfo.newAchievements}
          onClose={() => setWorkoutCompleteInfo(null)}
        />
      )}

      {showPoseCounter && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <PoseRepCounter onClose={() => setShowPoseCounter(false)} />
        </Suspense>
      )}

      <AnimatePresence>
        {showBiometricOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <Fingerprint className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-800 mb-1">Ativar biometria?</h2>
              <p className="text-sm text-slate-500 mb-6">Destrave o app com digital ou rosto da próxima vez, sem precisar digitar a senha.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBiometricOffer(false)}
                  disabled={biometricOfferLoading}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  Agora não
                </button>
                <button
                  onClick={handleAcceptBiometricOffer}
                  disabled={biometricOfferLoading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {biometricOfferLoading ? '...' : 'Ativar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlanChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPlanChoice(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-6 text-center"
            >
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-800 mb-1">Tudo pronto!</h2>
              <p className="text-sm text-slate-500 mb-6">Seu treino e sua dieta já estão salvos. Pra onde você quer ir agora?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setActiveTab(Tab.TREINO); setShowPlanChoice(false); }}
                  className="flex flex-col items-center gap-2 bg-blue-600 text-white rounded-2xl py-4 active:scale-95 transition-transform"
                >
                  <Dumbbell className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Treino</span>
                </button>
                <button
                  onClick={() => { setActiveTab(Tab.DIETA); setShowPlanChoice(false); }}
                  className="flex flex-col items-center gap-2 bg-emerald-600 text-white rounded-2xl py-4 active:scale-95 transition-transform"
                >
                  <Utensils className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Dieta</span>
                </button>
              </div>
              <button
                onClick={() => setShowPlanChoice(false)}
                className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Continuar no chat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrainingPlanView({ plan, setActiveTab, onUpdatePlan, onClearPlan, onOpenSplitSelector, onWorkoutComplete, onOpenPoseCounter }: { plan: TrainingPlan | null, setActiveTab: (t: Tab) => void, onUpdatePlan: (p: TrainingPlan) => void, onClearPlan: () => void, onOpenSplitSelector: () => void, onWorkoutComplete?: (dayLabel: string, exerciseCount: number) => void, onOpenPoseCounter?: () => void }) {
  console.log('TrainingPlanView rendering, plan:', plan);

  if (!plan) return <EmptyState type="treino" onClick={() => setActiveTab(Tab.TREINADOR)} onManualBuild={onOpenSplitSelector} />;
  return <TrainingTab plan={plan} onUpdatePlan={onUpdatePlan} onClearPlan={onClearPlan} onOpenSplitSelector={onOpenSplitSelector} onWorkoutComplete={onWorkoutComplete} onOpenPoseCounter={onOpenPoseCounter} />;
}

function DietPlanView({ plan, setActiveTab, onUpdatePlan, onClearPlan, userProfile, userId }: { plan: DietPlan | null, setActiveTab: (t: Tab) => void, onUpdatePlan: (p: DietPlan) => void, onClearPlan: () => void, userProfile?: AppProfile | null, userId?: string }) {
  console.log('DietPlanView rendering, plan:', plan);
  return <DietTab plan={plan} onClearPlan={onClearPlan} onRequestNew={() => setActiveTab(Tab.TREINADOR)} userProfile={userProfile} userId={userId} />;
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
