import { useEffect, useRef } from 'react';
import { mediaMaestro } from '../services/mediaMaestro';

/**
 * Visor flutuante (Picture-in-Picture) reutilizável: mostra um cronômetro
 * com "TOQUE AQUI PRA VOLTAR" enquanto a pessoa está em outro app
 * (Netflix, YouTube, Deezer, etc). Usa elementos de canvas/video criados
 * fora do React (não precisam de JSX), então qualquer componente pode
 * usar isso só chamando launch(...).
 */
export function usePiPLauncher() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const elapsedRef = useRef(0);
  const activeRef = useRef(false);
  const intervalRef = useRef<any>(null);

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

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText('TOQUE AQUI PRA VOLTAR', centerX, centerY + 180);

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

    intervalRef.current = setInterval(() => {
      if (activeRef.current) elapsedRef.current += 1;
      draw();
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
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

  /**
   * Ativa o visor flutuante e só então abre o app externo. Em vez de um
   * atraso fixo (que pode não bastar em alguns aparelhos), espera de
   * verdade a confirmação de que o PiP entrou em atividade
   * (document.pictureInPictureElement preenchido) antes de prosseguir,
   * com um teto de 2s pra não travar se algo não ativar.
   */
  const launch = (opener: () => void) => {
    activeRef.current = true;
    togglePiP().then(async () => {
      const start = Date.now();
      while (!document.pictureInPictureElement && Date.now() - start < 2000) {
        await new Promise(r => setTimeout(r, 100));
      }
      // Buffer extra depois de confirmado, pra garantir que o SO já
      // desenhou o overlay antes do app novo assumir a tela.
      setTimeout(opener, 400);
    }).catch(err => {
      console.error("Erro ao ativar visor flutuante:", err);
      opener();
    });
  };

  return { launch };
}
