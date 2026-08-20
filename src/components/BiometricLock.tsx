import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Fingerprint, Dumbbell, LogOut } from 'lucide-react';
import { unlockWithBiometric } from '../services/biometricAuth';

interface BiometricLockProps {
  userId: string;
  onUnlocked: () => void;
  onUseLoginInstead: () => void;
}

export default function BiometricLock({ userId, onUnlocked, onUseLoginInstead }: BiometricLockProps) {
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleUnlock = async () => {
    setChecking(true);
    setError('');
    try {
      const ok = await unlockWithBiometric(userId);
      if (ok) {
        onUnlocked();
      } else {
        setError('Biometria não confere. Tente novamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Não foi possível verificar a biometria.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-block relative mb-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 rounded-[4px] flex items-center justify-center shadow-[10px_10px_20px_rgba(0,0,0,0.6),inset_2px_2px_5px_white] border-2 border-slate-600">
            <Dumbbell className="w-10 h-10 text-slate-900 transform -rotate-12" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-[1000] uppercase tracking-tighter italic mb-2">
          <span className="text-slate-100">Iron</span><span className="text-blue-500">Mind</span>
        </h1>
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em] mb-12">Acesso Protegido</p>

        <button
          onClick={handleUnlock}
          disabled={checking}
          className="w-24 h-24 mx-auto rounded-full bg-blue-600/10 border-2 border-blue-600/30 flex items-center justify-center mb-6 hover:bg-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <Fingerprint className={`w-10 h-10 text-blue-500 ${checking ? 'animate-pulse' : ''}`} />
        </button>

        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-8">
          {checking ? 'Verificando...' : 'Toque para desbloquear'}
        </p>

        {error && (
          <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20 mb-6">
            {error}
          </p>
        )}

        <button
          onClick={onUseLoginInstead}
          className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors flex items-center gap-2 mx-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          Entrar com senha
        </button>
      </div>
    </div>
  );
}
