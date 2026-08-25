import { apiUrl } from '../services/apiBase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase';

/** Base64 URL-safe -> Uint8Array, formato exigido pela chave VAPID
 *  pelo pushManager.subscribe() nativo do navegador. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed';

export function getPushSupport(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Estado atual, sem pedir nada ao usuário -- só pra saber o que mostrar
 *  na UI (botão "ativar" vs "já ativado" vs "bloqueado nas config"). */
export async function getPushStatus(): Promise<PushStatus> {
  if (!getPushSupport()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'default';

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'subscribed' : 'granted';
}

/**
 * Fluxo completo: pede permissão (se ainda não deu/negou), busca a
 * chave pública VAPID do backend, inscreve no push do navegador, e
 * salva a inscrição DIRETO no Firestore -- não via backend.
 *
 * Por quê direto: as regras de segurança do Firestore só permitem
 * escrever em users/{userId} quando a requisição vem de um usuário
 * de verdade autenticado pelo Firebase (request.auth.uid == userId).
 * O backend, escrevendo via API REST + chave, nunca satisfaz essa
 * condição (chave de API não é a mesma coisa que estar logado) -- por
 * isso sempre dava 403. O jeito certo de resolver isso pelo lado do
 * servidor seria o SDK de administrador do Firebase com uma chave de
 * conta de serviço, mas a organização do Google Cloud deste projeto
 * bloqueia a criação de novas chaves desse tipo. Como o app já está
 * logado de verdade no Firebase bem aqui, é muito mais simples (e
 * mais seguro, inclusive) escrever direto -- as mesmas regras que
 * bloqueavam o backend permitem isso aqui sem nenhuma mudança.
 */
export async function subscribeToPush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!getPushSupport()) return { ok: false, reason: 'Navegador não suporta notificações push.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'Permissão negada.' : 'Permissão não concedida.' };
  }

  try {
    const keyRes = await fetch(apiUrl('/api/push/vapid-public-key'));
    const { publicKey, configured } = await keyRes.json();
    if (!configured || !publicKey) {
      return { ok: false, reason: 'Servidor ainda não configurou as notificações (VAPID).' };
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const db = getFirestoreInstance();
    await updateDoc(doc(db, 'users', userId), { pushSubscription: JSON.stringify(sub.toJSON()) });
    return { ok: true };
  } catch (e: any) {
    console.warn('Falha ao inscrever em push notifications:', e);
    return { ok: false, reason: e?.message || 'Erro inesperado.' };
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch (e) {
    console.warn('Falha ao cancelar inscrição local de push:', e);
  }
  try {
    const db = getFirestoreInstance();
    await updateDoc(doc(db, 'users', userId), { pushSubscription: deleteField() });
  } catch (e) {
    console.warn('Falha ao remover inscrição de push no Firestore:', e);
  }
}
