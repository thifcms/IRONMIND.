/**
 * Lembrete de "há quanto tempo você está assistindo" -- substitui o
 * visor flutuante (removido por não sobreviver à troca de app neste
 * Chrome/Android). Em vez de tentar manter uma janela visível por
 * cima do Netflix/YouTube, mostra uma notificação persistente
 * (aparece com um ícone pequeno ao lado da hora/sinal, na barra de
 * status do Android) com o tempo decorrido, que vai se atualizando.
 *
 * Usa Web Worker pro "relógio" -- um setInterval comum na aba trava/
 * fica bem mais lento quando o app vai pro segundo plano (que é
 * exatamente quando o Netflix está em primeiro plano), mas o Chrome
 * não limita Workers da mesma forma.
 */

let worker: Worker | null = null;
let startedAt = 0;
let visibilityListenerAttached = false;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}min`;
  return `${m}min`;
}

async function updateNotification() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    await reg.showNotification('IronMind', {
      body: `Você está no streaming há ${formatElapsed(elapsedSeconds)}. Bora voltar pro treino?`,
      icon: './icon.svg',
      badge: './icon.svg',
      tag: 'ironmind-streaming-time', // substitui a anterior, não empilha
      silent: true,
      renotify: false,
    } as NotificationOptions);
  } catch (e) {
    console.warn('Falha ao mostrar lembrete de tempo de streaming:', e);
  }
}

export async function clearStreamingReminder() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifs = await reg.getNotifications({ tag: 'ironmind-streaming-time' });
    notifs.forEach(n => n.close());
  } catch {
    // sem problema, a notificação só some quando o usuário limpar mesmo
  }
}

// Assim que a pessoa volta pro app (aba fica visível de novo), encerra
// o lembrete sozinho -- o objetivo era avisar enquanto ela estava fora,
// não continuar contando depois que ela já voltou.
function attachVisibilityListenerOnce() {
  if (visibilityListenerAttached || typeof document === 'undefined') return;
  visibilityListenerAttached = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && worker) {
      clearStreamingReminder();
    }
  });
}

/**
 * Começa a contar o tempo e mostrar/atualizar a notificação. Pede
 * permissão de notificação na hora, se ainda não tiver sido concedida
 * nem negada -- silenciosamente não faz nada se for negada (não deixa
 * o app insistindo).
 */
export async function startStreamingReminder() {
  if (typeof Notification === 'undefined') return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  await clearStreamingReminder(); // encerra um lembrete anterior, se tinha
  startedAt = Date.now();
  attachVisibilityListenerOnce();
  await updateNotification();

  const workerCode = `setInterval(() => postMessage('tick'), 60000);`;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  worker = new Worker(workerUrl);
  worker.onmessage = () => updateNotification();
}
