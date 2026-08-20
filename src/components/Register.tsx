import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Calendar, Weight, Ruler, ChevronRight, ChevronLeft, Dumbbell, Target, Info, AlertTriangle, Apple } from 'lucide-react';
import { getFirestoreInstance, auth } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './AuthProvider';

interface RegisterProps {
  onBack: () => void;
}

export default function Register({ onBack }: RegisterProps) {
  const db = getFirestoreInstance();
  const { setProfile, setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    weight: '',
    height: '',
    gender: 'masculino',
    objective: 'emagrecer',
    experienceLevel: 'iniciante',
    daysPerWeek: '3',
    timePerWorkout: '60',
    injuries: '',
    dietaryRestrictions: ''
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      nextStep();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Confere duplicidade de e-mail no Firestore antes de criar a conta
      // (mensagem de erro mais amigável do que deixar o Firebase Auth recusar).
      // Nota: como criar a conta agora exige o Firebase Auth (rede obrigatória),
      // não é mais possível cadastrar em modo totalmente offline como antes.
      const usersRef = collection(db, 'users');
      const dupQuery = query(usersRef, where('email', '==', formData.email));
      const dupSnapshot = await Promise.race([
        getDocs(dupQuery),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido ao conectar. Verifique sua internet e tente novamente.')), 10000))
      ]);
      if (!dupSnapshot.empty) {
        setError('Este e-mail já está cadastrado.');
        setLoading(false);
        return;
      }

      // Cria a conta de verdade no Firebase Authentication — a senha nunca
      // é salva no Firestore, fica só sob custódia do Firebase Auth.
      const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = credential.user.uid;

      // Save profile to Firestore
      const profile = {
        uid,
        authUid: uid,
        email: formData.email,
        name: formData.name,
        age: Number(formData.age),
        weight: Number(formData.weight),
        height: Number(formData.height),
        gender: formData.gender,
        objective: formData.objective,
        experienceLevel: formData.experienceLevel,
        daysPerWeek: Number(formData.daysPerWeek),
        timePerWorkout: Number(formData.timePerWorkout),
        injuries: formData.injuries,
        dietaryRestrictions: formData.dietaryRestrictions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Sempre salva no localStorage primeiro (Backup)
      localStorage.setItem('user', JSON.stringify({ uid, ...profile }));
      localStorage.setItem('profile', JSON.stringify(profile));

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite excedido ao conectar ao servidor. O perfil foi salvo localmente.')), 10000)
        );

        await Promise.race([
          setDoc(doc(db, 'users', uid), profile),
          timeoutPromise
        ]);
      } catch (err: any) {
        console.warn("Aviso do Firestore:", err);
        // Se falhar (timeout ou offline), avisa o usuário mas continua com o backup local
        alert(err.message || "Aviso: Sem conexão. Seu cadastro foi salvo no modo offline (local).");
      }

      // Update global context so the App unmounts the Register component
      setUser({ uid, ...profile });
      setProfile(profile);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('Senha muito fraca — use pelo menos 6 caracteres.');
      } else {
        setError(err.message || 'Erro ao finalizar o cadastro. Tente novamente.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 p-2 px-4 rounded-full border border-blue-600/20 mb-4">
             <Dumbbell className="w-4 h-4 text-blue-500" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Novo Protocolo Neural</span>
          </div>
          <h1 className="text-3xl font-[1000] uppercase tracking-tighter italic">
            Crie sua Conta
          </h1>
          <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-widest">Passo {step} de 4</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="ex@email.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="Seu Nome"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Idade</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="number" 
                      required
                      className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                      placeholder="25"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sexo</label>
                  <select 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none appearance-none"
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Peso (kg)</label>
                  <div className="relative">
                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="number" 
                      required
                      className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                      placeholder="80"
                      value={formData.weight}
                      onChange={e => setFormData({...formData, weight: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Altura (cm)</label>
                  <div className="relative">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="number" 
                      required
                      className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                      placeholder="180"
                      value={formData.height}
                      onChange={e => setFormData({...formData, height: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Objetivo Principal</label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none appearance-none"
                    value={formData.objective}
                    onChange={e => setFormData({...formData, objective: e.target.value})}
                  >
                    <option value="emagrecer">Emagrecer / Perda de Gordura</option>
                    <option value="ganhar massa">Ganhar Massa Muscular</option>
                    <option value="definir">Definição Muscular</option>
                    <option value="saúde">Manutenção / Saúde</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nível de Experiência</label>
                <div className="relative">
                  <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none appearance-none"
                    value={formData.experienceLevel}
                    onChange={e => setFormData({...formData, experienceLevel: e.target.value})}
                  >
                    <option value="iniciante">Iniciante (0-1 ano)</option>
                    <option value="intermediário">Intermediário (1-3 anos)</option>
                    <option value="avançado">Avançado (3+ anos)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dias p/ Semana</label>
                  <input 
                    type="number" 
                    min="1" max="7"
                    required
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="3"
                    value={formData.daysPerWeek}
                    onChange={e => setFormData({...formData, daysPerWeek: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tempo/Treino (min)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 px-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="60"
                    value={formData.timePerWorkout}
                    onChange={e => setFormData({...formData, timePerWorkout: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lesões ou Restrições Médicas</label>
                <div className="relative">
                  <AlertTriangle className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                  <textarea 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none h-24 resize-none"
                    placeholder="Ex: Hérnia de disco, dor no joelho..."
                    value={formData.injuries}
                    onChange={e => setFormData({...formData, injuries: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Restrições Alimentares</label>
                <div className="relative">
                  <Apple className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                  <textarea 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none h-24 resize-none"
                    placeholder="Ex: Intolerância à lactose, vegano..."
                    value={formData.dietaryRestrictions}
                    onChange={e => setFormData({...formData, dietaryRestrictions: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            {step > 1 && (
              <button 
                type="button"
                onClick={prevStep}
                className="flex-1 py-4 border-2 border-slate-800 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-colors"
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            <button 
              type="submit"
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors active:scale-95 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Processando...' : step === 4 ? 'Finalizar Cadastro' : 'Continuar'}
              {!loading && step < 4 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </form>

        <button 
          onClick={onBack}
          className="w-full mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-slate-400 transition-colors"
          disabled={loading}
        >
          Já tenho uma conta
        </button>
      </div>
    </div>
  );
}
