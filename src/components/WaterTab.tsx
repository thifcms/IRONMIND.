import { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Droplets, RotateCcw, Bell, Clock } from 'lucide-react';
import { getReminderSchedule, getExpectedGlassesByNow, checkDueReminder, markReminderFired, WAKE_HOUR, SLEEP_HOUR } from '../services/waterSchedule';
import type { AppProfile } from '../types';

interface WaterTabProps {
  profile: AppProfile | null;
  waterIntake: Record<string, number>;
  onSetTodayCount: (count: number) => void;
  dietAguaLitrosDia?: number;
}

const GLASS_SIZE_L = 0.25; // 250ml por copo, padrão
const NOTIF_PREF_KEY = 'ironmind_water_notifications_enabled';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Copo ilustrado (SVG), com o nível preenchido conforme "filled". */
function GlassIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 40 56" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M6 6 L34 6 L30 50 Q30 52 28 52 L12 52 Q10 52 10 50 Z" className={filled ? 'text-blue-600' : 'text-slate-300 dark:text-slate-700'} />
      {filled && (
        <path d="M9 22 L31 22 L28.5 49.5 Q28.3 50.5 27 50.5 L13 50.5 Q11.7 50.5 11.5 49.5 Z" fill="currentColor" className="text-blue-500" stroke="none" opacity={0.85} />
      )}
    </svg>
  );
}

async function showWaterNotification(title: string, body: string) {
  try {
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: './icon.svg', tag: 'ironmind-water', badge: './icon.svg' });
      return;
    }
  } catch {
    // ignora e tenta o caminho simples abaixo
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: './icon.svg' });
  }
}

export default function WaterTab({ profile, waterIntake, onSetTodayCount, dietAguaLitrosDia }: WaterTabProps) {
  const key = todayKey();
  const todayCount = waterIntake?.[key] || 0;

  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem(NOTIF_PREF_KEY) === 'true');

  const targetGlasses = useMemo(() => {
    // Prioridade: sugestão da dieta aceita > preenchido manualmente em Corpo & Dieta > padrão 2L
    if (dietAguaLitrosDia && dietAguaLitrosDia > 0) return Math.max(1, Math.round(dietAguaLitrosDia / GLASS_SIZE_L));
    const litros = parseFloat(profile?.bodyDietProfile?.dieta?.aguaLitrosDia);
    if (!isNaN(litros) && litros > 0) return Math.max(1, Math.round(litros / GLASS_SIZE_L));
    return 8; // padrão: 2L / 250ml
  }, [profile, dietAguaLitrosDia]);

  const totalSlots = Math.max(targetGlasses, todayCount);
  const litrosBebidos = (todayCount * GLASS_SIZE_L).toFixed(2);
  const metaAtingida = todayCount >= targetGlasses;
  const schedule = useMemo(() => getReminderSchedule(targetGlasses), [targetGlasses]);
  const expectedByNow = getExpectedGlassesByNow(targetGlasses);
  const atrasado = !metaAtingida && todayCount < expectedByNow;

  const handleTapGlass = (index: number) => {
    const novoCount = index + 1 === todayCount ? index : index + 1;
    onSetTodayCount(novoCount);
  };

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === 'granted') {
      localStorage.setItem(NOTIF_PREF_KEY, 'true');
      setNotifEnabled(true);
      showWaterNotification('Lembretes de água ativados', `Você vai receber ${targetGlasses} lembretes hoje, das ${WAKE_HOUR}h às ${SLEEP_HOUR}h.`);
    }
  };

  const handleDisableNotifications = () => {
    localStorage.setItem(NOTIF_PREF_KEY, 'false');
    setNotifEnabled(false);
  };

  // Verifica a cada minuto se algum lembrete "venceu" e ainda não foi avisado
  useEffect(() => {
    if (!notifEnabled || notifStatus !== 'granted') return;
    const check = () => {
      const due = checkDueReminder(targetGlasses, todayCount);
      if (due) {
        markReminderFired(due.glassNumber);
        showWaterNotification(
          '💧 Hora de beber água!',
          `Você deveria estar no copo ${due.glassNumber} de ${targetGlasses} agora.`
        );
      }
    };
    check(); // checa assim que a aba abre também
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [notifEnabled, notifStatus, targetGlasses, todayCount]);

  const cardCls = "bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-800 p-4";

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 dark:shadow-none">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">Hoje</p>
            <h2 className="text-2xl font-[1000] text-slate-900 dark:text-white tracking-tighter leading-none uppercase italic">Água</h2>
          </div>
        </div>
        {todayCount > 0 && (
          <button
            onClick={() => onSetTodayCount(0)}
            type="button"
            className="p-2.5 bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400"
            aria-label="Reiniciar contagem de hoje"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={`${cardCls} text-center`}>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Meta do treinador: {targetGlasses} copos ({(targetGlasses * GLASS_SIZE_L).toFixed(1)}L/dia)
          </p>
          <p className={`text-3xl font-[1000] italic tracking-tighter ${metaAtingida ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
            {todayCount} / {targetGlasses} copos
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{litrosBebidos}L bebidos hoje</p>
          {metaAtingida && (
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-2">Meta batida! 💧</p>
          )}
          {atrasado && (
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mt-2">
              Você deveria estar em {expectedByNow} copos a essa hora
            </p>
          )}
        </div>

        {/* Lembretes */}
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Lembretes ao longo do dia ({WAKE_HOUR}h–{SLEEP_HOUR}h)
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">
            {targetGlasses} copos divididos em avisos ao longo do dia, pra você não deixar tudo pro fim.
          </p>

          {notifStatus === 'unsupported' ? (
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Seu navegador não suporta notificações.</p>
          ) : notifStatus === 'denied' ? (
            <p className="text-[9px] text-rose-500">
              Notificações bloqueadas nas configurações do navegador. Ative manualmente nas permissões do site pra receber os lembretes.
            </p>
          ) : notifEnabled && notifStatus === 'granted' ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                <Bell className="w-3.5 h-3.5" /> Lembretes ativados
              </span>
              <button
                type="button"
                onClick={handleDisableNotifications}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 underline"
              >
                Desativar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5"
            >
              <Bell className="w-4 h-4" /> Ativar lembretes
            </button>
          )}

          {schedule.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {schedule.map((r) => (
                <span
                  key={r.glassNumber}
                  className={`text-[8px] font-bold px-2 py-1 rounded-full ${
                    todayCount >= r.glassNumber ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {String(r.hour).padStart(2, '0')}:{String(r.minute).padStart(2, '0')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={cardCls}>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mb-3 text-center">Toca num copo pra marcar até ele</p>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <motion.button
                key={i}
                type="button"
                onClick={() => handleTapGlass(i)}
                whileTap={{ scale: 0.9 }}
                className="aspect-[40/56] w-full"
              >
                <GlassIcon filled={i < todayCount} />
              </motion.button>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => onSetTodayCount(Math.max(0, todayCount - 1))}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest"
            >
              - 1 copo
            </button>
            <button
              type="button"
              onClick={() => onSetTodayCount(todayCount + 1)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest"
            >
              + 1 copo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
