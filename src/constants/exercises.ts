
export interface LibraryExercise {
  name: string;
  muscle: string;
  videoUrl?: string;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // PEITO
  { name: 'Supino Reto (Barra)', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=scfJ-XN9-nU' },
  { name: 'Supino Inclinado (Barra)', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=SrqOu55lr6A' },
  { name: 'Supino Reto (Haltere)', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=VmBQ6scIbe4' },
  { name: 'Supino Inclinado (Haltere)', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=5ceR_Kdfid0' },
  { name: 'Crucifixo Reto', muscle: 'Peito' },
  { name: 'Crossover (Polia Alta)', muscle: 'Peito' },
  { name: 'Fly (Máquina)', muscle: 'Peito' },
  { name: 'Flexão de Braços', muscle: 'Peito' },

  // COSTAS
  { name: 'Puxada Aberta (Pulley)', muscle: 'Costas' },
  { name: 'Remada Curvada (Barra)', muscle: 'Costas' },
  { name: 'Remada Unilateral (Serrote)', muscle: 'Costas' },
  { name: 'Puxada com Triângulo', muscle: 'Costas' },
  { name: 'Remada Baixa (Triângulo)', muscle: 'Costas' },
  { name: 'Levantamento Terra', muscle: 'Costas' },
  { name: 'Pull Down (Corda)', muscle: 'Costas' },
  { name: 'Barra Fixa', muscle: 'Costas' },

  // PERNAS
  { name: 'Agachamento Livre', muscle: 'Pernas' },
  { name: 'Leg Press 45', muscle: 'Pernas' },
  { name: 'Extensora', muscle: 'Pernas' },
  { name: 'Flexora Deitada', muscle: 'Pernas' },
  { name: 'Flexora Sentada', muscle: 'Pernas' },
  { name: 'Afundo (Haltere)', muscle: 'Pernas' },
  { name: 'Stiff (Barra)', muscle: 'Pernas' },
  { name: 'Cadeira Abdutora', muscle: 'Pernas' },
  { name: 'Cadeira Adutora', muscle: 'Pernas' },
  { name: 'Gêmeos em Pé', muscle: 'Pernas' },
  { name: 'Gêmeos Sentado', muscle: 'Pernas' },

  // OMBROS
  { name: 'Desenvolvimento (Barra)', muscle: 'Ombros' },
  { name: 'Desenvolvimento (Haltere)', muscle: 'Ombros' },
  { name: 'Elevação Lateral', muscle: 'Ombros' },
  { name: 'Elevação Frontal', muscle: 'Ombros' },
  { name: 'Posterior de Ombro (Corda)', muscle: 'Ombros' },
  { name: 'Encolhimento (Haltere)', muscle: 'Ombros' },

  // BÍCEPS
  { name: 'Rosca Direta (Barra E-Z)', muscle: 'Bíceps' },
  { name: 'Rosca Alternada', muscle: 'Bíceps' },
  { name: 'Rosca Martelo', muscle: 'Bíceps' },
  { name: 'Rosca Concentrada', muscle: 'Bíceps' },
  { name: 'Rosca Scott', muscle: 'Bíceps' },

  // TRÍCEPS
  { name: 'Tríceps Pulley (Barra)', muscle: 'Tríceps' },
  { name: 'Tríceps Corda', muscle: 'Tríceps' },
  { name: 'Tríceps Testa', muscle: 'Tríceps' },
  { name: 'Tríceps Francês', muscle: 'Tríceps' },
  { name: 'Mergulho (Paralelas)', muscle: 'Tríceps' },

  // ABDÔMEN
  { name: 'Abdominal Supra', muscle: 'Abdômen' },
  { name: 'Abdominal Infra', muscle: 'Abdômen' },
  { name: 'Plancha Isométrica', muscle: 'Abdômen' },
  { name: 'Abdominal Oblíquo', muscle: 'Abdômen' },
];

export const MUSCLE_GROUPS = Array.from(new Set(EXERCISE_LIBRARY.map(ex => ex.muscle)));
