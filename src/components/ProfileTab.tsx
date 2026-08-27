/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Weight, Ruler, Dumbbell, Target, Info, AlertTriangle, Apple, Save, LogOut, Trash2, AlertCircle, Fingerprint, HeartPulse, Flame } from 'lucide-react';
import { getFirestoreInstance, auth } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { isBiometricAvailable, isBiometricEnabledOnThisDevice, registerBiometric, disableBiometric, getLocalCredentialId } from '../services/biometricAuth';
import BodyDietProfileTab, { BodyDietProfile } from './BodyDietProfileTab';
import type { AppProfile } from '../types';

interface ProfileTabProps {
  profile: AppProfile | null;
  setProfile: (profile: AppProfile) => void;
  userId?: string;
  onNavigateToTreinador?: () => void;
}

const toScalar = (val: any, fallback: string): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return fallback;
  return String(val);
};

export default function ProfileTab({ profile, setProfile, userId: userIdProp, onNavigateToTreinador }: ProfileTabProps) {
  const db = getFirestoreInstance();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'dados' | 'corpoDieta'>('dados');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(() => isBiometricEnabledOnThisDevice());
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  useEffect(() => {
    isBiometricAvailable().then(setBiometricSupported);
  }, []);

  const handleToggleBiometric = async () => {
    setBiometricError('');
    setBiometricLoading(true);
    const uid = userIdProp || profile?.uid;
    try {
      if (biometricEnabled) {
        await disableBiometric(uid, getLocalCredentialId() || undefined);
        setBiometricEnabled(false);
      } else {
        await registerBiometric(uid, profile?.email);
        setBiometricEnabled(true);
      }
    } catch (err: any) {
      setBiometricError(err.message || 'Não foi possível concluir. Tente novamente.');
    } finally {
      setBiometricLoading(false);
    }
  };
  const [formData, setFormData] = useState({
    name: toScalar(profile?.name, ''),
    age: toScalar(profile?.age, ''),
    weight: toScalar(profile?.weight, ''),
    height: toScalar(profile?.height, ''),
    gender: toScalar(profile?.gender, 'masculino'),
    objective: toScalar(profile?.objective, 'emagrecer'),
    experienceLevel: toScalar(profile?.experienceLevel, 'iniciante'),
    daysPerWeek: toScalar(profile?.daysPerWeek, '3'),
    timePerWorkout: toScalar(profile?.timePerWorkout, '60'),
    injuries: toScalar(profile?.injuries, ''),
    dietaryRestrictions: toScalar(profile?.dietaryRestrictions, '')
  });

  // Keep form fields synchronized if profile loads or updates asynchronously
  React.useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        name: toScalar(profile.name, prev.name),
        age: toScalar(profile.age, prev.age),
        weight: toScalar(profile.weight, prev.weight),
        height: toScalar(profile.height, prev.height),
        gender: toScalar(profile.gender, prev.gender || 'masculino'),
        objective: toScalar(profile.objective, prev.objective || 'emagrecer'),
        experienceLevel: toScalar(profile.experienceLevel, prev.experienceLevel || 'iniciante'),
        daysPerWeek: toScalar(profile.daysPerWeek, prev.daysPerWeek || '3'),
        timePerWorkout: toScalar(profile.timePerWorkout, prev.timePerWorkout || '60'),
        injuries: toScalar(profile.injuries, prev.injuries),
        dietaryRestrictions: toScalar(profile.dietaryRestrictions, prev.dietaryRestrictions)
      }));
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const updatedProfile = {
        ...profile,
        ...formData,
        age: Number(formData.age),
        weight: Number(formData.weight),
        height: Number(formData.height),
        daysPerWeek: Number(formData.daysPerWeek),
        timePerWorkout: Number(formData.timePerWorkout),
        updatedAt: new Date().toISOString()
      };

      await setProfile(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      // Log the full error to help identify the issue
      setError(`Erro: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  const confirmDeleteProfile = async () => {
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      let userId = userIdProp || profile?.uid;
      if (!userId) {
         const savedUser = localStorage.getItem('user');
         if (savedUser) {
           userId = JSON.parse(savedUser).uid;
         }
      }

      if (!userId) {
        throw new Error("Usuário não autenticado.");
      }

      // 1. Apagar documento do usuário no Firestore
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);

      // 2. Apagar a conta real do Firebase Auth também (se a sessão atual for dela)
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (delErr) {
          console.warn("Não foi possível apagar a conta do Firebase Auth:", delErr);
        }
      }

      // 3. Limpar tudo e recarregar
      localStorage.clear();
      sessionStorage.clear();
      setProfile(null);
      window.location.href = '/';
    } catch (err: any) {
      console.error("Erro ao excluir perfil:", err);
      setError(err?.message || 'Ocorreu um erro ao excluir sua conta.');
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };


  const handleSaveBodyDiet = async (bodyDietProfile: BodyDietProfile) => {
    await setProfile({ ...profile, bodyDietProfile });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Meu Perfil</p>
            <h2 className="text-2xl font-[1000] text-slate-900 tracking-tighter leading-none uppercase italic">Configurar Cadastro</h2>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          type="button"
          className="z-50 p-2.5 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-700 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>

      {/* Streak + conquistas -- só aparece se já tem alguma atividade registrada */}
      {(profile?.streak?.count ?? 0) > 0 && (
        <div className="mx-3 mt-3 mb-1 shrink-0 flex items-center gap-3 bg-orange-50 dark:bg-orange-900/10 rounded-2xl px-4 py-3">
          <Flame className="w-6 h-6 text-orange-500 flex-none" />
          <div className="flex-1">
            <p className="text-lg font-black text-orange-600 dark:text-orange-400 leading-none">{profile?.streak?.count} dias seguidos</p>
            <p className="text-[10px] text-orange-500/70 font-bold uppercase tracking-widest mt-0.5">
              Recorde: {profile?.streak?.longestStreak || profile?.streak?.count} · {profile?.totalWorkoutsCompleted || 0} treinos no total
            </p>
          </div>
        </div>
      )}

      {/* Sub-abas */}
      <div className="flex gap-2 p-3 pb-0 shrink-0 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveSubTab('dados')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
            activeSubTab === 'dados' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white text-slate-400 border border-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Dados Pessoais
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('corpoDieta')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
            activeSubTab === 'corpoDieta' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white text-slate-400 border border-slate-200'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" /> Corpo & Dieta
        </button>
      </div>

      {activeSubTab === 'corpoDieta' ? (
        <BodyDietProfileTab
          initial={profile?.bodyDietProfile}
          onSave={handleSaveBodyDiet}
          onComplete={onNavigateToTreinador}
        />
      ) : (
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 pb-24 space-y-6 touch-pan-y">
        {biometricSupported && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-600/10 rounded-2xl flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-tight">Biometria neste aparelho</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Destranca o app com digital/rosto, sem digitar a senha</p>
                {biometricError && <p className="text-[10px] text-red-500 font-bold mt-1">{biometricError}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleBiometric}
              disabled={biometricLoading}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                biometricEnabled ? 'bg-rose-600/10 text-rose-600 border border-rose-600/20' : 'bg-blue-600 text-white'
              }`}
            >
              {biometricLoading ? '...' : biometricEnabled ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Informações Pessoais</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none text-slate-900"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Idade</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none text-slate-900"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sexo</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none appearance-none text-slate-900"
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
                  <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none text-slate-900"
                    value={formData.weight}
                    onChange={e => setFormData({...formData, weight: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Altura (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none text-slate-900"
                    value={formData.height}
                    onChange={e => setFormData({...formData, height: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Fitness Meta */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Protocolo de Treino</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Objetivo Principal</label>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none appearance-none text-slate-900"
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
                <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none appearance-none text-slate-900"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none text-slate-900"
                  value={formData.daysPerWeek}
                  onChange={e => setFormData({...formData, daysPerWeek: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tempo/Treino (min)</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors outline-none text-slate-900"
                  value={formData.timePerWorkout}
                  onChange={e => setFormData({...formData, timePerWorkout: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Restrições */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Restrições & Saúde</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lesões ou Restrições Médicas</label>
              <div className="relative">
                <AlertTriangle className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none h-24 resize-none text-slate-900"
                  placeholder="Ex: Hérnia de disco, dor no joelho..."
                  value={formData.injuries}
                  onChange={e => setFormData({...formData, injuries: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Restrições Alimentares</label>
              <div className="relative">
                <Apple className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none h-24 resize-none text-slate-900"
                  placeholder="Ex: Intolerância à lactose, vegano..."
                  value={formData.dietaryRestrictions}
                  onChange={e => setFormData({...formData, dietaryRestrictions: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"
          >
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center"
          >
            <p className="text-green-500 text-[10px] font-black uppercase tracking-widest">Perfil Atualizado com Sucesso!</p>
          </motion.div>
        )}

        <div className="flex flex-col gap-3">
          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-100 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Sincronizando...' : (
              <>
                <Save className="w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="z-50 w-full py-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] hover:text-red-700 transition-all active:scale-95 disabled:opacity-50"
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
            Excluir Perfil e Dados
          </button>
        </div>
      </form>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
              <div className="flex flex-col items-center text-center gap-4 pt-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Excluir Perfil?</h3>
                <p className="text-sm font-medium text-slate-600">
                  Tem certeza que deseja excluir seu perfil? <span className="text-red-600 font-bold">Esta ação não pode ser desfeita.</span>
                </p>
                
                <div className="flex gap-3 w-full mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={confirmDeleteProfile}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-[11px] outline-none shadow-lg shadow-red-200 transition-all flex justify-center items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Apagando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
