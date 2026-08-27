import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, Footprints, Timer, Zap, MapPin, Youtube, Gauge, TrendingUp, Weight, Pause, Play, MonitorPlay, Activity, Heart, AlertTriangle, Rows3, X } from 'lucide-react';
import { bioMonitor } from '../services/bioMonitor';
import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';
import { startStreamingReminder } from '../services/streamingReminder';

type CardioMode = 'corrida' | 'esteira' | 'bicicleta';

interface CardioTabProps {
  onSessionComplete?: (session: { type: CardioMode; distance: number; time: number; calories: number }) => void;
}

export default function CardioTab({ onSessionComplete }: CardioTabProps) {
  const [mode, setMode] = useState<CardioMode>('esteira');
  const [isActive, setIsActive] = useState(false);
  const [showSplitTip, setShowSplitTip] = useState(() => localStorage.getItem('ironmind_split_tip_dismissed') !== 'true');
  const dismissSplitTip = () => {
    localStorage.setItem('ironmind_split_tip_dismissed', 'true');
    setShowSplitTip(false);
  };
  const [time, setTime] = useState(0);

  // Input states
  const [speed, setSpeed] = useState(6.0); // km/h
  const [incline, setIncline] = useState(0); // % for treadmill
  const [load, setLoad] = useState(5); // Resistance for bike
  const [heartRate, setHeartRate] = useState(70);
  const [bioStatus, setBioStatus] = useState<any>(null);
  const hrMonitor = useHeartRateMonitor();

  // Refs pra ler o valor mais recente de dentro do worker sem precisar
  // recriar o worker toda vez que isActive/speed mudam.
  const isActiveRef = useRef(isActive);
  const speedRef = useRef(speed);
  const hrConnectedRef = useRef(false);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { hrConnectedRef.current = hrMonitor.status === 'connected'; }, [hrMonitor.status]);

  // O Chrome pausa o redesenho do canvas (e os setInterval comuns) quando
  // a aba vai pra segundo plano -- bug conhecido do Chromium
  // (canvas.captureStream() fica vazio/congelado nessa hora,
  // https://issues.chromium.org/issues/41270855). Como é justamente
  // quando trocamos de app que o visor mais precisa continuar vivo, o
  // "relógio" do cronômetro roda num Web Worker (thread separada, que o
  // Chrome não pausa da mesma forma) em vez de um setInterval direto.
  const workerRef = useRef<Worker | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const tickCountRef = useRef(0);

  const updateProgressNotification = async (elapsedSeconds: number) => {
    if (notifPermission !== 'granted' || typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
      const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
      const stats = getStats();
      await reg.showNotification('IronMind Cardio', {
        body: `⏱ ${mins}:${secs}  •  ${stats.distance}km  •  ${speedRef.current.toFixed(1)}km/h`,
        icon: './icon.svg',
        badge: './icon.svg',
        tag: 'ironmind-cardio-progress', // substitui a anterior, não empilha
        silent: true,
        renotify: false,
      } as NotificationOptions);
    } catch (e) {
      console.warn('Falha ao mostrar notificação de progresso:', e);
    }
  };

  const clearProgressNotification = async () => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const notifs = await reg.getNotifications({ tag: 'ironmind-cardio-progress' });
      notifs.forEach(n => n.close());
    } catch {
      // sem problema, a notificação só some quando o usuário limpar mesmo
    }
  };

  const handleEnableProgressNotif = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  useEffect(() => {
    const workerCode = `setInterval(() => postMessage('tick'), 1000);`;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = () => {
      if (!isActiveRef.current) return;
      setTime(prev => {
        const next = prev + 1;
        // Atualiza a notificação a cada 15s (não todo segundo -- evita
        // gastar bateria/spam de atualização), rodando pelo mesmo
        // Worker que já sobrevive a aba em segundo plano.
        tickCountRef.current += 1;
        if (tickCountRef.current % 15 === 0) {
          updateProgressNotification(next);
        }
        return next;
      });
      setHeartRate(prev => {
        // Com monitor Bluetooth real conectado, o BPM vem direto dele
        // (ver useEffect de sincronização abaixo) -- a simulação aqui
        // só serve de fallback pra quem não tem/não conectou um sensor.
        if (hrConnectedRef.current) return prev;
        const target = 120 + (speedRef.current * 5);
        if (prev < target) return prev + 1;
        if (prev > target) return prev - 1;
        return prev;
      });
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  useEffect(() => {
    if (!isActive && hrMonitor.status !== 'connected') setHeartRate(70);
  }, [isActive, hrMonitor.status]);

  // Sincroniza o BPM real do monitor Bluetooth com o estado usado pelo
  // resto da tela (Bio-Monitor, notificação de progresso, visor PiP) --
  // assim tudo que já lê `heartRate` passa a refletir o sensor real
  // sem precisar duplicar lógica em cada lugar que o usa.
  useEffect(() => {
    if (hrMonitor.status === 'connected' && hrMonitor.bpm !== null) {
      setHeartRate(hrMonitor.bpm);
    }
  }, [hrMonitor.bpm, hrMonitor.status]);

  // Monitorar Bio-Status
  useEffect(() => {
    if (isActive) {
        const status = bioMonitor.checkHeartRateZone(heartRate, 30);
        setBioStatus(status);
        
        if (status.status === 'perigo') {
            console.warn('BIO-MONITOR: ', status.msg);
        }
    } else {
        setBioStatus(null);
    }
  }, [heartRate, isActive]);

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

  /**
   * Salva a sessão de cardio concluída (histórico real -- antes disso o
   * CardioTab não persistia nada, o progresso só existia enquanto a tela
   * ficava aberta). Exige pelo menos 1 minuto pra evitar salvar toques
   * acidentais no play sem treino de verdade.
   */
  const handleFinishSession = () => {
    if (time < 60) {
      setIsActive(false);
      setTime(0);
      return;
    }
    const stats = getStats();
    onSessionComplete?.({
      type: mode,
      distance: parseFloat(stats.distance),
      time: Math.round(time / 60),
      calories: parseFloat(stats.calories),
    });
    clearProgressNotification();
    setIsActive(false);
    setTime(0);
  };

  const handleMediaClick = (url: string) => {
    if (!isActive) setIsActive(true);
    startStreamingReminder();
    window.open(url, '_blank');
  };

  const stats = getStats();

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden relative transition-colors duration-300">

      {/* Bio-Monitor Floating Hud */}
      <AnimatePresence>
        {bioStatus && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`absolute top-20 right-4 px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 z-20 ${
              bioStatus.status === 'perigo' 
              ? 'bg-red-500 text-white border-red-500 shadow-lg' 
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 dark:bg-emerald-500/10 dark:border-emerald-500/30'
            }`}
          >
            {bioStatus.status === 'perigo' ? <AlertTriangle className="w-3 h-3 animate-pulse" /> : <Heart className="w-3 h-3 animate-bounce" />}
            <span className="text-[9px] font-black uppercase tracking-tighter">{heartRate} BPM</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monitor cardíaco Bluetooth -- opcional, sem ele o BPM continua
          estimado a partir da velocidade, como sempre foi. */}
      {hrMonitor.supported && (
        <div className="px-2 pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => hrMonitor.status === 'connected' ? hrMonitor.disconnect() : hrMonitor.connect()}
            disabled={hrMonitor.status === 'connecting'}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              hrMonitor.status === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900/30'
                : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${hrMonitor.status === 'connected' ? 'text-emerald-500' : ''}`} />
            {hrMonitor.status === 'connecting' && 'Conectando...'}
            {hrMonitor.status === 'connected' && `${hrMonitor.deviceName || 'Monitor'} conectado — toque pra desconectar`}
            {(hrMonitor.status === 'disconnected' || hrMonitor.status === 'error') && 'Conectar monitor cardíaco (Bluetooth)'}
          </button>
          {hrMonitor.status === 'error' && hrMonitor.error && (
            <p className="text-[9px] text-red-500 mt-1 px-1">{hrMonitor.error}</p>
          )}
        </div>
      )}

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
      <div className="px-4 py-1 flex flex-col items-center gap-4 flex-1">
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
      <div className="px-4 py-4 space-y-3 bg-white dark:bg-[#121212] border-t border-slate-200 dark:border-slate-800">
        <button 
            onClick={() => {
              const next = !isActive;
              setIsActive(next);
              if (!next) clearProgressNotification();
            }}
            className={`w-full py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all ${
                isActive 
                    ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/20' 
                    : 'bg-blue-600 text-white shadow-lg dark:shadow-none'
            }`}
        >
            {isActive ? 'PONTUALIZAR / PAUSAR' : 'INICIAR TREINO'}
        </button>

        {time > 0 && (
          <button
            onClick={handleFinishSession}
            className="w-full py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/20 transition-all active:scale-95"
          >
            Finalizar treino
          </button>
        )}

        {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
          <button
            type="button"
            onClick={handleEnableProgressNotif}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" /> Ativar notificação de progresso
          </button>
        )}

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
        {showSplitTip && (
          <div className="mt-2 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-2.5">
            <Rows3 className="w-4 h-4 text-blue-500 flex-none mt-0.5" />
            <p className="text-[9px] text-blue-700 dark:text-blue-300 leading-relaxed flex-1">
              Pra assistir e treinar ao mesmo tempo, use a <strong>Tela Dividida</strong> do seu celular (segura o botão de apps recentes ou desliza com 2 dedos).
            </p>
            <button onClick={dismissSplitTip} className="flex-none text-blue-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

