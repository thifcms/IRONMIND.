import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, Droplets, Moon, Utensils, Pill, Zap } from 'lucide-react';
import { BODY_TYPES, BODY_REGIONS } from './bodyDietIcons';

export interface BodyDietProfile {
  sexo?: 'masculino' | 'feminino' | 'outro';
  medidas?: {
    cintura?: string;
    quadril?: string;
    peito?: string;
    braco?: string;
    coxa?: string;
  };
  tipoCorpoAtual?: string;
  autopercepcaoAtual?: Record<string, 1 | 2 | 3>;
  metaCorpo?: Record<string, 1 | 2 | 3>;
  dieta?: {
    alimentosPreferidos?: string;
    facilidadeHorarios?: 'facil' | 'medio' | 'dificil';
    suplementos?: string[];
    suplementoOutro?: string;
    aguaLitrosDia?: string;
  };
  sono?: {
    qualidade?: 'ruim' | 'regular' | 'boa' | 'otima';
    horasPorNoite?: string;
  };
  preTreino?: {
    quer?: boolean;
    regioes?: string[];
  };
  updatedAt?: string;
}

interface Props {
  initial?: BodyDietProfile;
  onSave: (data: BodyDietProfile) => Promise<void>;
  onSkip?: () => void;
}

const STEPS = ['sexo', 'medidas', 'tipoCorpo', 'atual', 'meta', 'dieta', 'agua', 'sono', 'preTreino'] as const;
type Step = typeof STEPS[number];

const REGION_LEVEL_LABELS: Record<string, [string, string, string]> = {
  abdomen: ['Barriga saliente', 'Abdômen médio', 'Definido / tanquinho'],
  bracos: ['Fino', 'Médio', 'Musculoso'],
  pernas: ['Fina', 'Média', 'Musculosa'],
  gluteos: ['Enxuto', 'Médio', 'Volumoso'],
  peito_ombros: ['Estreito', 'Médio', 'Largo / definido'],
};

const SUPLEMENTOS = ['Creatina', 'Whey Protein', 'BCAA', 'Multivitamínico', 'Nenhum'];

