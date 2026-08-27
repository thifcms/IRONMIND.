import { apiUrl, apiHeaders } from './apiBase';

/**
 * Push notifications de verdade -- lembretes de "faz tempo que você não
 * treina", entregues mesmo com o app fechado. Depende do backend ter
 * credencial de administrador de verdade pra listar todos os usuários
 * inativos (só possível desde a migração pro projeto ironmind-prod;
 * antes disso essa feature ficou desativada por bloqueio de política
 * da organização do projeto antigo).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Já está inscrito neste aparelho (independente do que o backend sabe)? */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Pede permissão de notificação (se ainda não tiver sido negada) e
 * inscreve o aparelho, mandando a inscrição pro backend salvar.
 */
export async function enablePushNotifications(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'Este navegador não suporta notificações push.' };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'Notificações bloqueadas nas configurações do navegador/celular.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'Permissão de notificação não concedida.' };
  }

  const keyRes = await fetch(apiUrl('/api/push/vapid-public-key'));
  if (!keyRes.ok) return { ok: false, reason: 'Não foi possível contatar o servidor.' };
  const { publicKey, configured } = await keyRes.json();
  if (!configured || !publicKey) {
    return { ok: false, reason: 'Notificações push não configuradas no servidor.' };
  }

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const saveRes = await fetch(apiUrl('/api/push/subscribe'), {
    method: 'POST',
    headers: await apiHeaders(),
    body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
  });
  if (!saveRes.ok) {
    const body = await saveRes.json().catch(() => ({}));
    return { ok: false, reason: body.message || body.error || 'Falha ao salvar no servidor.' };
  }
  const result = await saveRes.json();
  return { ok: !!result.success, reason: result.reason };
}

export async function disablePushNotifications(userId: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch (e) {
    console.warn('Falha ao cancelar inscrição local:', e);
  }

  try {
    const res = await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: await apiHeaders(),
      body: JSON.stringify({ userId }),
    });
    const result = await res.json().catch(() => ({}));
    return !!result.success;
  } catch {
    return false;
  }
}
