/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestoreInstance, auth } from '../lib/firebase';
import type { AppUser, AppProfile } from '../types';

type ProfileUpdate = AppProfile | ((prev: AppProfile | null) => AppProfile);

interface AuthContextType {
  user: AppUser | null;
  profile: AppProfile | null;
  loading: boolean;
  setProfile: (update: ProfileUpdate) => void;
  setUser: (user: AppUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, setProfile: () => {}, setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fonte de verdade da sessão é o Firebase Auth. Contas ainda não migradas
    // (login antigo por senha no Firestore) continuam funcionando via o
    // fallback de localStorage, mas toda conta que já passou pelo Firebase
    // Auth é carregada por aqui, de forma segura.
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const db = getFirestoreInstance();
          if (db) {
            // O documento do perfil pode ter um ID diferente do uid do Auth
            // (contas migradas mantêm o ID original do Firestore) — busca
            // sempre pelo campo authUid, que é a ligação confiável entre os dois.
            const q = query(collection(db, 'users'), where('authUid', '==', fbUser.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              const data = docSnap.data();
              const fullUser = { uid: docSnap.id, ...data };
              setUser(fullUser);
              setProfile(data);
              localStorage.setItem('user', JSON.stringify(fullUser));
              localStorage.setItem('profile', JSON.stringify(data));
              localStorage.setItem('ironmind_user', JSON.stringify(data));
            }
          }
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Sem sessão no Firebase Auth — checa se existe uma sessão legada
      // (conta que ainda não fez login desde a migração).
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          const db = getFirestoreInstance();
          if (db) {
            const docRef = doc(db, 'users', parsedUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setProfile(data);
              localStorage.setItem('profile', JSON.stringify(data));
              localStorage.setItem('ironmind_user', JSON.stringify(data));
            }
          }
        } catch (error) {
          console.error("Erro ao carregar perfil legado:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setUserAndStorage = (user: AppUser | null) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    setUser(user);
  };

  const updateProfile = async (update: ProfileUpdate) => {
    const newProfile = typeof update === 'function' ? update(profile) : update;
    setProfile(newProfile);
    if (newProfile) {
      localStorage.setItem('profile', JSON.stringify(newProfile));
      localStorage.setItem('ironmind_user', JSON.stringify(newProfile));
    }
    if (user && newProfile) {
      try {
        const db = getFirestoreInstance();
        if (db) {
          await Promise.race([
            setDoc(doc(db, 'users', user.uid), newProfile, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
        }
      } catch (error) {
        console.error("Erro update perfil:", error);
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile: updateProfile, setUser: setUserAndStorage }}>
      {children}
    </AuthContext.Provider>
  );
};
