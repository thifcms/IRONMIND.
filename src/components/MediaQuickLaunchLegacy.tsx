import { useState, useEffect, useRef } from 'react';
import { Youtube } from 'lucide-react';
import { mediaMaestro } from '../services/mediaMaestro';

/**
 * TESTE ISOLADO -- cópia fiel do mecanismo de visor (PiP) + botões
 * Netflix/YouTube exatamente como estava em 14/06 (commit d96f0ed),
 * a última versão confirmada funcionando de verdade por mais de um mês
 * antes de toda a leva de mudanças desta semana.
 *
 * Propositalmente SEM nada que foi adicionado depois: sem
 * forceOpenInChrome, sem Web Worker pro redesenho, sem logPiP, sem
 * painel de diagnóstico, sem espera de frame pronto. Só o básico que
 * funcionava.
 *
 * Usado SÓ na aba Aquecimento por enquanto, como teste controlado --
 * se funcionar, aplicamos o mesmo padrão nos outros lugares
 * (Cardio/Sugestão do Treinador) que hoje usam MediaQuickLaunch.tsx
 * (com o hook usePiPLauncher, que teve mexidas ao longo da semana).
 */
export default function MediaQuickLaunchLegacy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      const mins = Math.floor(secondsRef.current / 60).toString().padStart(2, '0');
      const secs = (secondsRef.current % 60).toString().padStart(2, '0');
      ctx.fillText(`${mins}:${secs}`, centerX, centerY + 80);
    };
    draw();

    const interval = setInterval(() => {
      secondsRef.current += 1;
      draw();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle PiP stream initialization -- idêntico a 14/06.
  useEffect(() => {
    const initializeStream = async () => {
      if (canvasRef.current && videoRef.current && !videoRef.current.srcObject) {
        try {
          const stream = (canvasRef.current as any).captureStream(30);
          videoRef.current.srcObject = stream;
          // Pre-play muted video to have it ready for PiP
          await videoRef.current.play().catch(() => {});
        } catch (e) {
          console.error("Failed to initialize PiP stream", e);
        }
      }
    };
    initializeStream();
  }, []);

  // togglePiP -- idêntico a 14/06 (inclusive o await video.play() antes
  // do requestPictureInPicture, que na versão atual da semana tinha
  // virado "dispara e não espera").
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error('[TESTE 14/06] video ref é null -- elemento de vídeo não montou ainda.');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        console.log('[TESTE 14/06] Já em PiP, saindo...');
        await document.exitPictureInPicture();
      } else {
        console.log('[TESTE 14/06] video.paused?', video.paused, '| video.srcObject?', !!video.srcObject, '| document.pictureInPictureEnabled?', document.pictureInPictureEnabled);
        if (video.paused) {
          await video.play();
        }
        console.log('[TESTE 14/06] Chamando requestPictureInPicture()...');
        await video.requestPictureInPicture();
        console.log('[TESTE 14/06] requestPictureInPicture() resolveu!');
        mediaMaestro.duckVolume(0.5);
      }
    } catch (error) {
      console.error('[TESTE 14/06] Picture-in-Picture error:', error);
    }
  };

  // handleMediaClick -- idêntico a 14/06 (URL normal, sem
  // forceOpenInChrome, que só foi introduzido depois).
  const handleMediaClick = (url: string) => {
    togglePiP().then(() => {
      window.open(url, '_blank');
    }).catch(err => {
      console.error("Erro ao ativar visor flutuante:", err);
      window.open(url, '_blank');
    });
  };

  return (
    <div className="p-3 pt-0">
      <div className="opacity-0 pointer-events-none absolute -z-50 overflow-hidden w-px h-px">
        <canvas ref={canvasRef} width={720} height={720} />
        <video ref={videoRef} playsInline muted />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleMediaClick('https://www.netflix.com')}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          NETFLIX
        </button>
        <button
          onClick={() => handleMediaClick('https://www.youtube.com')}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
        </button>
      </div>
    </div>
  );
}
