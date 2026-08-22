import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase';
import { apiUrl } from './apiBase';

/**
 * Biometria como tranca local do app (não é login remoto).
 * Funciona sobre a sessão do Firebase Auth já existente no aparelho:
 * a digital/rosto só confirma "é você mesmo" antes de liberar a tela,
 * usando verificação criptográfica real (WebAuthn) — não é decorativo.
 *
 * Limitação conhecida e intencional: só funciona no mesmo aparelho onde
 * a pessoa já fez login com senha ao menos uma vez (sem Service Account
 * do Firebase, não dá pra criar uma sessão nova só com a biometria).
 */

const LOCAL_FLAG_KEY = 'ironmind_biometric_enabled';
const LOCAL_CREDENTIAL_ID_KEY = 'ironmind_biometric_credential_id';

export function isBiometricEnabledOnThisDevice(): boolean {
  return localStorage.getItem(LOCAL_FLAG_KEY) === 'true';
}

export function getLocalCredentialId(): string | null {
  return localStorage.getItem(LOCAL_CREDENTIAL_ID_KEY);
}

export function setBiometricEnabledOnThisDevice(enabled: boolean, credentialId?: string) {
  if (enabled) {
    localStorage.setItem(LOCAL_FLAG_KEY, 'true');
    if (credentialId) localStorage.setItem(LOCAL_CREDENTIAL_ID_KEY, credentialId);
  } else {
    localStorage.removeItem(LOCAL_FLAG_KEY);
    localStorage.removeItem(LOCAL_CREDENTIAL_ID_KEY);
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

  setBiometricEnabledOnThisDevice(true, credential.id);
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
