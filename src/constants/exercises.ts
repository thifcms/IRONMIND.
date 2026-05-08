
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
  { name: 'Crucifixo Reto', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=Yf1v_D_u8bM' },
  { name: 'Crossover (Polia Alta)', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=H74S9DkaBTM' },
  { name: 'Fly (Máquina)', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=eGjt4lk6g34' },
  { name: 'Flexão de Braços', muscle: 'Peito', videoUrl: 'https://www.youtube.com/watch?v=mm_SHeu3g9I' },

  // COSTAS
  { name: 'Puxada Aberta (Pulley)', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=iTf2Y6r20m4' },
  { name: 'Remada Curvada (Barra)', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=R322A0uUv7Y' },
  { name: 'Remada Unilateral (Serrote)', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=Yp69I-5o_8U' },
  { name: 'Puxada com Triângulo', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=8XQshh4P8n8' },
  { name: 'Remada Baixa (Triângulo)', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=9_H2cWvD-I8' },
  { name: 'Levantamento Terra', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=r4MzxtBKyNE' },
  { name: 'Pull Down (Corda)', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=I0T6L6eWJ8g' },
  { name: 'Barra Fixa', muscle: 'Costas', videoUrl: 'https://www.youtube.com/watch?v=fXvYIq9n1pA' },

  // PERNAS
  { name: 'Agachamento Livre', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=VnPVL7O2I_k' },
  { name: 'Leg Press 45', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=S0Q6e8j-idA' },
  { name: 'Extensora', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=8lJmBv4-E14' },
  { name: 'Flexora Deitada', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=Lq1dE_Q_D-c' },
  { name: 'Flexora Sentada', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=2e6I7nS6r_M' },
  { name: 'Afundo (Haltere)', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=QOVaHWMqS_I' },
  { name: 'Stiff (Barra)', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=D-Zp4fL8wLo' },
  { name: 'Cadeira Abdutora', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=v0l2QW97gL0' },
  { name: 'Cadeira Adutora', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=CqS3X0_K_fI' },
  { name: 'Gêmeos em Pé', muscle: 'Pernas', videoUrl: 'https://www.youtube.com/watch?v=mD0D0vSra8E' },

  // OMBROS
  { name: 'Desenvolvimento (Barra)', muscle: 'Ombros', videoUrl: 'https://www.youtube.com/watch?v=7XF9pEnpYnI' },
  { name: 'Desenvolvimento (Haltere)', muscle: 'Ombros', videoUrl: 'https://www.youtube.com/watch?v=V_F9p8G7N_8' },
  { name: 'Elevação Lateral', muscle: 'Ombros', videoUrl: 'https://www.youtube.com/watch?v=P_XfVf8_1Yk' },
  { name: 'Elevação Frontal', muscle: 'Ombros', videoUrl: 'https://www.youtube.com/watch?v=9S_X3k9vE88' },
  { name: 'Posterior de Ombro (Corda)', muscle: 'Ombros', videoUrl: 'https://www.youtube.com/watch?v=VAsyX6eXj4I' },

  // BÍCEPS
  { name: 'Rosca Direta (Barra E-Z)', muscle: 'Bíceps', videoUrl: 'https://www.youtube.com/watch?v=zC3nLl_R_aE' },
  { name: 'Rosca Alternada', muscle: 'Bíceps', videoUrl: 'https://www.youtube.com/watch?v=WCSx9jA_P-s' },
  { name: 'Rosca Martelo', muscle: 'Bíceps', videoUrl: 'https://www.youtube.com/watch?v=zK9qI-X08o8' },
  { name: 'Rosca Concentrada', muscle: 'Bíceps', videoUrl: 'https://www.youtube.com/watch?v=R0_InG812yU' },
  { name: 'Rosca Scott', muscle: 'Bíceps', videoUrl: 'https://www.youtube.com/watch?v=680pZ7-YofA' },

  // TRÍCEPS
  { name: 'Tríceps Pulley (Barra)', muscle: 'Tríceps', videoUrl: 'https://www.youtube.com/watch?v=8y1Z_p-D_y4' },
  { name: 'Tríceps Corda', muscle: 'Tríceps', videoUrl: 'https://www.youtube.com/watch?v=N_pE0uUp_8Y' },
  { name: 'Tríceps Testa', muscle: 'Tríceps', videoUrl: 'https://www.youtube.com/watch?v=3n4N8B3_N_U' },
  { name: 'Tríceps Francês', muscle: 'Tríceps', videoUrl: 'https://www.youtube.com/watch?v=R1z6A50jXJk' },
  { name: 'Mergulho (Paralelas)', muscle: 'Tríceps', videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As' },
 
  // ABDÔMEN
  { name: 'Abdominal Supra', muscle: 'Abdômen', videoUrl: 'https://www.youtube.com/watch?v=5_Xm7rI-7Wk' },
  { name: 'Abdominal Infra', muscle: 'Abdômen', videoUrl: 'https://www.youtube.com/watch?v=z2vR7p0_Z4E' },
  { name: 'Plancha Isométrica', muscle: 'Abdômen', videoUrl: 'https://www.youtube.com/watch?v=pSHjTRCQxIw' },
];

export const MUSCLE_GROUPS = Array.from(new Set(EXERCISE_LIBRARY.map(ex => ex.muscle)));
