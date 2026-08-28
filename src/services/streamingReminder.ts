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
 *
 * LIMITAÇÃO REAL (sem solução via web): não dá pra mostrar o número
 * "exposto" direto na barra de status, do lado do relógio, sem
 * precisar puxar a barra de notificações -- isso é um recurso
 * exclusivo de apps nativos do Android (tipo o cronômetro de ligação),
 * não disponível pra nenhum app baseado em navegador/PWA.
 */

let worker: Worker | null = null;
let startedAt = 0;
let listenersAttached = false;
let getExtraInfo: (() => string | null) | null = null;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}min`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function updateNotification() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const extra = getExtraInfo?.();
    const extraText = extra ? ` (${extra})` : '';
    await reg.showNotification('IronMind', {
      body: `Você está no streaming há ${formatElapsed(elapsedSeconds)}${extraText}. Bora voltar pro treino?`,
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
  getExtraInfo = null;
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifs = await reg.getNotifications({ tag: 'ironmind-streaming-time' });
    notifs.forEach(n => n.close());
  } catch {
    // sem problema, a notificação só some quando o usuário limpar mesmo
  }
}

// Assim que a pessoa volta pro app, encerra o lembrete sozinho -- o
// objetivo era avisar enquanto ela estava fora, não continuar contando
// depois que ela já voltou. Usa DOIS eventos como reforço
// (visibilitychange E focus) -- em alguns celulares/PWAs instalados,
// trocar pra um app nativo (Netflix) e voltar não dispara
// visibilitychange de forma confiável sozinho.
function attachListenersOnce() {
  if (listenersAttached || typeof document === 'undefined') return;
  listenersAttached = true;
  const tryClear = () => {
    if (!document.hidden && worker) {
      clearStreamingReminder();
    }
  };
  document.addEventListener('visibilitychange', tryClear);
  window.addEventListener('focus', tryClear);
}

/**
 * Começa a contar o tempo e mostrar/atualizar a notificação. Pede
 * permissão de notificação na hora, se ainda não tiver sido concedida
 * nem negada -- silenciosamente não faz nada se for negada (não deixa
 * o app insistindo).
 *
 * @param extraInfoFn Opcional -- função chamada a cada atualização pra
 * incluir informação extra na notificação (ex: distância percorrida
 * no cardio). Retorna null/undefined pra não incluir nada.
 */
export async function startStreamingReminder(extraInfoFn?: () => string | null) {
  if (typeof Notification === 'undefined') return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  await clearStreamingReminder(); // encerra um lembrete anterior, se tinha
  startedAt = Date.now();
  getExtraInfo = extraInfoFn || null;
  attachListenersOnce();
  await updateNotification();

  const workerCode = `setInterval(() => postMessage('tick'), 8000);`;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  worker = new Worker(workerUrl);
  worker.onmessage = () => updateNotification();
}
