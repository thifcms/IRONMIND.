import { PoseLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Carrega o modelo de detecção de pose corporal (BlazePose, via
 * MediaPipe) -- roda inteiramente no navegador via WebAssembly/WebGL,
 * sem mandar vídeo pra nenhum servidor (privacidade: a câmera nunca
 * sai do aparelho). O modelo (~3MB, variante "lite") e o runtime WASM
 * vêm de CDN pública do Google na primeira vez, depois ficam em cache
 * do navegador.
 *
 * 33 pontos por pose detectada (ombros, cotovelos, punhos, quadril,
 * joelhos, tornozelos, etc) -- índices documentados em POSE_LANDMARKS
 * abaixo, é o layout padrão do BlazePose.
 */

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}

/** Índices dos pontos que interessam pro contador de reps (layout
 *  BlazePose de 33 pontos -- os outros 20+ são rosto/mãos detalhados,
 *  que não usamos aqui). */
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
} as const;

/** Ângulo (em graus) no vértice B, formado pelos segmentos B-A e B-C.
 *  Ex: ângulo do cotovelo = angleAt(ombro, cotovelo, punho). */
export function angleAt(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const radAB = Math.atan2(a.y - b.y, a.x - b.x);
  const radCB = Math.atan2(c.y - b.y, c.x - b.x);
  let angle = Math.abs((radAB - radCB) * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}
