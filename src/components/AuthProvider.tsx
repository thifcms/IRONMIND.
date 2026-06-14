/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  setProfile: (profile: any) => void;
  setUser: (user: any | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, setProfile: () => {}, setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      const fetchProfile = async () => {
        try {
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
          console.error("Erro ao carregar perfil:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const setUserAndStorage = (user: any | null) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    setUser(user);
  };

  const updateProfile = async (update: any) => {
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
