import type { WeightEntry, LoadEntry, CheckinEntry } from '../types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resume os dados dos últimos 7 dias (peso, progressão de carga por
 * exercício, adesão/energia dos check-ins) num texto compacto pra
 * mandar pra IA gerar um insight -- em vez de mandar os arrays inteiros
 * (mais token, mais chance da IA se perder em detalhe irrelevante).
 *
 * Retorna null se não tiver dado nenhum na semana (evita gastar uma
 * chamada de IA só pra ela responder "sem dados suficientes").
 */
export function buildWeeklySummary(weightHistory: WeightEntry[], loadHistory: LoadEntry[], checkinHistory: CheckinEntry[]): string | null {
  const now = Date.now();
  const cutoff = now - WEEK_MS;

  const recentWeight = weightHistory.filter(w => w.date >= cutoff).sort((a, b) => a.date - b.date);
  const recentLoad = loadHistory.filter(l => l.date >= cutoff);
  const recentCheckins = checkinHistory.filter(c => c.date >= cutoff).sort((a, b) => a.date - b.date);

  if (recentWeight.length === 0 && recentLoad.length === 0 && recentCheckins.length === 0) {
    return null;
  }

  const lines: string[] = [];

  if (recentWeight.length >= 2) {
    const delta = recentWeight[recentWeight.length - 1].weight - recentWeight[0].weight;
    lines.push(`Peso: variou ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}kg na semana (de ${recentWeight[0].weight}kg pra ${recentWeight[recentWeight.length - 1].weight}kg).`);
  }

  if (recentLoad.length > 0) {
    const byExercise = new Map<string, LoadEntry[]>();
    for (const entry of recentLoad) {
      const list = byExercise.get(entry.exercise) || [];
      list.push(entry);
      byExercise.set(entry.exercise, list);
    }
    for (const [exercise, entries] of byExercise) {
      entries.sort((a, b) => a.date - b.date);
      const first = entries[0].weight, last = entries[entries.length - 1].weight;
      const delta = last - first;
      lines.push(`${exercise}: ${entries.length} registro(s) na semana${delta !== 0 ? `, carga ${delta >= 0 ? 'subiu' : 'caiu'} ${Math.abs(delta)}kg` : ''} (última: ${last}kg).`);
    }
  }

  if (recentCheckins.length > 0) {
    const energiaAvg = recentCheckins.reduce((s, c) => s + c.energia, 0) / recentCheckins.length;
    const dificeis = recentCheckins.filter(c => c.adesaoTreino === 'dificil' || c.adesaoDieta === 'dificil').length;
    lines.push(`Check-ins: ${recentCheckins.length} registrados, energia média ${energiaAvg.toFixed(1)}/5, ${dificeis} dia(s) com adesão difícil.`);
    const comDor = recentCheckins.filter(c => c.dorOuDificuldade?.trim());
    if (comDor.length > 0) {
      lines.push(`Relatos de dor/dificuldade: ${comDor.map(c => `"${c.dorOuDificuldade}"`).join('; ')}.`);
    }
  }

  return lines.join('\n');
}
