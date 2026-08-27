import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Dumbbell, ArrowRight, X } from 'lucide-react';
import { getFirestoreInstance, auth } from '../lib/firebase';
import { collection, query, where, getDocs, getDoc, setDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from './AuthProvider';
import emailjs from '@emailjs/browser';

interface LoginProps {
  onRegister: () => void;
}

export default function Login({ onRegister }: LoginProps) {
  const db = getFirestoreInstance();
  const { setUser, setProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'newPass'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState('');
  const [forgotResult, setForgotResult] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Tenta login real via Firebase Auth primeiro.
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const fbUid = credential.user.uid;

        // Busca DIRETO pelo ID do documento primeiro -- é o caminho que
        // as regras de segurança novas permitem sem exceção nenhuma
        // (allow ... if request.auth.uid == userId, onde userId é
        // literalmente o ID do documento). Cadastros novos (Register.tsx)
        // sempre criam o documento com ID = uid do Firebase Auth, então
        // isso cobre o caso comum sem precisar de nenhuma regra especial.
        const directDoc = await getDoc(doc(db, 'users', fbUid));
        if (directDoc.exists()) {
          setProfile(directDoc.data());
          setUser({ uid: directDoc.id, ...directDoc.data() });
          setLoading(false);
          return;
        }

        // Fallback: contas antigas migradas podem ter o documento com um
        // ID diferente do uid do Auth, só vinculado pelo campo authUid.
        // Essa busca por campo (não por ID) só funciona se as regras do
        // projeto tiverem uma exceção pra isso -- se não tiverem (caso
        // de um projeto novo, sem contas assim), ela é recusada e cai
        // no catch abaixo, seguindo pro fallback legado normalmente.
        const linkedQuery = query(collection(db, 'users'), where('authUid', '==', fbUid));
        const linkedSnap = await getDocs(linkedQuery);

        if (!linkedSnap.empty) {
          const userDoc = linkedSnap.docs[0];
          setProfile(userDoc.data());
          setUser({ uid: userDoc.id, ...userDoc.data() });
          setLoading(false);
          return;
        }

        // Conta existe no Auth (senha já comprovada de verdade) mas ainda não
        // está vinculada a nenhum perfil — tenta achar pelo e-mail e concluir
        // o vínculo agora. As regras do Firestore permitem essa leitura/escrita
        // especificamente quando o e-mail do token bate com o do documento e
        // ele ainda não tem authUid, então isso funciona sem precisar abrir
        // as regras manualmente.
        const byEmailQuery = query(collection(db, 'users'), where('email', '==', email));
        const byEmailSnap = await getDocs(byEmailQuery);
        if (!byEmailSnap.empty) {
          const legacyDoc = byEmailSnap.docs[0];
          const legacyData = legacyDoc.data();
          await updateDoc(doc(db, 'users', legacyDoc.id), {
            authUid: fbUid,
            password: deleteField()
          });
          legacyData.authUid = fbUid;
          delete legacyData.password;
          setProfile(legacyData);
          setUser({ uid: legacyDoc.id, ...legacyData });
          setLoading(false);
          return;
        }

        setError('Perfil não encontrado para esta conta.');
        setLoading(false);
        return;
      } catch (authErr: any) {
        // Login via Firebase Auth falhou (senha errada, ou conta ainda não migrada).
        // Segue pro fallback legado abaixo.
      }

      // 2. Fallback legado: conta ainda não migrada pro Firebase Auth.
      // Num projeto novo (sem contas antigas pré-Firebase-Auth), essa
      // busca sem estar logado ainda é justamente recusada pelas regras
      // de segurança normais (só permitem ler o próprio documento,
      // sem exceção pra buscas por e-mail de quem ainda não logou) --
      // isso é o esperado aqui, não uma falha de conexão de verdade.
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (permErr: any) {
        if (permErr?.code === 'permission-denied') {
          setError('Usuário não encontrado.');
          setLoading(false);
          return;
        }
        throw permErr;
      }

      if (querySnapshot.empty) {
        setError('Usuário não encontrado.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Simple encryption check using SHA-256
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      let legacyMatch = false;
      try {
        legacyMatch = userData.password === btoa(password);
      } catch (e) {
        // Ignored if btoa fails due to non-latin1 chars
      }

      const plaintextMatch = userData.password === password;
      const shaMatch = userData.password === hashedPassword;

      if (!shaMatch && !legacyMatch && !plaintextMatch) {
        setError('Senha inválida.');
        setLoading(false);
        return;
      }

      // Senha bateu no esquema antigo — migra a conta pro Firebase Auth agora,
      // silenciosamente, e remove a senha do Firestore (ela não deve mais viver lá).
      try {
        let migratedUid: string;
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          migratedUid = credential.user.uid;
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            // Já foi migrada numa sessão anterior que não terminou de limpar o Firestore.
            const credential = await signInWithEmailAndPassword(auth, email, password);
            migratedUid = credential.user.uid;
          } else {
            throw createErr;
          }
        }
        await updateDoc(doc(db, 'users', userDoc.id), {
          authUid: migratedUid,
          password: deleteField()
        });
        userData.authUid = migratedUid;
        delete userData.password;
      } catch (migrateErr) {
        // Não bloqueia o login se a migração falhar (ex: sem conexão) —
        // só tenta de novo no próximo login.
        console.warn("Falha ao migrar conta para Firebase Auth:", migrateErr);
      }

      setProfile(userData);
      setUser({ uid: userDoc.id, ...userData });
      
    } catch (err: any) {
      console.error("Login error:", err);
      setError('Erro de conexão.');
      setLoading(false);
    }
  };


  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setForgotError('');
    setForgotResult('');

    try {
      if (resetStep === 'email') {
        // 1. Tenta o reset nativo e seguro do Firebase Auth primeiro — só funciona
        // se a conta já foi migrada (tem authUid). O próprio Firebase cuida do
        // link seguro por e-mail, sem depender do nosso EmailJS.
        try {
          await sendPasswordResetEmail(auth, forgotEmail);
          setForgotResult('Enviamos um link de redefinição de senha para seu e-mail. Verifique também a caixa de spam.');
          setLoading(false);
          return;
        } catch (fbErr: any) {
          if (fbErr.code !== 'auth/user-not-found') {
            console.warn('Reset nativo do Firebase falhou, tentando fallback legado:', fbErr);
          }
          // Continua pro fallback legado abaixo (conta ainda não migrada, ou realmente não existe).
        }

        // 2. Fallback legado: conta ainda não passou pelo Firebase Auth.
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', forgotEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Default success message to not leak emails
          setForgotResult('Se este e-mail estiver cadastrado, um código foi enviado.');
          setLoading(false);
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        setResetUserId(userId);

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

        await updateDoc(doc(db, 'users', userId), {
          resetCode: code,
          resetExpires: expiresAt
        });

        // Send via EmailJS or Log
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
          try {
            await emailjs.send(serviceId, templateId, {
              to_email: forgotEmail,
              message: `Seu código de recuperação IronMind é: ${code}. Validade de 15 minutos. Caso não tenha solicitado, ignore este email.`,
              reply_to: "no-reply@ironmind.com"
            }, publicKey);
            setForgotResult('Código enviado para seu e-mail.');
          } catch (emailErr) {
            console.error("EmailJS sender failed. Showing code securely in dev-mode as fallback.", emailErr);
            setForgotResult(`(Aviso: Serviço de E-mail indisponível). Seu código é: ${code}`);
          }
        } else {
          console.warn("EmailJS configs missing. Fallback mode. RESET CODE:", code);
          setForgotResult(`(Modo Dev) Seu código é: ${code}`);
        }

        setResetStep('code');
      } else if (resetStep === 'code') {
        if (!resetUserId) return;
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', forgotEmail)));
        if (userDoc.empty) return;
        
        const data = userDoc.docs[0].data();
        if (data.resetCode === resetCodeInput && data.resetExpires && data.resetExpires > Date.now()) {
          setResetStep('newPass');
          setForgotResult('');
        } else {
          setForgotError('Código inválido ou expirado.');
        }
      } else if (resetStep === 'newPass') {
        if (!resetUserId) return;

        const msgUint8 = new TextEncoder().encode(newPasswordInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await updateDoc(doc(db, 'users', resetUserId), {
          password: hashedPassword,
          // Depois de um reset pelo fluxo antigo, a senha do Firebase Auth (se existir)
          // fica desatualizada. Removemos o vínculo authUid pra forçar o próximo login
          // a usar o fallback legado (com a senha nova) em vez de tentar o Auth
          // desatualizado — evita usuário ficar preso.
          authUid: deleteField(),
          resetCode: null,
          resetExpires: null
        });

        setForgotResult('Senha atualizada com sucesso! Você já pode fazer login.');
        setTimeout(() => {
          setShowForgotPass(false);
          setResetStep('email');
          setForgotEmail('');
          setResetCodeInput('');
          setNewPasswordInput('');
          setForgotResult('');
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      setForgotError('Ocorreu um erro no servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="mb-12 text-center relative">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block relative"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 rounded-[4px] flex items-center justify-center shadow-[10px_10px_20px_rgba(0,0,0,0.6),inset_2px_2px_5px_white] border-2 border-slate-600 mb-6">
              <Dumbbell className="w-12 h-12 text-slate-900 transform -rotate-12" />
            </div>
            <div className="absolute -top-4 -right-4 bg-blue-600 text-[8px] font-black px-3 py-1 rounded-full border border-blue-400 uppercase tracking-[0.2em] shadow-lg animate-pulse">Neural Core V2</div>
          </motion.div>
          <h1 className="text-4xl font-[1000] uppercase tracking-tighter italic flex items-center justify-center gap-1 leading-none">
            <span className="text-slate-100">Iron</span>
            <span className="text-blue-500">Mind</span>
          </h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em] mt-3">Advanced Performance OS</p>
        </div>

        {showForgotPass ? (
          <form onSubmit={handleForgotSubmit} className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-black uppercase tracking-widest">Recuperar Acesso</h2>
              <button type="button" onClick={() => setShowForgotPass(false)} className="text-slate-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {forgotError && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {forgotError}
              </p>
            )}

            {forgotResult && (
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest text-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                {forgotResult}
              </p>
            )}

            {resetStep === 'email' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="Seu e-mail"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {resetStep === 'code' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Código de 6 dígitos</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none text-center tracking-[1em]"
                    placeholder="000000"
                    value={resetCodeInput}
                    onChange={e => setResetCodeInput(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            )}

            {resetStep === 'newPass' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                    placeholder="Nova senha secreta"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-500/10 hover:bg-blue-500 transition-all hover:gap-5 active:scale-95 disabled:opacity-50"
              disabled={loading || (resetStep === 'newPass' && !!forgotResult && !forgotError)}
            >
              {loading ? 'Processando...' : 
                resetStep === 'email' ? 'Enviar Código' : 
                resetStep === 'code' ? 'Validar Código' : 
                'Atualizar Senha'
              }
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Acesso Neural</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chave de Segurança</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForgotPass(true);
                    setResetStep('email');
                    setForgotEmail(email);
                    setForgotError('');
                    setForgotResult('');
                  }} 
                  className="text-blue-500 text-[10px] uppercase font-bold hover:text-blue-400"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-600 transition-colors outline-none"
                  placeholder="Sua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-500/10 hover:bg-blue-500 transition-all hover:gap-5 active:scale-95 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Sincronizando...' : 'Autenticar Protocolo'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
              

            </div>
          </form>
        )}

        <div className="mt-8 pt-8 border-t border-slate-900 text-center">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-4">Novo no ecossistema?</p>
          <button 
            onClick={onRegister}
            className="text-blue-500 text-[11px] font-black uppercase tracking-[0.2em] hover:text-blue-400 transition-colors"
          >
            Criar Perfil IronMind
          </button>
        </div>
      </div>
    </div>
  );
}
