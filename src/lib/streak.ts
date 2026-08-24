import type { AppProfile } from '../types';

/** Formato YYYY-MM-DD no fuso local do aparelho (não UTC, pra "hoje" bater
 *  com o dia real da pessoa em qualquer fuso). */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const dateA = Date.UTC(ay, am - 1, ad);
  const dateB = Date.UTC(by, bm - 1, bd);
  return Math.round((dateB - dateA) / 86400000);
}

export interface StreakResult {
  streak: NonNullable<AppProfile['streak']>;
  isNewDay: boolean; // false se a pessoa já tinha registrado atividade hoje (não duplica a conquista)
  streakIncreased: boolean; // true só quando a sequência realmente sobe (não em resets)
}

/**
 * Calcula o novo estado da sequência a partir de uma atividade concluída
 * (treino, cardio, aquecimento, etc) hoje.
 *
 * Regras:
 * - Primeira atividade registrada -- streak = 1.
 * - Atividade no mesmo dia que a última -- não muda nada (evita contar
 *   2x se a pessoa completa Treino A e depois Cardio no mesmo dia).
 * - Atividade no dia seguinte -- streak +1.
 * - Atividade com 2+ dias de intervalo -- streak reinicia em 1 (quebrou
 *   a sequência).
 */
export function recordActivity(current: AppProfile['streak'] | undefined, now: Date = new Date()): StreakResult {
  const today = todayKey(now);

  if (!current || !current.lastActivityDate) {
    return {
      streak: { count: 1, longestStreak: 1, lastActivityDate: today },
      isNewDay: true,
      streakIncreased: true,
    };
  }

  const gap = daysBetween(current.lastActivityDate, today);

  if (gap === 0) {
    return { streak: current, isNewDay: false, streakIncreased: false };
  }

  const newCount = gap === 1 ? current.count + 1 : 1;
  const newLongest = Math.max(current.longestStreak || 0, newCount);

  return {
    streak: { count: newCount, longestStreak: newLongest, lastActivityDate: today },
    isNewDay: true,
    streakIncreased: gap === 1,
  };
}

/** Marcos de sequência que valem uma conquista/badge. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export interface Achievement {
  id: string;
  label: string;
  emoji: string;
}

/** Conquistas desbloqueadas dado o estado atual do perfil (sequência +
 *  total de treinos). Recalculado toda vez -- não precisa persistir
 *  "quais já foram vistas" separadamente pra saber quais existem. */
export function getUnlockedAchievements(profile: Pick<AppProfile, 'streak' | 'totalWorkoutsCompleted'>): Achievement[] {
  const unlocked: Achievement[] = [];
  const streakCount = profile.streak?.count || 0;
  const totalWorkouts = profile.totalWorkoutsCompleted || 0;

  for (const milestone of STREAK_MILESTONES) {
    if (streakCount >= milestone) {
      unlocked.push({ id: `streak_${milestone}`, label: `${milestone} dias seguidos`, emoji: milestone >= 100 ? '🏆' : milestone >= 30 ? '🔥' : '⚡' });
    }
  }

  const workoutMilestones = [1, 10, 25, 50, 100, 250, 500];
  for (const milestone of workoutMilestones) {
    if (totalWorkouts >= milestone) {
      unlocked.push({ id: `workouts_${milestone}`, label: `${milestone} treino${milestone > 1 ? 's' : ''} concluído${milestone > 1 ? 's' : ''}`, emoji: milestone >= 100 ? '💎' : milestone >= 25 ? '🥇' : '💪' });
    }
  }

  return unlocked;
}
