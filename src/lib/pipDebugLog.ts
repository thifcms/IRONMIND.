/**
 * Log de diagnóstico do "visor flutuante" (Picture-in-Picture) que
 * SOBREVIVE a troca de app e reload da página, porque fica salvo no
 * localStorage em vez de só em memória/estado do React.
 *
 * Por quê: o problema relatado ("visor some ao abrir o app nativo")
 * acontece bem no momento em que o Android troca de app -- exatamente
 * quando a aba do IronMind pode ser suspensa ou perder o JS em execução.
 * Se o log só existisse em memória (useState), ele se perderia junto.
 * Guardando no localStorage, dá pra abrir o IronMind de novo depois e
 * ver exatamente a sequência de eventos que aconteceu.
 */

const KEY = 'ironmind_pip_log';
const MAX_ENTRIES = 30;

export interface PipLogEntry {
  t: number; // timestamp (Date.now())
  msg: string;
}

export function logPiP(msg: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const log: PipLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push({ t: Date.now(), msg });
    while (log.length > MAX_ENTRIES) log.shift();
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // localStorage indisponível (modo privado etc.) -- ignora silenciosamente.
  }
  // Também no console, pra quem tiver DevTools/chrome://inspect à mão.
  console.log(`[PiP ${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
}

export function getPiPLog(): PipLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPiPLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}

export function formatPiPLogEntry(entry: PipLogEntry): string {
  const time = new Date(entry.t).toLocaleTimeString('pt-BR', { hour12: false });
  return `${time} — ${entry.msg}`;
}
