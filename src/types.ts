/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Tab {
  AQUECIMENTO = 'aquecimento',
  TREINO = 'treino',
  CARDIO = 'cardio',
  VIDEOS = 'videos',
  DIETA = 'dieta',
  TREINADOR = 'treinador',
  SOM = 'som',
  HISTORICO = 'historico',
  PERFIL = 'perfil'
}

export type ExerciseCategory = 'aquecimento' | 'treino' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  rest?: string;
  videoUrl?: string;
  notes?: string;
  category?: ExerciseCategory;
}

export interface TrainingDay {
  label: string;
  exercises: Exercise[];
}

export interface WarmupSuggestion {
  durationMinutes: number;
  notes: string;
}

export interface CardioSuggestion {
  mode: 'corrida' | 'esteira' | 'bicicleta';
  durationMinutes: number;
  notes: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  days: TrainingDay[];
  createdAt: number;
  warmup?: WarmupSuggestion;
  cardio?: CardioSuggestion[];
}

export interface DietMeal {
  time: string;
  name: string;
  items: string[];
}

export interface DietPlan {
  id: string;
  name: string;
  description: string;
  meals: DietMeal[];
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  shouldClearHistory?: boolean;
  proposal?: {
    type: 'training' | 'diet';
    data: any;
  };
}

export interface CardioSession {
  type: 'corrida' | 'esteira' | 'bicicleta';
  distance: number; // km
  time: number; // minutes
  calories: number;
}

export interface WeightEntry {
  date: number;
  weight: number;
}

export interface MeasurementEntry {
  date: number;
  label: string;
  value: number;
  unit: string;
}

export interface LoadEntry {
  date: number;
  exercise: string;
  weight: number;
}

export interface UserProfile {
  height?: number; // cm
  targetWeight?: number;
}
