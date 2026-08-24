import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PartyPopper, Share2, X, Flame, Loader2 } from 'lucide-react';
import { shareWorkoutCard } from '../lib/workoutCard';
import { getUnlockedAchievements, type Achievement } from '../lib/streak';
import type { AppProfile } from '../types';

interface Props {
  dayLabel: string;
  exerciseCount: number;
  streakCount: number;
  newAchievements: Achievement[];
  onClose: () => void;
}

/**
 * Tela de celebração ao completar 100% de um dia de treino. Mostra a
 * sequência atual, qualquer conquista nova desbloqueada, e um botão
 * pra gerar/compartilhar um cartão-resumo (Web Share API, com fallback
 * pra baixar a imagem).
 */
export default function WorkoutCompleteModal({ dayLabel, exerciseCount, streakCount, newAchievements, onClose }: Props) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    const dateLabel = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    await shareWorkoutCard({ dayLabel, exerciseCount, streakCount, dateLabel });
    setSharing(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-3xl p-6 text-center overflow-hidden"
        >
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-400" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-emerald-500" />
          </div>

          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Treino Concluído!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{dayLabel} — {exerciseCount} exercícios</p>

          <div className="flex items-center justify-center gap-2 mt-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl py-3">
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="text-2xl font-black text-orange-500">{streakCount}</span>
            <span className="text-xs font-bold text-orange-500/80 uppercase tracking-widest">dias seguidos</span>
          </div>

          {newAchievements.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nova conquista</p>
              {newAchievements.map(a => (
                <div key={a.id} className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <span className="text-lg">{a.emoji}</span> {a.label}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleShare}
            disabled={sharing}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {sharing ? 'Gerando...' : 'Compartilhar'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Calcula quais conquistas são NOVAS comparando o perfil antes/depois
 *  -- pra só celebrar a que acabou de ser desbloqueada, não repetir
 *  as de sempre. */
export function diffNewAchievements(before: Pick<AppProfile, 'streak' | 'totalWorkoutsCompleted'>, after: Pick<AppProfile, 'streak' | 'totalWorkoutsCompleted'>): Achievement[] {
  const beforeIds = new Set(getUnlockedAchievements(before).map(a => a.id));
  return getUnlockedAchievements(after).filter(a => !beforeIds.has(a.id));
}