export default function BodyDietProfileTab({ initial, onSave, onSkip }: Props) {
  const [data, setData] = useState<BodyDietProfile>(initial || {});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const step = STEPS[stepIndex];

  const update = (patch: Partial<BodyDietProfile>) => setData(prev => ({ ...prev, ...patch }));

  const goNext = () => setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex(i => Math.max(i - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onSave({ ...data, updatedAt: new Date().toISOString() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleSupplement = (s: string) => {
    const current = data.dieta?.suplementos || [];
    const isNenhum = s === 'Nenhum';
    let next: string[];
    if (isNenhum) {
      next = current.includes('Nenhum') ? [] : ['Nenhum'];
    } else {
      const withoutNenhum = current.filter(x => x !== 'Nenhum');
      next = withoutNenhum.includes(s) ? withoutNenhum.filter(x => x !== s) : [...withoutNenhum, s];
    }
    update({ dieta: { ...data.dieta, suplementos: next } });
  };

  const togglePreTreinoRegiao = (regiaoId: string) => {
    const current = data.preTreino?.regioes || [];
    const next = current.includes(regiaoId) ? current.filter(r => r !== regiaoId) : [...current, regiaoId];
    update({ preTreino: { ...data.preTreino, regioes: next } });
  };

  const cardCls = "bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-slate-800 p-4";
  const labelCls = "text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block";
  const inputCls = "w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600";

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
      {/* Progresso */}
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Etapa {stepIndex + 1} de {STEPS.length}
          </p>
          {onSkip && (
            <button onClick={onSkip} type="button" className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 underline">
              Pular por agora
            </button>
          )}
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'sexo' && (
              <div className={cardCls}>
                <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Sexo</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Usado pelo treinador pra ajustar cálculos de treino e dieta.</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['masculino', 'feminino', 'outro'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update({ sexo: opt })}
                      className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all capitalize ${
                        data.sexo === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'medidas' && (
              <div className={cardCls}>
                <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Medidas</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Em centímetros. Pode deixar em branco o que não souber agora.</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['cintura', 'Cintura'],
                    ['quadril', 'Quadril'],
                    ['peito', 'Peito'],
                    ['braco', 'Braço'],
                    ['coxa', 'Coxa'],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className={labelCls}>{label} (cm)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className={inputCls}
                        value={(data.medidas as any)?.[key] || ''}
                        onChange={(e) => update({ medidas: { ...data.medidas, [key]: e.target.value } })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'tipoCorpo' && (
              <div className={cardCls}>
                <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Como você vê seu corpo?</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Escolhe a silhueta que mais se parece com a sua hoje.</p>
                <div className="grid grid-cols-3 gap-3">
                  {BODY_TYPES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update({ tipoCorpoAtual: id })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        data.tipoCorpoAtual === id ? 'bg-blue-600/10 border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className={`w-10 h-16 ${data.tipoCorpoAtual === id ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}`}>
                        <Icon />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest text-center ${data.tipoCorpoAtual === id ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(step === 'atual' || step === 'meta') && (
              <div className={cardCls}>
                <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter mb-1">
                  {step === 'atual' ? 'Como você se vê hoje' : 'Como gostaria de ficar'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">
                  {step === 'atual' ? 'Pra cada região, escolhe o nível que mais bate com você agora.' : 'Agora escolhe o nível que você quer alcançar em cada região.'}
                </p>
                <div className="space-y-4">
                  {BODY_REGIONS.map(region => {
                    const target = step === 'atual' ? data.autopercepcaoAtual : data.metaCorpo;
                    const setTarget = (level: 1 | 2 | 3) => {
                      const key = step === 'atual' ? 'autopercepcaoAtual' : 'metaCorpo';
                      update({ [key]: { ...target, [region.id]: level } } as any);
                    };
                    return (
                      <div key={region.id}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5">{region.label}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setTarget(lvl as 1 | 2 | 3)}
                              className={`py-3 px-1.5 rounded-lg border-2 transition-all text-center ${
                                target?.[region.id] === lvl ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <span className={`text-[9px] font-bold leading-tight ${target?.[region.id] === lvl ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                {(REGION_LEVEL_LABELS[region.id] || ['Baixo', 'Médio', 'Alto'])[lvl - 1]}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 'dieta' && (
              <div className={cardCls}>
                <div className="flex items-center gap-2 mb-1">
                  <Utensils className="w-4 h-4 text-blue-600" />
                  <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter">Alimentação</h3>
                </div>
                <div className="space-y-4 mt-3">
                  <div>
                    <label className={labelCls}>O que você gosta de comer?</label>
                    <textarea
                      className={`${inputCls} min-h-[70px] resize-none`}
                      placeholder="Ex: frango, arroz, feijão, batata doce, frutas..."
                      value={data.dieta?.alimentosPreferidos || ''}
                      onChange={(e) => update({ dieta: { ...data.dieta, alimentosPreferidos: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Facilidade pra manter horário das refeições</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['facil', 'medio', 'dificil'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update({ dieta: { ...data.dieta, facilidadeHorarios: opt } })}
                          className={`py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 capitalize ${
                            data.dieta?.facilidadeHorarios === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Pill className="w-3 h-3 text-blue-600" />
                      <label className={labelCls + " mb-0"}>Suplementos que usa</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUPLEMENTOS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSupplement(s)}
                          className={`px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 ${
                            data.dieta?.suplementos?.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Outro suplemento? (opcional)"
                      className={`${inputCls} mt-2`}
                      value={data.dieta?.suplementoOutro || ''}
                      onChange={(e) => update({ dieta: { ...data.dieta, suplementoOutro: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 'agua' && (
              <div className={cardCls}>
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter">Água</h3>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Quantos litros de água você bebe, em média, por dia?</p>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="Ex: 2.5"
                  className={inputCls}
                  value={data.dieta?.aguaLitrosDia || ''}
                  onChange={(e) => update({ dieta: { ...data.dieta, aguaLitrosDia: e.target.value } })}
                />
              </div>
            )}

            {step === 'sono' && (
              <div className={cardCls}>
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter">Sono</h3>
                </div>
                <div className="space-y-4 mt-3">
                  <div>
                    <label className={labelCls}>Qualidade do sono</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['ruim', 'regular', 'boa', 'otima'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update({ sono: { ...data.sono, qualidade: opt } })}
                          className={`py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 capitalize ${
                            data.sono?.qualidade === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Horas de sono por noite</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      placeholder="Ex: 7"
                      className={inputCls}
                      value={data.sono?.horasPorNoite || ''}
                      onChange={(e) => update({ sono: { ...data.sono, horasPorNoite: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 'preTreino' && (
              <div className={cardCls}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <h3 className="text-lg font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter">Pré-treino</h3>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Quer um bloco de ativação muscular antes do treino principal?</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[{ v: true, l: 'Sim, quero' }, { v: false, l: 'Não precisa' }].map(opt => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() => update({ preTreino: { ...data.preTreino, quer: opt.v } })}
                      className={`py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 ${
                        data.preTreino?.quer === opt.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
                {data.preTreino?.quer && (
                  <div>
                    <label className={labelCls}>De quais regiões?</label>
                    <div className="flex flex-wrap gap-2">
                      {BODY_REGIONS.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => togglePreTreinoRegiao(r.id)}
                          className={`px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest border-2 ${
                            data.preTreino?.regioes?.includes(r.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navegação */}
      <div className="p-4 pt-2 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121212]">
        {saved && (
          <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Salvo com sucesso
          </p>
        )}
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'} <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
