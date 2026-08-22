import { useEffect, useRef } from 'react';
import { mediaMaestro } from '../services/mediaMaestro';
import { logPiP } from '../lib/pipDebugLog';

/**
 * Visor flutuante (Picture-in-Picture) reutilizável: mostra um cronômetro
 * enquanto a pessoa está em outro app (Netflix, YouTube, Deezer, etc).
 * Usa elementos de canvas/video criados fora do React (não precisam de
 * JSX), então qualquer componente pode usar isso só chamando launch(...).
 *
 * Mecanismo deliberadamente simples (sem trilha de áudio, sem Media
 * Session, sem espera de confirmação) -- é o mesmo padrão básico que a
 * aba clássica de Cardio sempre usou, e que funcionava. Tentativas de
 * "melhorar" isso (áudio silencioso, Media Session API, polling) não
 * resolveram e foram revertidas.
 */
export function usePiPLauncher() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const elapsedRef = useRef(0);
  const activeRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;

    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.style.position = 'fixed';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    // Tamanho 1x1px -- é o que estava confirmado funcionando de verdade
    // no Render (aba clássica de Cardio, commit 77bdcfc). Uma teoria não
    // testada dizia que 1px causaria problema no PiP, mas não há
    // confirmação disso -- o que esconde o elemento é opacity:0 +
    // pointer-events:none, não o tamanho.
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.left = '-9999px';
    document.body.appendChild(video);

    canvasElRef.current = canvas;
    videoElRef.current = video;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = (canvas.width / 2) - 10;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 30px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IRONMIND', centerX, centerY - 250);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 230px monospace';
      const mins = Math.floor(elapsedRef.current / 60).toString().padStart(2, '0');
      const secs = (elapsedRef.current % 60).toString().padStart(2, '0');
      ctx.fillText(`${mins}:${secs}`, centerX, centerY + 80);

      if (activeRef.current) {
        ctx.fillStyle = (Math.floor(Date.now() / 500) % 2 === 0) ? '#10b981' : '#064e3b';
        ctx.beginPath();
        ctx.arc(centerX, centerY + 240, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();

    const initializeStream = async () => {
      try {
        const stream = (canvas as any).captureStream(30);
        video.srcObject = stream;
        await video.play().catch(() => {});
        logPiP('Visor inicializado (stream do canvas pronta).');
      } catch (e) {
        console.error("Falha ao iniciar o stream do PiP", e);
        logPiP(`Falha ao iniciar stream do visor: ${e}`);
      }
    };
    initializeStream();

    // Estes dois listeners ficam ativos a vida toda do hook (não só
    // durante um launch()), porque o sumiço do visor pode acontecer bem
    // depois da chamada de abrir o app -- precisamos pegar o evento
    // sempre que ele disparar, e correlacionar com a troca de aba.
    const onLeave = () => {
      logPiP(`Visor SAIU do PiP (evento leavepictureinpicture). Aba oculta agora? ${document.hidden ? 'sim' : 'não'}.`);
    };
    video.addEventListener('leavepictureinpicture', onLeave);

    const onVisibility = () => {
      logPiP(`Visibilidade da aba mudou: ${document.hidden ? 'ocultada' : 'visível'}. PiP ativo nesse instante? ${document.pictureInPictureElement ? 'sim' : 'não'}.`);
    };
    document.addEventListener('visibilitychange', onVisibility);

    // O Chrome pausa o redesenho do canvas quando a aba vai pra segundo
    // plano (bug conhecido: canvas.captureStream() fica vazio/congelado
    // nessa hora -- https://issues.chromium.org/issues/41270855). Como é
    // justamente quando trocamos de app que o visor mais precisa
    // continuar vivo, o "relógio" que dispara o redesenho roda num Web
    // Worker (thread separada, que o Chrome não pausa da mesma forma)
    // em vez de um setInterval direto na aba.
    const workerCode = `setInterval(() => postMessage('tick'), 1000);`;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    worker.onmessage = () => {
      if (activeRef.current) elapsedRef.current += 1;
      draw();
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      video.removeEventListener('leavepictureinpicture', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      video.remove();
    };
  }, []);

  const togglePiP = async () => {
    const video = videoElRef.current;
    if (!video) throw new Error('Elemento de vídeo do visor não está pronto ainda.');
    if (document.pictureInPictureElement) {
      logPiP('Saindo do PiP (togglePiP chamado com PiP já ativo).');
      await document.exitPictureInPicture();
    } else {
      if (!document.pictureInPictureEnabled) {
        logPiP('document.pictureInPictureEnabled = false -- navegador/OS bloqueou PiP antes mesmo de tentar.');
        throw new Error('document.pictureInPictureEnabled = false (navegador/página bloqueou PiP).');
      }
      // Sem await antes do requestPictureInPicture -- qualquer espera aqui
      // (mesmo a checagem de vídeo pronto) pode consumir a janela de
      // "gesto do usuário" que o navegador exige pra liberar o PiP sem
      // bloquear, o mesmo problema que já vimos com o window.open().
      if (video.paused) video.play().catch(() => {});
      logPiP('Chamando requestPictureInPicture()...');
      await video.requestPictureInPicture();
      logPiP('requestPictureInPicture() resolveu (Promise aceita).');
      mediaMaestro.duckVolume(0.5);
    }
  };

  const launch = (opener: () => void, onDebug?: (msg: string) => void) => {
    activeRef.current = true;
    logPiP(`launch() chamado (abrindo app/URL após o PiP).`);

    // Padrão restaurado ao que foi CONFIRMADO funcionando de verdade no
    // Render (aba clássica de Cardio, commit da09120 / revert 77bdcfc):
    // abre o app assim que a Promise do togglePiP resolve, sem esperar
    // o evento 'enterpictureinpicture'. A tentativa de "sincronizar com
    // a confirmação real" parecia mais robusta no papel, mas não há
    // confirmação de que ajudou -- e o problema voltou depois dela ter
    // sido introduzida. Os listeners de leavepictureinpicture/
    // visibilitychange (lá em cima) continuam ativos e seguem
    // registrando o que acontece depois, então não perdemos o
    // diagnóstico.
    togglePiP().then(() => {
      logPiP('togglePiP resolveu, abrindo app agora.');
      opener();
    }).catch(err => {
      const msg = `Erro no PiP: ${err?.name || ''} ${err?.message || err}`;
      console.error(msg);
      logPiP(`${msg} -- abrindo app mesmo assim.`);
      onDebug?.(msg);
      opener();
    });
  };

  return { launch };
}
