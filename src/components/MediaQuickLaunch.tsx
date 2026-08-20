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

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.fillText('TOQUE AQUI PRA VOLTAR', centerX, centerY + 180);

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

  const handleMediaClick = (opener: () => void) => {
    if (!isActive) setIsActive(true);
    togglePiP().then(opener).catch(err => {
      console.error("Erro ao ativar visor flutuante:", err);
      opener();
    });
  };

  // No Android, usa URI de Intent explícita (nomeando o pacote do app) --
  // é o Android quem decide abrir o app se estiver instalado, ou usar o
  // fallback_url se não. Muito mais confiável que só tentar um esquema
  // customizado (nflx://) e adivinhar por timeout se funcionou.
  // No iOS não existe esse mecanismo, então mantemos o esquema + timeout.
  const openMediaApp = (webUrl: string, androidPackage: string, iosScheme: string) => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    if (isAndroid) {
      const urlNoScheme = webUrl.replace(/^https?:\/\//, '');
      const intentUrl = `intent://${urlNoScheme}#Intent;scheme=https;package=${androidPackage};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      window.location.href = intentUrl;
    } else if (isIOS) {
      const start = Date.now();
      window.location.href = iosScheme;
      setTimeout(() => {
        if (Date.now() - start < 2500) {
          window.open(webUrl, '_blank');
        }
      }, 2000);
    } else {
      window.open(webUrl, '_blank');
    }
  };

  return (
    <div className="p-3 pt-0">
      <div className="opacity-0 pointer-events-none absolute -z-50 overflow-hidden w-px h-px">
        <canvas ref={canvasRef} width={720} height={720} />
        <video ref={videoRef} playsInline muted />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleMediaClick(() => openMediaApp('https://www.netflix.com/browse', 'com.netflix.mediaclient', 'nflx://www.netflix.com/browse'))}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          NETFLIX
        </button>
        <button
          onClick={() => handleMediaClick(() => openMediaApp('https://www.youtube.com', 'com.google.android.youtube', 'youtube://'))}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
        </button>
      </div>
    </div>
  );
}
