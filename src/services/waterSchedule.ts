/**
 * Divide a meta de copos de água ao longo das horas em que a pessoa
 * normalmente está acordada, pra saber: (a) quantos copos ela já
 * deveria ter bebido a essa hora do dia, e (b) em quais horários exatos
 * cada lembrete deveria disparar.
 */

export const WAKE_HOUR = 7;   // 07:00
export const SLEEP_HOUR = 22; // 22:00

export interface WaterReminder {
  hour: number;
  minute: number;
  glassNumber: number; // a pessoa deveria estar com esse número de copos a essa hora
}

/** Horários dos lembretes, espalhados uniformemente entre acordar e dormir. */
export function getReminderSchedule(targetGlasses: number): WaterReminder[] {
  if (targetGlasses <= 0) return [];
  const wakeMinutes = WAKE_HOUR * 60;
  const sleepMinutes = SLEEP_HOUR * 60;
  const span = sleepMinutes - wakeMinutes;
  const reminders: WaterReminder[] = [];
  for (let i = 1; i <= targetGlasses; i++) {
    const minutesFromWake = (span / targetGlasses) * i;
    const totalMinutes = Math.round(wakeMinutes + minutesFromWake);
    reminders.push({
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
      glassNumber: i,
    });
  }
  return reminders;
}

/** Quantos copos a pessoa já deveria ter bebido, dado o horário atual. */
export function getExpectedGlassesByNow(targetGlasses: number, now: Date = new Date()): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const wakeMinutes = WAKE_HOUR * 60;
  const sleepMinutes = SLEEP_HOUR * 60;
  if (nowMinutes <= wakeMinutes) return 0;
  if (nowMinutes >= sleepMinutes) return targetGlasses;
  const progress = (nowMinutes - wakeMinutes) / (sleepMinutes - wakeMinutes);
  return Math.round(progress * targetGlasses);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FIRED_KEY_PREFIX = 'ironmind_water_reminders_fired_';

function getFiredSet(): Set<number> {
  try {
    const raw = localStorage.getItem(FIRED_KEY_PREFIX + todayKey());
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markFired(glassNumber: number) {
  const set = getFiredSet();
  set.add(glassNumber);
  localStorage.setItem(FIRED_KEY_PREFIX + todayKey(), JSON.stringify(Array.from(set)));
}

/**
 * Verifica se algum lembrete "venceu" (horário já passou) e ainda não foi
 * disparado nem já foi cumprido (a pessoa já bebeu esse copo ou mais).
 * Retorna o lembrete mais recente pendente, se houver.
 */
export function checkDueReminder(targetGlasses: number, todayCount: number, now: Date = new Date()): WaterReminder | null {
  const schedule = getReminderSchedule(targetGlasses);
  const fired = getFiredSet();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let due: WaterReminder | null = null;
  for (const reminder of schedule) {
    const reminderMinutes = reminder.hour * 60 + reminder.minute;
    if (reminderMinutes > nowMinutes) break; // ainda não chegou a hora
    if (fired.has(reminder.glassNumber)) continue; // já avisado
    if (todayCount >= reminder.glassNumber) continue; // já cumpriu, não precisa avisar
    due = reminder; // fica com o mais recente pendente
  }
  return due;
}

export function markReminderFired(glassNumber: number) {
  markFired(glassNumber);
}
