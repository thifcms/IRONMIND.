import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Camera, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { getPoseLandmarker } from '../lib/poseDetector';
import { REP_COUNTER_EXERCISES, createRepCounterState, updateRepCounter, type RepCounterState } from '../lib/repCounter';

interface Props {
  onClose: () => void;
  onFinish?: (exerciseLabel: string, reps: number) => void;
}

type LoadState = 'loading' | 'ready' | 'camera-denied' | 'error';

/**
 * Conta repetições sozinho usando a câmera + detecção de pose
 * (MediaPipe, tudo no navegador -- o vídeo nunca sai do aparelho).
 * Mostra o esqueleto detectado sobreposto à câmera em tempo real, pra
 * a pessoa confirmar que está sendo bem enquadrada.
 */
export default function PoseRepCounter({ onClose, onFinish }: Props) {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [repState, setRepState] = useState<RepCounterState>(createRepCounterState());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const repStateRef = useRef(repState);
  repStateRef.current = repState;
  const exercise = REP_COUNTER_EXERCISES[exerciseIdx];
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let landmarker: PoseLandmarker | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.warn('Câmera negada/indisponível:', e);
        if (!cancelled) setLoadState('camera-denied');
        return;
      }

      try {
        landmarker = await getPoseLandmarker();
        if (cancelled) return;
        setLoadState('ready');
      } catch (e) {
        console.error('Falha ao carregar o modelo de pose:', e);
        if (!cancelled) { setErrorMsg('Não consegui carregar o reconhecimento de pose. Verifique sua internet e tenta de novo.'); setLoadState('error'); }
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext('2d');

      const loop = () => {
        if (cancelled || !landmarker || !video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const result = landmarker.detectForVideo(video, performance.now());

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const landmarks = result.landmarks?.[0];
          if (landmarks) {
            // Pontos
            ctx.fillStyle = '#3b82f6';
            for (const p of landmarks) {
              if ((p.visibility ?? 1) < 0.5) continue;
              ctx.beginPath();
              ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
              ctx.fill();
            }
            // Conexões principais (braços, tronco, pernas)
            const connections: [number, number][] = [
              [11, 12], [11, 23], [12, 24], [23, 24],
              [11, 13], [13, 15], [12, 14], [14, 16],
              [23, 25], [25, 27], [24, 26], [26, 28],
            ];
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            for (const [i1, i2] of connections) {
              const p1 = landmarks[i1], p2 = landmarks[i2];
              if (!p1 || !p2 || (p1.visibility ?? 1) < 0.5 || (p2.visibility ?? 1) < 0.5) continue;
              ctx.beginPath();
              ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
              ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
              ctx.stroke();
            }

            const next = updateRepCounter(repStateRef.current, landmarks, exerciseRef.current);
            if (next !== repStateRef.current) setRepState(next);
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleChangeExercise = (idx: number) => {
    setExerciseIdx(idx);
    setRepState(createRepCounterState());
  };

  const handleReset = () => setRepState(createRepCounterState());

  const handleClose = () => {
    if (repState.count > 0) onFinish?.(exercise.label, repState.count);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -scale-x-100" />

        {loadState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-xs font-bold uppercase tracking-widest">Carregando câmera + IA de pose...</p>
          </div>
        )}

        {loadState === 'camera-denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-8 text-center">
            <Camera className="w-8 h-8 text-red-400" />
            <p className="text-white text-sm font-bold">Sem acesso à câmera</p>
            <p className="text-slate-400 text-xs">Permita o acesso à câmera nas configurações do navegador e tenta de novo.</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-8 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-white text-sm font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Contador */}
        {loadState === 'ready' && (
          <motion.div
            key={repState.count}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-3xl px-8 py-4 text-center"
          >
            <p className="text-5xl font-black text-white leading-none">{repState.count}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mt-1">{exercise.label}</p>
          </motion.div>
        )}

        <button onClick={handleClose} className="absolute top-6 right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center" aria-label="Fechar">
          <X className="w-5 h-5 text-white" />
        </button>

        {loadState === 'ready' && (
          <button onClick={handleReset} className="absolute bottom-24 right-4 w-11 h-11 rounded-full bg-black/60 flex items-center justify-center" aria-label="Zerar contagem">
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Seletor de exercício */}
      <div className="flex gap-2 p-3 bg-[#0a0a0a] overflow-x-auto">
        {REP_COUNTER_EXERCISES.map((ex, idx) => (
          <button
            key={ex.id}
            onClick={() => handleChangeExercise(idx)}
            className={`flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              idx === exerciseIdx ? 'bg-blue-600 text-white' : 'bg-[#1a1a1a] text-slate-400'
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
