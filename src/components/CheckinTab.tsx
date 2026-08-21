import React, { useState } from 'react';
import { ClipboardCheck, Zap, TrendingUp, MessageSquareText, Calendar } from 'lucide-react';
import { CheckinEntry } from '../types';

interface CheckinTabProps {
  history: CheckinEntry[];
  onAddCheckin: (entry: CheckinEntry) => void;
  onAskCoachToAdjust: (entry: CheckinEntry) => void;
  lastWeight?: number | null;
}

const ADESAO_OPTIONS: { id: 'facil' | 'medio' | 'dificil'; label: string }[] = [
  { id: 'facil', label: 'Fácil' },
  { id: 'medio', label: 'Médio' },
  { id: 'dificil', label: 'Difícil' },
];

export default function CheckinTab({ history, onAddCheckin, onAskCoachToAdjust, lastWeight }: CheckinTabProps) {
  const [adesaoTreino, setAdesaoTreino] = useState<'facil' | 'medio' | 'dificil' | null>(null);
  const [adesaoDieta, setAdesaoDieta] = useState<'facil' | 'medio' | 'dificil' | null>(null);
  const [energia, setEnergia] = useState<number>(3);
  const [peso, setPeso] = useState(lastWeight ? String(lastWeight) : '');
  const [dor, setDor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saved, setSaved] = useState(false);

  const canSave = adesaoTreino !== null && adesaoDieta !== null;

  const buildEntry = (): CheckinEntry => ({
    date: Date.now(),
    adesaoTreino: adesaoTreino!,
    adesaoDieta: adesaoDieta!,
    energia: energia as 1 | 2 | 3 | 4 | 5,
    peso: peso ? Number(peso) : undefined,
    dorOuDificuldade: dor.trim() || undefined,
    observacoes: observacoes.trim() || undefined,
  });

  const handleSave = () => {
    if (!canSave) return;
    const entry = buildEntry();
    onAddCheckin(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveAndAsk = () => {
    if (!canSave) return;
    const entry = buildEntry();
    onAddCheckin(entry);
    onAskCoachToAdjust(entry);
  };

  const cardCls = "bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-800 p-4";
  const labelCls = "text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block";

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 dark:shadow-none">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">Toda semana</p>
          <h2 className="text-2xl font-[1000] text-slate-900 dark:text-white tracking-tighter leading-none uppercase italic">Check-in Semanal</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={cardCls}>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">Conta como foi sua semana pro treinador ajustar o próximo treino e dieta.</p>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Adesão ao treino essa semana</label>
              <div className="grid grid-cols-3 gap-2">
                {ADESAO_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAdesaoTreino(opt.id)}
                    className={`py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 ${
                      adesaoTreino === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Adesão à dieta essa semana</label>
              <div className="grid grid-cols-3 gap-2">
                {ADESAO_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAdesaoDieta(opt.id)}
                    className={`py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 ${
                      adesaoDieta === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3 h-3 text-blue-600" />
                <label className={labelCls + " mb-0"}>Nível de energia/disposição (1-5)</label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergia(n)}
                    className={`py-2.5 rounded-lg font-black text-sm border-2 ${
                      energia === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Peso atual (kg) — opcional</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Alguma dor ou dificuldade em algum exercício?</label>
              <textarea
                className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Ex: dor no ombro no supino, cansaço nos joelhos..."
                value={dor}
                onChange={(e) => setDor(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Outras observações</label>
              <textarea
                className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Qualquer coisa que ajude o treinador a entender sua semana..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          {saved && (
            <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-3">Check-in salvo!</p>
          )}

          <div className="flex flex-col gap-2 mt-4">
            <button
              type="button"
              onClick={handleSaveAndAsk}
              disabled={!canSave}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <MessageSquareText className="w-4 h-4" /> Salvar e pedir ajuste ao treinador
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest disabled:opacity-40"
            >
              Só salvar por agora
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className={cardCls}>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Check-ins anteriores</h3>
            </div>
            <div className="space-y-2">
              {[...history].reverse().slice(0, 8).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{formatDate(entry.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400 dark:text-slate-500">Treino: <span className="text-slate-700 dark:text-slate-200">{entry.adesaoTreino}</span></span>
                    <span className="text-slate-400 dark:text-slate-500">Energia: <span className="text-slate-700 dark:text-slate-200">{entry.energia}/5</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
