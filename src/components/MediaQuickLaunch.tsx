import { useState, useEffect, useRef } from 'react';
import { Youtube } from 'lucide-react';
import { mediaMaestro } from '../services/mediaMaestro';

/**
 * Botões de Netflix/YouTube com o mesmo "visor flutuante" (cronômetro em
 * Picture-in-Picture) que a aba clássica de Cardio já tinha — desenha o
 * tempo num canvas escondido, transforma em stream de vídeo, e ativa o
 * PiP nativo do navegador ao abrir o Netflix/YouTube.
 */
export default function MediaQuickLaunch() {
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Desenha o cronômetro no canvas escondido (fonte do stream do PiP)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    ctx.fillText(formatTime(time), centerX, centerY + 80);

    if (isActive) {
      ctx.fillStyle = (Math.floor(Date.now() / 500) % 2 === 0) ? '#10b981' : '#064e3b';
      ctx.beginPath();
      ctx.arc(centerX, centerY + 240, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [time, isActive]);

  // Prepara o stream do canvas assim que os elementos existirem
  useEffect(() => {
    const initializeStream = async () => {
      if (canvasRef.current && videoRef.current && !videoRef.current.srcObject) {
        try {
          const stream = (canvasRef.current as any).captureStream(30);
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        } catch (e) {
          console.error("Falha ao iniciar o stream do PiP", e);
        }
      }
    };
    initializeStream();
  }, []);

  // Fecha o visor flutuante sozinho quando a pessoa volta pro IronMind
  // (troca de app e retorna) — evita ficar com o PiP grudado na tela.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePiP = async () => {
    const video = videoRef.current;
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

  const handleMediaClick = (url: string, deepLink: string) => {
    if (!isActive) setIsActive(true);
    togglePiP().then(() => {
      openApp(url, deepLink);
    }).catch(err => {
      console.error("Erro ao ativar visor flutuante:", err);
      openApp(url, deepLink);
    });
  };

  // Mesmo padrão de deep link já usado no Som & Beat (MusicTab): tenta abrir
  // o app nativo direto; se em ~2s a página continuar em foco (ou seja, o
  // app não abriu), cai pro site normal em vez de deixar a pessoa numa
  // página intermediária "abrir no app?".
  const openApp = (webUrl: string, deepLink: string) => {
    const start = Date.now();
    window.location.href = deepLink;
    setTimeout(() => {
      if (Date.now() - start < 2500) {
        window.open(webUrl, '_blank');
      }
    }, 2000);
  };

  return (
    <div className="p-3 pt-0">
      <div className="opacity-0 pointer-events-none absolute -z-50 overflow-hidden w-px h-px">
        <canvas ref={canvasRef} width={720} height={720} />
        <video ref={videoRef} playsInline muted />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleMediaClick('https://www.netflix.com', 'nflx://www.netflix.com/browse')}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          NETFLIX
        </button>
        <button
          onClick={() => handleMediaClick('https://www.youtube.com', 'vnd.youtube://')}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
        </button>
      </div>
    </div>
  );
}
