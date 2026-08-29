import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, Award, Clock, Scale, Ruler, Plus, Dumbbell, Activity, Sparkles, Bike } from 'lucide-react';
import { WeightEntry, MeasurementEntry, LoadEntry, CheckinEntry, AppProfile, CardioSession } from '../types';
import WeeklyInsights from './WeeklyInsights';

interface HistoryTabProps {
  weightHistory: WeightEntry[];
  setWeightHistory: React.Dispatch<React.SetStateAction<WeightEntry[]>>;
  measurementHistory: MeasurementEntry[];
  setMeasurementHistory: React.Dispatch<React.SetStateAction<MeasurementEntry[]>>;
  loadHistory: LoadEntry[];
  setLoadHistory: React.Dispatch<React.SetStateAction<LoadEntry[]>>;
  checkinHistory: CheckinEntry[];
  cardioSessionHistory: CardioSession[];
  userProfile: AppProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<AppProfile>>;
  onClearHistory: () => void;
  onClearChat: () => void;
  onClearTraining: () => void;
  onClearDiet: () => void;
  onHardReset: () => void;
}

export default function HistoryTab({ 
  weightHistory, 
  setWeightHistory, 
  measurementHistory,
  setMeasurementHistory,
  loadHistory,
  setLoadHistory,
  checkinHistory,
  cardioSessionHistory,
  userProfile, 
  setUserProfile,
  onClearHistory,
  onClearChat,
  onClearTraining,
  onClearDiet,
  onHardReset
}: HistoryTabProps) {
  const [newWeight, setNewWeight] = useState('');
  const [newHeight, setNewHeight] = useState(userProfile.height?.toString() || '');
  
  const [newMeasureLabel, setNewMeasureLabel] = useState('');
  const [newMeasureValue, setNewMeasureValue] = useState('');
  
  const [newLoadExercise, setNewLoadExercise] = useState('');
  const [newLoadWeight, setNewLoadWeight] = useState('');
  const [selectedChartExercise, setSelectedChartExercise] = useState<string>('');

  // Progressão automática de carga: olha as duas ultimas cargas de cada
  // exercicio e sugere o proximo peso. Se so tem 1 registro, sugere
  // manter (ainda nao ha tendencia). Se a ultima manteve ou subiu em
  // relacao a anterior, sugere +2.5kg (incremento minimo tipico de
  // anilha). Se caiu (ex: deload ou fadiga), sugere manter a ultima
  // carga em vez de aumentar, pra consolidar antes de progredir de novo.
  const exerciseNames = useMemo(() => {
    const set = new Set<string>();
    (loadHistory || []).forEach(l => set.add(l.exercise));
    return Array.from(set);
  }, [loadHistory]);

  const suggestNextLoad = (exercise: string): { weight: number; reason: string } | null => {
    const entries = (loadHistory || [])
      .filter(l => l.exercise === exercise)
      .sort((a, b) => a.date - b.date);
    if (entries.length === 0) return null;
    const last = entries[entries.length - 1];
    if (entries.length === 1) {
      return { weight: last.weight, reason: 'Primeiro registro -- mantenha essa carga na próxima sessão pra criar uma base de comparação.' };
    }
    const prev = entries[entries.length - 2];
    if (last.weight >= prev.weight) {
      return { weight: Math.round((last.weight + 2.5) * 2) / 2, reason: 'Você segurou ou subiu a carga da última vez -- hora de progredir mais um pouco.' };
    }
    return { weight: last.weight, reason: 'A carga caiu na última sessão (fadiga ou deload) -- consolide nesse peso antes de subir de novo.' };
  };

  const loadChartData = useMemo(() => {
    if (!selectedChartExercise) return [];
    return (loadHistory || [])
      .filter(l => l.exercise === selectedChartExercise)
      .sort((a, b) => a.date - b.date)
      .map(l => ({
        date: new Date(l.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        peso: l.weight,
      }));
  }, [loadHistory, selectedChartExercise]);

  useEffect(() => {
    if (!selectedChartExercise && exerciseNames.length > 0) {
      setSelectedChartExercise(exerciseNames[exerciseNames.length - 1]);
    }
  }, [exerciseNames, selectedChartExercise]);

  const addWeightEntry = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;
    setWeightHistory(prev => [...prev, { date: Date.now(), weight }]);
    setNewWeight('');
  };

  const addMeasurement = () => {
    const val = parseFloat(newMeasureValue);
    if (!newMeasureLabel || isNaN(val)) return;
    setMeasurementHistory(prev => [...prev, { date: Date.now(), label: newMeasureLabel, value: val, unit: 'cm' }]);
    setNewMeasureLabel('');
    setNewMeasureValue('');
  };

  const addLoad = () => {
    const w = parseFloat(newLoadWeight);
    if (!newLoadExercise || isNaN(w)) return;
    setLoadHistory(prev => [...prev, { date: Date.now(), exercise: newLoadExercise, weight: w }]);
    setNewLoadExercise('');
    setNewLoadWeight('');
  };

  const updateHeight = () => {
    const height = parseFloat(newHeight);
    if (isNaN(height) || height <= 0) return;
    setUserProfile(prev => ({ ...prev, height }));
  };

  const bmiData = (weightHistory || []).map(entry => {
    const heightM = (userProfile.height || 0) / 100;
    const imc = heightM > 0 ? entry.weight / (heightM * heightM) : 0;
    return {
      date: new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      imc: parseFloat(imc.toFixed(1)),
      weight: entry.weight
    };
  });

  const currentIMC = bmiData.length > 0 ? bmiData[bmiData.length - 1].imc : 0;
  
  const getIMCCategory = (imc: number) => {
    if (imc <= 0) return { label: 'Sem registros', color: 'text-slate-400' };
    if (imc < 18.5) return { label: 'Abaixo do peso', color: 'text-amber-500' };
    if (imc < 25) return { label: 'Peso normal', color: 'text-emerald-500' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'text-amber-500' };
    return { label: 'Obesidade', color: 'text-rose-500' };
  };

  const imcCategory = getIMCCategory(currentIMC);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden transition-colors duration-300">
      <header className="flex flex-col gap-4 bg-white p-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Performance</p>
              <h2 className="text-2xl font-[1000] text-slate-900 tracking-tighter leading-none uppercase italic">Dashboard Histórico</h2>
            </div>
          </div>
          
          <button 
            onClick={onHardReset}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95"
          >
            Limpeza Total
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onClearChat}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-200"
          >
            Zerar Chat
          </button>
          <button 
            onClick={onClearTraining}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-200"
          >
            Zerar Treino
          </button>
          <button 
            onClick={onClearDiet}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-200"
          >
            Zerar Dieta
          </button>
          <button 
            onClick={onClearHistory}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-200"
          >
            Zerar Medidas
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 touch-pan-y">
        <WeeklyInsights
          weightHistory={weightHistory}
          loadHistory={loadHistory}
          checkinHistory={checkinHistory}
          userProfile={userProfile}
        />

        {/* Resumo de Frequência (Anteriormente existente) */}
        <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-1.5 text-slate-400 mb-1">
             <Calendar className="w-3.5 h-3.5" />
             <span className="text-[8px] font-black uppercase tracking-tight">Frequência Semanal</span>
           </div>
           <p className="text-xl font-black text-slate-900 leading-none">85%</p>
           <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 w-[85%]"></div>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-1.5 text-slate-400 mb-1">
             <Clock className="w-3.5 h-3.5" />
             <span className="text-[8px] font-black uppercase tracking-tight">Assiduidade</span>
           </div>
           <p className="text-xl font-black text-slate-900 leading-none">22d</p>
           <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Este mês</span>
        </div>
      </div>

      {/* Biometria & IMC */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Biometria e IMC</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" 
                placeholder="Peso (kg)"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              />
            </div>
            <button 
              onClick={addWeightEntry}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 items-end pt-2 border-t border-slate-100">
            <div className="flex-1 relative">
              <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" 
                placeholder="Altura (cm)"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              />
            </div>
            <button 
              onClick={updateHeight}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              Definir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
             <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Peso Atual</p>
             <p className="text-xl font-black text-slate-900">{weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : '--'} kg</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
             <p className="text-[8px] font-black uppercase text-slate-400 mb-1">IMC Atual</p>
             <div className="flex items-baseline gap-2">
               <p className="text-xl font-black text-slate-900">{currentIMC || '--'}</p>
               <span className={`text-[7px] font-bold uppercase ${imcCategory.color}`}>{imcCategory.label}</span>
             </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Curva de IMC</h3>
          </div>
          <div className="h-40 w-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            {bmiData.length === 0 ? (
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center p-4">Registe um novo peso acima para traçar a evolução do IMC</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bmiData}>
                  <defs>
                    <linearGradient id="colorImc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      fontSize: '10px', 
                      border: 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#1e293b',
                      color: '#f8fafc'
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                  />
                  <Area type="monotone" dataKey="imc" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorImc)" dot={{ r: 3, fill: '#2563eb' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Peso ao Longo do Tempo</h3>
          </div>
          <div className="h-40 w-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            {bmiData.length === 0 ? (
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center p-4">Registre um novo peso acima pra ver a evolução aqui</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bmiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      fontSize: '10px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#1e293b',
                      color: '#f8fafc'
                    }}
                    formatter={(value: any) => [`${value} kg`, 'Peso']}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3, fill: '#0ea5e9' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Medidas Corporais */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Medidas Corporais</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Local (Braço, Coxa...)"
              value={newMeasureLabel}
              onChange={(e) => setNewMeasureLabel(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            />
            <input 
              type="number" 
              placeholder="cm"
              value={newMeasureValue}
              onChange={(e) => setNewMeasureValue(e.target.value)}
              className="w-16 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            />
            <button 
              onClick={addMeasurement}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-slate-900">
            {measurementHistory.length === 0 ? (
              <p className="col-span-2 text-center py-4 text-[10px] text-slate-400 font-bold uppercase">Nenhuma medida registrada</p>
            ) : (
              (measurementHistory?.slice(-6) || []).map((m, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{m.label}</span>
                  <span className="text-xs font-black">{m.value} {m.unit}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Histórico de Carga */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Histórico de Carga Única</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Exercicio"
              value={newLoadExercise}
              onChange={(e) => setNewLoadExercise(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            />
            <input 
              type="number" 
              placeholder="kg"
              value={newLoadWeight}
              onChange={(e) => setNewLoadWeight(e.target.value)}
              className="w-16 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            />
            <button 
              onClick={addLoad}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {loadHistory.length === 0 ? (
              <p className="text-center py-4 text-[10px] text-slate-400 font-bold uppercase">Nenhum recorde de carga</p>
            ) : (
              (loadHistory?.slice(-5).reverse() || []).map((l, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-900 leading-none">{l.exercise}</span>
                    <span className="text-[8px] text-slate-400 mt-1 font-bold">{new Date(l.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-600">{l.weight} kg</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Histórico de Cardio */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bike className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Histórico de Cardio</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          {(!cardioSessionHistory || cardioSessionHistory.length === 0) ? (
            <p className="text-center py-4 text-[10px] text-slate-400 font-bold uppercase">Nenhuma sessão de cardio registrada</p>
          ) : (
            (cardioSessionHistory.slice(-5).reverse()).map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-900 leading-none capitalize">{s.type}</span>
                  <span className="text-[8px] text-slate-400 mt-1 font-bold">{new Date(s.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-blue-600">{s.distance}km</span>
                    <span className="text-[8px] text-slate-400 font-bold">{s.time}min</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">{s.calories}kcal</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Progressão de Carga */}
      {exerciseNames.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Progressão de Carga</h3>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <select
              value={selectedChartExercise}
              onChange={(e) => setSelectedChartExercise(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exerciseNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <div className="h-40 w-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              {loadChartData.length < 2 ? (
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center p-4">Registre pelo menos 2 cargas desse exercício pra ver o gráfico</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={loadChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        fontSize: '10px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#1e293b',
                        color: '#f8fafc'
                      }}
                      formatter={(value: any) => [`${value} kg`, 'Carga']}
                      itemStyle={{ color: '#f8fafc' }}
                      labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                    />
                    <Line type="monotone" dataKey="peso" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3, fill: '#7c3aed' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {selectedChartExercise && suggestNextLoad(selectedChartExercise) && (
              <div className="flex items-start gap-2.5 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-700">
                    Sugestão pra próxima sessão: {suggestNextLoad(selectedChartExercise)!.weight} kg
                  </p>
                  <p className="text-[9px] text-blue-600/80 mt-0.5">{suggestNextLoad(selectedChartExercise)!.reason}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer Design */}
      <div className="bg-blue-600 p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-blue-100">
         <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
         </div>
         <div className="flex-1">
           <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest leading-none">Status do Atleta</p>
           <p className="text-base font-black text-white italic uppercase tracking-tight">Evolução em Progresso</p>
         </div>
         <TrendingUp className="w-8 h-8 text-white/20" />
      </div>
    </div>
  </div>
  );
}
