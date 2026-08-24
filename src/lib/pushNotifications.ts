import { apiUrl, apiHeaders } from '../services/apiBase';

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
 * manda a inscrição pro backend salvar junto do perfil do usuário.
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

    const res = await fetch(apiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: await apiHeaders(),
      body: JSON.stringify({ userId, subscription: sub.toJSON() }),
    });
    const data = await res.json();
    return { ok: !!data.success, reason: data.success ? undefined : 'Falha ao salvar no servidor.' };
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
    await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: await apiHeaders(),
      body: JSON.stringify({ userId }),
    });
  } catch (e) {
    console.warn('Falha ao avisar o servidor do cancelamento de push:', e);
  }
}
