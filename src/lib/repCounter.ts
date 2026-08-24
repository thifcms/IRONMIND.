import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { POSE_LANDMARKS, angleAt } from './poseDetector';

/**
 * Cada exercício suportado é definido por QUAL ângulo acompanhar (3
 * pontos: início-vértice-fim) e os dois limites que definem "desceu"
 * (contraído/embaixo) e "subiu" (esticado/em cima). A visibilidade
 * mínima evita contar lixo quando o MediaPipe não está confiante que
 * viu aquele ponto de verdade (ex: braço fora de quadro).
 */
export interface ExerciseConfig {
  id: string;
  label: string;
  landmarks: [number, number, number]; // [a, vértice, c]
  downThreshold: number; // ângulo <= isso = posição "baixo"
  upThreshold: number;   // ângulo >= isso = posição "cima" (conta a rep na transição baixo->cima)
}

export const REP_COUNTER_EXERCISES: ExerciseConfig[] = [
  {
    id: 'agachamento',
    label: 'Agachamento',
    landmarks: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    downThreshold: 100,
    upThreshold: 160,
  },
  {
    id: 'flexao',
    label: 'Flexão de braço',
    landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    downThreshold: 90,
    upThreshold: 155,
  },
  {
    id: 'rosca',
    label: 'Rosca bíceps',
    landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    downThreshold: 160, // "baixo" da rosca = braço esticado
    upThreshold: 60,    // "cima" = braço contraído -- limites invertidos vs os outros, ver countRep()
  },
];

export type RepPhase = 'up' | 'down';

export interface RepCounterState {
  count: number;
  phase: RepPhase;
  currentAngle: number | null;
}

export function createRepCounterState(): RepCounterState {
  return { count: 0, phase: 'up', currentAngle: null };
}

const MIN_VISIBILITY = 0.6;

/**
 * Processa um frame: dado o array de landmarks detectados e a
 * configuração do exercício, atualiza o estado (ângulo atual, fase,
 * contador). Retorna o MESMO objeto se nada mudou (evita re-render
 * desnecessário quando usado como estado do React).
 */
export function updateRepCounter(state: RepCounterState, landmarks: NormalizedLandmark[], config: ExerciseConfig): RepCounterState {
  const [ia, ib, ic] = config.landmarks;
  const a = landmarks[ia], b = landmarks[ib], c = landmarks[ic];
  if (!a || !b || !c) return state;

  const minVis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1);
  if (minVis < MIN_VISIBILITY) return state;

  const angle = angleAt(a, b, c);
  const inverted = config.downThreshold > config.upThreshold; // caso da rosca

  const isDown = inverted ? angle >= config.downThreshold : angle <= config.downThreshold;
  const isUp = inverted ? angle <= config.upThreshold : angle >= config.upThreshold;

  let { phase, count } = state;

  if (isDown && phase === 'up') {
    phase = 'down';
  } else if (isUp && phase === 'down') {
    phase = 'up';
    count += 1; // completou baixo -> cima = 1 repetição
  }

  return { count, phase, currentAngle: angle };
}
