import { useEffect, useRef } from 'react';
import { mediaMaestro } from '../services/mediaMaestro';

/**
 * Visor flutuante (Picture-in-Picture) reutilizável: mostra um cronômetro
 * com "TOQUE AQUI PRA VOLTAR" enquanto a pessoa está em outro app
 * (Netflix, YouTube, Deezer, etc). Usa elementos de canvas/video criados
 * fora do React (não precisam de JSX), então qualquer componente pode
 * usar isso só chamando launch(...).
 *
 * Inclui uma trilha de áudio quase inaudível junto do vídeo: sem isso,
 * quando o app (instalado como PWA) vai pro segundo plano ao trocar de
 * app, o Android/Chrome trata o PiP como "sem mídia ativa", suspende o
 * JavaScript da página e derruba a janela flutuante.
 */
export function usePiPLauncher() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const elapsedRef = useRef(0);
  const activeRef = useRef(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;

    const video = document.createElement('video');
    video.playsInline = true;
    video.style.position = 'fixed';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.left = '-9999px';
    document.body.appendChild(video);

    canvasElRef.current = canvas;
    videoElRef.current = video;

    // Gera uma trilha de áudio com volume quase zero e mescla com o
    // stream do canvas — é o que sinaliza ao Android que existe mídia
    // "tocando de verdade", evitando que o navegador congele a página.
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.001; // praticamente inaudível, mas tecnicamente "tocando"
      oscillator.connect(gainNode);
      const destination = audioCtx.createMediaStreamDestination();
      gainNode.connect(destination);
      oscillator.start();
      audioCtxRef.current = audioCtx;

      const videoStream = (canvas as any).captureStream(30);
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
      video.muted = false;
      video.srcObject = combinedStream;
    } catch (e) {
      console.error("Falha ao criar trilha de áudio silenciosa, PiP pode ser mais instável em segundo plano", e);
      video.muted = true;
      video.srcObject = (canvas as any).captureStream(30);
    }

    video.play().catch(() => {});

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

    intervalRef.current = setInterval(() => {
      if (activeRef.current) elapsedRef.current += 1;
      draw();
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      video.remove();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const togglePiP = async () => {
    const video = videoElRef.current;
    if (!video) return;
    try {
      // AudioContext costuma nascer suspenso até um gesto real do usuário
      // (o clique que chamou essa função conta como esse gesto).
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume().catch(() => {});
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (video.paused) await video.play();
        await video.requestPictureInPicture();
        mediaMaestro.duckVolume(0.5);

        // Media Session API: informa ao sistema que existe uma mídia
        // "tocando" de verdade, o que ajuda o Android a não suspender a
        // página quando ela vai pro segundo plano.
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'IronMind',
            artist: 'Treino em andamento',
          });
          navigator.mediaSession.playbackState = 'playing';
        }
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
