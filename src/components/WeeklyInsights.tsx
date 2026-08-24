import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { buildWeeklySummary } from '../lib/weeklySummary';
import { generateWeeklyInsights } from '../services/geminiService';
import type { WeightEntry, LoadEntry, CheckinEntry, AppProfile } from '../types';

interface Props {
  weightHistory: WeightEntry[];
  loadHistory: LoadEntry[];
  checkinHistory: CheckinEntry[];
  userProfile?: AppProfile | null;
}

/**
 * Cartão "Insights da Semana" -- cruza peso, progressão de carga e
 * check-ins dos últimos 7 dias e pede pra IA (o mesmo motor do chat)
 * interpretar os padrões, em vez de só mostrar números soltos.
 * Gerado sob demanda (botão), não automático -- mais simples e mais
 * barato que rodar em segundo plano sem controle.
 */
export default function WeeklyInsights({ weightHistory, loadHistory, checkinHistory, userProfile }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = buildWeeklySummary(weightHistory, loadHistory, checkinHistory);

  const handleGenerate = async () => {
    if (!summary) return;
    setLoading(true);
    setError(null);
    try {
      const text = await generateWeeklyInsights(summary, userProfile);
      setInsight(text);
    } catch (e: any) {
      setError(e?.message || 'Não consegui gerar os insights agora. Tenta de novo em instantes.');
    } finally {
      setLoading(false);
    }
  };

  if (!summary) return null; // sem dado nenhum na semana -- não mostra o cartão

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Insights da Semana</h3>
      </div>

      <AnimatePresence mode="wait">
        {insight ? (
          <motion.div key="insight" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{insight}</p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-500"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Gerar de novo
            </button>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Deixa a IA cruzar seu peso, progressão de carga e check-ins da semana e te dizer o que realmente importa.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? 'Analisando...' : 'Gerar insights'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-[10px] text-red-500 mt-2">{error}</p>}
    </div>
  );
}
