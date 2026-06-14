
export interface LibraryExercise {
  name: string;
  muscle: string;
  englishName?: string;
  videoUrl?: string; // Optional manual override
}

export const getExerciseVideoUrl = (exercise: LibraryExercise) => {
  if (exercise.videoUrl) return exercise.videoUrl;
  // If no direct URL, return null to allow the UI to handle it (e.g. resolve via AI if not in library)
  return null;
};

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // PEITO
  { name: 'Supino Reto com Barra', muscle: 'Peito', englishName: 'Barbell Bench Press', videoUrl: 'https://www.youtube.com/shorts/kYre_60VpXk' },
  { name: 'Supino Reto com Haltere', muscle: 'Peito', englishName: 'Dumbbell Bench Press', videoUrl: 'https://www.youtube.com/shorts/0K_EubQpExE' },
  { name: 'Supino Reto no Smith', muscle: 'Peito', englishName: 'Smith Machine Bench Press', videoUrl: 'https://www.youtube.com/shorts/_W7mXvsh0is' },
  { name: 'Supino Reto na Máquina', muscle: 'Peito', englishName: 'Leverage Chest Press', videoUrl: 'https://www.youtube.com/shorts/v_S7i-f_AUI' },
  { name: 'Supino Reto Unilateral', muscle: 'Peito', englishName: 'Unilateral Chest Press', videoUrl: 'https://www.youtube.com/shorts/73yAsMv_Psc' },
  { name: 'Supino Inclinado com Barra', muscle: 'Peito', englishName: 'Incline Barbell Bench Press', videoUrl: 'https://www.youtube.com/shorts/I-47lK0yxtE' },
  { name: 'Crossover Polia Alta', muscle: 'Peito', englishName: 'Cable Crossover High', videoUrl: 'https://www.youtube.com/shorts/pEUnm13J2Yk' },
  { name: 'Voador (Peck Deck)', muscle: 'Peito', englishName: 'Butterfly Machine', videoUrl: 'https://www.youtube.com/shorts/sVb7wUvN6qU' },
  { name: 'Flexão com Pausa', muscle: 'Peito', englishName: 'Paused Push Up' },


  // COSTAS
  { name: 'Puxada Aberta (Pulley)', muscle: 'Costas', englishName: 'Wide Grip Lat Pulldown', videoUrl: 'https://www.youtube.com/shorts/5799_kIscOQ' },
  { name: 'Remada Curvada com Barra', muscle: 'Costas', englishName: 'Barbell Row', videoUrl: 'https://www.youtube.com/shorts/0Z8hAn68k_g' },
  { name: 'Remada Unilateral Serrote', muscle: 'Costas', englishName: 'Single Arm Dumbbell Row', videoUrl: 'https://www.youtube.com/shorts/Arua5a2Xy4M' },
  { name: 'Levantamento Terra Convencional', muscle: 'Costas', englishName: 'Deadlift', videoUrl: 'https://www.youtube.com/shorts/xQ-nB7_3bI0' },
  { name: 'Pull Down com Corda', muscle: 'Costas', englishName: 'Straight Arm Lat Pulldown', videoUrl: 'https://www.youtube.com/shorts/Xn6hU6p7B6I' },
  { name: 'Pull Down com Barra Reta', muscle: 'Costas', englishName: 'Straight Arm Lat Pulldown Bar', videoUrl: 'https://www.youtube.com/shorts/v33d0kByM68' },
  { name: 'Pull Over na Máquina', muscle: 'Costas', englishName: 'Machine Pullover', videoUrl: 'https://www.youtube.com/shorts/Xn6hU6p7B6I' },
  { name: 'Good Morning (Bom Dia)', muscle: 'Costas', englishName: 'Good Morning', videoUrl: 'https://www.youtube.com/shorts/VIs4d9oK0uY' },
  { name: 'Trações (Movimento Escapular)', muscle: 'Costas', englishName: 'Scapular Pulls', videoUrl: 'https://www.youtube.com/shorts/8mC6_uB5_m8' },
  { name: 'Barra Fixa com Carga', muscle: 'Costas', englishName: 'Weighted Pull Up', videoUrl: 'https://www.youtube.com/shorts/TU8QYVfAm_E' },
  { name: 'Remada Cavalinho com Barra Livre', muscle: 'Costas', englishName: 'Landmine T-Bar Row', videoUrl: 'https://www.youtube.com/shorts/TU8QYVfAm_E' },

  // PERNAS / GLÚTEOS
  { name: 'Agachamento Livre', muscle: 'Pernas / Glúteos', englishName: 'Barbell Back Squat', videoUrl: 'https://www.youtube.com/shorts/9vO-B99yZSw' },
  { name: 'Leg Press 45°', muscle: 'Pernas / Glúteos', englishName: 'Leg Press 45 Degree', videoUrl: 'https://www.youtube.com/shorts/L4B2Dghf8N0' },
  { name: 'Leg Press Horizontal', muscle: 'Pernas / Glúteos', englishName: 'Horizontal Leg Press', videoUrl: 'https://www.youtube.com/shorts/r-id5A_6Wl4' },
  { name: 'Cadeira Extensora', muscle: 'Pernas / Glúteos', englishName: 'Leg Extension', videoUrl: 'https://www.youtube.com/shorts/F0fI0r_yY30' },
  { name: 'Cadeira Flexora', muscle: 'Pernas / Glúteos', englishName: 'Seated Leg Curl', videoUrl: 'https://www.youtube.com/shorts/4u18F0O5vC0' },
  { name: 'Mesa Flexora', muscle: 'Pernas / Glúteos', englishName: 'Lying Leg Curl', videoUrl: 'https://www.youtube.com/shorts/OEnP4Q7yW8Y' },
  { name: 'Elevação Pélvica com Barra', muscle: 'Pernas / Glúteos', englishName: 'Barbell Hip Thrust', videoUrl: 'https://www.youtube.com/shorts/T60F9NfF9_Y' },
  { name: 'Gêmeos em Pé', muscle: 'Pernas / Glúteos', englishName: 'Standing Calf Raise', videoUrl: 'https://www.youtube.com/shorts/aMT82G0m_tQ' },
  { name: 'Gêmeos Sentado (Sóleo)', muscle: 'Pernas / Glúteos', englishName: 'Seated Calf Raise', videoUrl: 'https://www.youtube.com/shorts/aMT82G0m_tQ' },
  { name: 'Gêmeos no Leg Press', muscle: 'Pernas / Glúteos', englishName: 'Calf Press on Leg Press', videoUrl: 'https://www.youtube.com/shorts/L4B2Dghf8N0' },
  { name: 'Coice na Polia Baixa', muscle: 'Pernas / Glúteos', englishName: 'Cable Glute Kickback', videoUrl: 'https://www.youtube.com/shorts/OEnP4Q7yW8Y' },
  { name: 'Nordic Curls', muscle: 'Pernas / Glúteos', englishName: 'Nordic Hamstring Curl', videoUrl: 'https://www.youtube.com/shorts/4u18F0O5vC0' },
  { name: 'Step Up (Subida no Banco)', muscle: 'Pernas / Glúteos', englishName: 'Step Up', videoUrl: 'https://www.youtube.com/shorts/r-id5A_6Wl4' },
  { name: 'Sissy Squat', muscle: 'Pernas / Glúteos', englishName: 'Sissy Squat', videoUrl: 'https://www.youtube.com/shorts/L4B2Dghf8N0' },
  { name: 'Hack Squat Reverso', muscle: 'Pernas / Glúteos', englishName: 'Reverse Hack Squat', videoUrl: 'https://www.youtube.com/shorts/r-id5A_6Wl4' },
  { name: 'Abdução de Quadril com Elástico', muscle: 'Pernas / Glúteos', englishName: 'Banded Hip Abduction', videoUrl: 'https://www.youtube.com/shorts/L4B2Dghf8N0' },
  { name: 'Glute Ham Raise', muscle: 'Pernas / Glúteos', englishName: 'Glute Ham Raise', videoUrl: 'https://www.youtube.com/shorts/4u18F0O5vC0' },


  // OMBROS
  { name: 'Desenvolvimento com Haltere', muscle: 'Ombros', englishName: 'Dumbbell Shoulder Press', videoUrl: 'https://www.youtube.com/shorts/5pA-v7Z7U8E' },
  { name: 'Elevação Lateral com Haltere', muscle: 'Ombros', englishName: 'Dumbbell Lateral Raise', videoUrl: 'https://www.youtube.com/shorts/3oXyK-H69n4' },
  { name: 'Face Pull com Corda', muscle: 'Ombros', englishName: 'Face Pull', videoUrl: 'https://www.youtube.com/shorts/PZHeI7pUa8s' },
  { name: 'Face Pull Pegada Neutra', muscle: 'Ombros', englishName: 'Neutral Grip Face Pull', videoUrl: 'https://www.youtube.com/shorts/PZHeI7pUa8s' },
  { name: 'Elevação Lateral Unilateral Cabo', muscle: 'Ombros', englishName: 'Single Arm Cable Lateral Raise', videoUrl: 'https://www.youtube.com/shorts/3oXyK-H69n4' },


  // BÍCEPS / ANTEBRAÇO
  { name: 'Rosca Direta com Barra E-Z', muscle: 'Bíceps / Antebraço', englishName: 'EZ Bar Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' }, 
  { name: 'Rosca Alternada', muscle: 'Bíceps / Antebraço', englishName: 'Alternating Dumbbell Curl', videoUrl: 'https://www.youtube.com/shorts/K6_mB92S5Is' },
  { name: 'Rosca Martelo', muscle: 'Bíceps / Antebraço', englishName: 'Hammer Curl', videoUrl: 'https://www.youtube.com/shorts/zC3nLlEvin4' },
  { name: 'Rosca Scott com Barra E-Z', muscle: 'Bíceps / Antebraço', englishName: 'EZ Bar Preacher Curl', videoUrl: 'https://www.youtube.com/shorts/fS-uU-TjEqQ' },
  { name: 'Rosca Scott na Máquina', muscle: 'Bíceps / Antebraço', englishName: 'Machine Preacher Curl', videoUrl: 'https://www.youtube.com/shorts/fS-uU-TjEqQ' },
  { name: 'Rosca Scott com Haltere', muscle: 'Bíceps / Antebraço', englishName: 'Dumbbell Preacher Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Rosca 21', muscle: 'Bíceps / Antebraço', englishName: '21s', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Rosca Inclinada', muscle: 'Bíceps / Antebraço', englishName: 'Incline Bench Dumbbell Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Rosca Concentrada', muscle: 'Bíceps / Antebraço', englishName: 'Concentration Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Rosca Martelo com Corda na Polia', muscle: 'Bíceps / Antebraço', englishName: 'Cable Rope Hammer Curl', videoUrl: 'https://www.youtube.com/shorts/zC3nLlEvin4' },


  // TRÍCEPS
  { name: 'Tríceps Pulley Barra Reta', muscle: 'Tríceps', englishName: 'Cable Triceps Pushdown', videoUrl: 'https://www.youtube.com/shorts/2-LAMpZBeuE' },
  { name: 'Tríceps Testa com Barra E-Z', muscle: 'Tríceps', englishName: 'EZ Bar Skull Crusher', videoUrl: 'https://www.youtube.com/shorts/9fH8j_9Lz_Q' },
  { name: 'Mergulho em Paralelas (Dips)', muscle: 'Tríceps', englishName: 'Triceps Dips', videoUrl: 'https://www.youtube.com/shorts/P6yM_E_tUjI' },
  { name: 'Mergulho no Banco (Bench Dips)', muscle: 'Tríceps', englishName: 'Bench Dips', videoUrl: 'https://www.youtube.com/shorts/P6yM_E_tUjI' },
  { name: 'Tríceps Coice com Haltere', muscle: 'Tríceps', englishName: 'Dumbbell Kickback', videoUrl: 'https://www.youtube.com/shorts/2-LAMpZBeuE' },
  { name: 'JM Press', muscle: 'Tríceps', englishName: 'JM Press', videoUrl: 'https://www.youtube.com/shorts/9fH8j_9Lz_Q' },
  { name: 'Flexão Diamante', muscle: 'Tríceps', englishName: 'Diamond Push Up', videoUrl: 'https://www.youtube.com/shorts/P6yM_E_tUjI' },
  { name: 'Flexão Cotovelos Fechados', muscle: 'Tríceps', englishName: 'Close Grip Push Up', videoUrl: 'https://www.youtube.com/shorts/P6yM_E_tUjI' },


  // ABDÔMEN / CORE
  { name: 'Abdominal Supra no Solo', muscle: 'Abdômen / Core', englishName: 'Abdominal Crunch', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Abdominal Supra na Máquina', muscle: 'Abdômen / Core', englishName: 'Machine Crunch', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Abdominal Supra com Anilha', muscle: 'Abdômen / Core', englishName: 'Weighted Crunch', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Abdominal Borboleta', muscle: 'Abdômen / Core', englishName: 'Butterfly Sit-up', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Sit-up', muscle: 'Abdômen / Core', englishName: 'Sit-up', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Elevação de Pernas (Abdominal Infra)', muscle: 'Abdômen / Core', englishName: 'Leg Raise', videoUrl: 'https://www.youtube.com/shorts/JB2oyawG9KI' },
  { name: 'Abdominal Infra Banco Inclinado', muscle: 'Abdômen / Core', englishName: 'Incline Leg Raise', videoUrl: 'https://www.youtube.com/shorts/JB2oyawG9KI' },
  { name: 'Tesoura Abdominal', muscle: 'Abdômen / Core', englishName: 'Scissor Kicks', videoUrl: 'https://www.youtube.com/shorts/JB2oyawG9KI' },
  { name: 'Flutter Kicks', muscle: 'Abdômen / Core', englishName: 'Flutter Kicks', videoUrl: 'https://www.youtube.com/shorts/JB2oyawG9KI' },
  { name: 'Plancha Frontal Isométrica', muscle: 'Abdômen / Core', englishName: 'Plank', videoUrl: 'https://www.youtube.com/shorts/y2f_8tV-5Vw' },
  { name: 'Plancha Lateral', muscle: 'Abdômen / Core', englishName: 'Side Plank', videoUrl: 'https://www.youtube.com/shorts/y2f_8tV-5Vw' },
  { name: 'Roda Abdominal (Ab Wheel)', muscle: 'Abdômen / Core', englishName: 'Ab Wheel Rollout', videoUrl: 'https://www.youtube.com/shorts/q7X62N0m_6c' },
  { name: 'Abdominal Canivete', muscle: 'Abdômen / Core', englishName: 'Jackknife Sit-up', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Russian Twist', muscle: 'Abdômen / Core', englishName: 'Russian Twist', videoUrl: 'https://www.youtube.com/shorts/y2f_8tV-5Vw' },
  { name: 'Dead Bug', muscle: 'Abdômen / Core', englishName: 'Dead Bug', videoUrl: 'https://www.youtube.com/shorts/y2f_8tV-5Vw' },
  { name: 'Mountain Climbers', muscle: 'Abdômen / Core', englishName: 'Mountain Climbers', videoUrl: 'https://www.youtube.com/shorts/JB2oyawG9KI' },
  { name: 'Woodchopper (Polia)', muscle: 'Abdômen / Core', englishName: 'Cable Woodchopper', videoUrl: 'https://www.youtube.com/shorts/v33d0kByM68' },


  // MOBILIDADE / CARDIO
  { name: 'Mobilidade de Quadril 90/90', muscle: 'Mobilidade / Cardio', englishName: '90/90 Hip Mobility' },
  { name: 'Cat-Cow (Gato-Vaca)', muscle: 'Mobilidade / Cardio', englishName: 'Cat-Cow Stretch' },
  { name: 'Cão Olhando para Baixo', muscle: 'Mobilidade / Cardio', englishName: 'Downward Dog' },
  { name: 'World\'s Greatest Stretch', muscle: 'Mobilidade / Cardio', englishName: 'Worlds Greatest Stretch' },
  { name: 'Esteira', muscle: 'Mobilidade / Cardio', englishName: 'Treadmill Running', videoUrl: 'https://www.youtube.com/shorts/5vS_jB9pMhE' },
  { name: 'Bicicleta Ergométrica', muscle: 'Mobilidade / Cardio', englishName: 'Stationary Bike', videoUrl: 'https://www.youtube.com/shorts/r-id5A_6Wl4' },
  { name: 'Elíptico', muscle: 'Mobilidade / Cardio', englishName: 'Elliptical Trainer', videoUrl: 'https://www.youtube.com/shorts/F0fI0r_yY30' },
  { name: 'Remo Ergométrico', muscle: 'Mobilidade / Cardio', englishName: 'Rowing Machine', videoUrl: 'https://www.youtube.com/shorts/Xn6hU6p7B6I' },
  { name: 'Burpees', muscle: 'Mobilidade / Cardio', englishName: 'Burpees', videoUrl: 'https://www.youtube.com/shorts/TU8QYVfAm_E' },
  { name: 'Pular Corda', muscle: 'Mobilidade / Cardio', englishName: 'Jump Rope', videoUrl: 'https://www.youtube.com/shorts/NGRKQC_q_C4' },
  { name: 'Battle Ropes', muscle: 'Mobilidade / Cardio', englishName: 'Battle Ropes' },
  { name: 'Kettlebell Swing', muscle: 'Mobilidade / Cardio', englishName: 'Kettlebell Swing' },
  { name: 'Escada (Stairmaster)', muscle: 'Mobilidade / Cardio', englishName: 'Stair Climber' },
  { name: 'Mobilidade de Tornozelo', muscle: 'Mobilidade / Cardio', englishName: 'Ankle Mobility' },

];

export const MUSCLE_GROUPS = Array.from(new Set(EXERCISE_LIBRARY.map(ex => ex.muscle)));
