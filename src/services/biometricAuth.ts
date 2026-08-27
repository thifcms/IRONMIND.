import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirestoreInstance, auth } from '../lib/firebase';
import { apiUrl } from './apiBase';

/**
 * Biometria como login de verdade -- substitui email/senha, igual a
 * maioria dos apps do mercado. A digital/rosto confirma "é você mesmo"
 * via WebAuthn (verificação criptográfica real, não decorativa) e o
 * backend emite uma sessão nova do Firebase Auth (Custom Token) --
 * não depende de já existir uma sessão salva no aparelho.
 *
 * Antes disso, sem credencial de administrador de verdade no backend,
 * só dava pra "reconfirmar" uma sessão que já estava salva -- se ela
 * expirasse (comum no Safari/iOS), sempre voltava a pedir email/senha
 * antes de conseguir usar a biometria de novo. Resolvido com a
 * migração pro projeto Firebase com credencial de admin.
 */

const LOCAL_FLAG_KEY = 'ironmind_biometric_enabled';
const LOCAL_CREDENTIAL_ID_KEY = 'ironmind_biometric_credential_id';
const LOCAL_USER_ID_KEY = 'ironmind_biometric_user_id';

export function isBiometricEnabledOnThisDevice(): boolean {
  return localStorage.getItem(LOCAL_FLAG_KEY) === 'true';
}

export function getLocalCredentialId(): string | null {
  return localStorage.getItem(LOCAL_CREDENTIAL_ID_KEY);
}

/** UserId salvo localmente pra saber de quem tentar o login por
 *  biometria antes mesmo de existir qualquer sessão ativa. */
export function getLocalBiometricUserId(): string | null {
  return localStorage.getItem(LOCAL_USER_ID_KEY);
}

export function setBiometricEnabledOnThisDevice(enabled: boolean, credentialId?: string, userId?: string) {
  if (enabled) {
    localStorage.setItem(LOCAL_FLAG_KEY, 'true');
    if (credentialId) localStorage.setItem(LOCAL_CREDENTIAL_ID_KEY, credentialId);
    if (userId) localStorage.setItem(LOCAL_USER_ID_KEY, userId);
  } else {
    localStorage.removeItem(LOCAL_FLAG_KEY);
    localStorage.removeItem(LOCAL_CREDENTIAL_ID_KEY);
    localStorage.removeItem(LOCAL_USER_ID_KEY);
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Ativa a biometria: registra uma credencial nova e salva no Firestore do próprio usuário. */
export async function registerBiometric(userId: string, email: string): Promise<void> {
  const optsRes = await fetch(apiUrl('/api/webauthn/register-options'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email }),
  });
  if (!optsRes.ok) throw new Error((await optsRes.json()).error || 'Falha ao iniciar registro.');
  const { flowId, options } = await optsRes.json();

  const attestationResponse = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch(apiUrl('/api/webauthn/register-verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flowId, response: attestationResponse }),
  });
  if (!verifyRes.ok) throw new Error((await verifyRes.json()).error || 'Falha ao verificar biometria.');
  const { credential } = await verifyRes.json();

  // Grava no Firestore como o próprio usuário autenticado (respeita as regras normalmente).
  const db = getFirestoreInstance();
  await setDoc(doc(db, 'users', userId, 'webauthnCredentials', credential.id), {
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports,
    createdAt: new Date().toISOString(),
  });

  setBiometricEnabledOnThisDevice(true, credential.id, userId);
}

/**
 * Login por biometria de verdade -- SEM depender de nenhuma sessão já
 * ativa. Usa o userId salvo localmente (de quando a biometria foi
 * ativada) pra pedir ao backend as opções de verificação; o backend
 * busca a credencial com privilégio de administrador (o cliente não
 * tem como ler isso sozinho sem sessão nenhuma ainda). No final, troca
 * o Custom Token emitido pelo backend por uma sessão de verdade.
 */
export async function loginWithBiometricOnly(): Promise<boolean> {
  const userId = getLocalBiometricUserId();
  if (!userId) throw new Error('Nenhuma biometria configurada neste aparelho.');

  const optsRes = await fetch(apiUrl('/api/webauthn/login-options'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!optsRes.ok) throw new Error((await optsRes.json()).error || 'Falha ao iniciar verificação.');
  const { flowId, options } = await optsRes.json();

  const assertionResponse = await startAuthentication({ optionsJSON: options });

  const verifyRes = await fetch(apiUrl('/api/webauthn/login-verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flowId, response: assertionResponse }),
  });
  if (!verifyRes.ok) return false;
  const { verified, customToken } = await verifyRes.json();

  if (verified && customToken) {
    await signInWithCustomToken(auth, customToken);
    return true;
  }
  return !!verified;
}

/** Confirma a identidade via biometria pra destravar a sessão já ativa no aparelho. */
export async function unlockWithBiometric(userId: string): Promise<boolean> {
  const db = getFirestoreInstance();
  const credsSnap = await getDocs(collection(db, 'users', userId, 'webauthnCredentials'));
  if (credsSnap.empty) throw new Error('Nenhuma biometria cadastrada para esta conta.');

  const storedCredentials = credsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  const optsRes = await fetch(apiUrl('/api/webauthn/login-options'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials: storedCredentials.map(c => ({ id: c.id, transports: c.transports })) }),
  });
  if (!optsRes.ok) throw new Error((await optsRes.json()).error || 'Falha ao iniciar verificação.');
  const { flowId, options } = await optsRes.json();

  const assertionResponse = await startAuthentication({ optionsJSON: options });

  const matched = storedCredentials.find(c => c.id === assertionResponse.id);
  if (!matched) throw new Error('Credencial de biometria não reconhecida.');

  const verifyRes = await fetch(apiUrl('/api/webauthn/login-verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flowId,
      response: assertionResponse,
      credential: { id: matched.id, publicKey: matched.publicKey, counter: matched.counter, transports: matched.transports },
    }),
  });
  if (!verifyRes.ok) return false;
  const { verified, newCounter } = await verifyRes.json();

  if (verified) {
    try {
      await updateDoc(doc(db, 'users', userId, 'webauthnCredentials', matched.id), { counter: newCounter });
    } catch (e) {
      // Não bloqueia o desbloqueio se a atualização do contador falhar.
      console.warn('Falha ao atualizar contador da credencial:', e);
    }
  }
  return !!verified;
}

/** Remove a biometria deste aparelho (não afeta outros aparelhos nem outras contas). */
export async function disableBiometric(userId: string, credentialId?: string): Promise<void> {
  setBiometricEnabledOnThisDevice(false);
  if (credentialId) {
    const db = getFirestoreInstance();
    try {
      await deleteDoc(doc(db, 'users', userId, 'webauthnCredentials', credentialId));
    } catch (e) {
      console.warn('Falha ao remover credencial:', e);
    }
  }
}
