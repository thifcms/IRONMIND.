import { useEffect, useRef } from 'react';
import { mediaMaestro } from '../services/mediaMaestro';

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
      } catch (e) {
        console.error("Falha ao iniciar o stream do PiP", e);
      }
    };
    initializeStream();

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
      video.remove();
    };
  }, []);

  const togglePiP = async () => {
    const video = videoElRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (video.paused) await video.play();
        await video.requestPictureInPicture();
        mediaMaestro.duckVolume(0.5);
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
    }
  };

  const launch = (opener: () => void) => {
    activeRef.current = true;
    togglePiP().then(() => {
      opener();
    }).catch(err => {
      console.error("Erro ao ativar visor flutuante:", err);
      opener();
    });
  };

  return { launch };
}
