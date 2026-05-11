
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
  { name: 'Pull Down com Barra Reta', muscle: 'Costas', englishName: 'Straight Arm Lat Pulldown Bar' },
  { name: 'Pull Over na Máquina', muscle: 'Costas', englishName: 'Machine Pullover' },
  { name: 'Good Morning (Bom Dia)', muscle: 'Costas', englishName: 'Good Morning' },
  { name: 'Trações (Movimento Escapular)', muscle: 'Costas', englishName: 'Scapular Pulls' },
  { name: 'Barra Fixa com Carga', muscle: 'Costas', englishName: 'Weighted Pull Up' },
  { name: 'Remada Cavalinho com Barra Livre', muscle: 'Costas', englishName: 'Landmine T-Bar Row' },

  // PERNAS / GLÚTEOS
  { name: 'Agachamento Livre', muscle: 'Pernas / Glúteos', englishName: 'Barbell Back Squat', videoUrl: 'https://www.youtube.com/shorts/9vO-B99yZSw' },
  { name: 'Leg Press 45°', muscle: 'Pernas / Glúteos', englishName: 'Leg Press 45 Degree', videoUrl: 'https://www.youtube.com/shorts/L4B2Dghf8N0' },
  { name: 'Leg Press Horizontal', muscle: 'Pernas / Glúteos', englishName: 'Horizontal Leg Press', videoUrl: 'https://www.youtube.com/shorts/r-id5A_6Wl4' },
  { name: 'Cadeira Extensora', muscle: 'Pernas / Glúteos', englishName: 'Leg Extension', videoUrl: 'https://www.youtube.com/shorts/F0fI0r_yY30' },
  { name: 'Cadeira Flexora', muscle: 'Pernas / Glúteos', englishName: 'Seated Leg Curl', videoUrl: 'https://www.youtube.com/shorts/4u18F0O5vC0' },
  { name: 'Mesa Flexora', muscle: 'Pernas / Glúteos', englishName: 'Lying Leg Curl', videoUrl: 'https://www.youtube.com/shorts/OEnP4Q7yW8Y' },
  { name: 'Elevação Pélvica com Barra', muscle: 'Pernas / Glúteos', englishName: 'Barbell Hip Thrust', videoUrl: 'https://www.youtube.com/shorts/T60F9NfF9_Y' },
  { name: 'Gêmeos em Pé', muscle: 'Pernas / Glúteos', englishName: 'Standing Calf Raise', videoUrl: 'https://www.youtube.com/shorts/aMT82G0m_tQ' },
  { name: 'Gêmeos Sentado (Sóleo)', muscle: 'Pernas / Glúteos', englishName: 'Seated Calf Raise' },
  { name: 'Gêmeos no Leg Press', muscle: 'Pernas / Glúteos', englishName: 'Calf Press on Leg Press' },
  { name: 'Gêmeos Unilateral', muscle: 'Pernas / Glúteos', englishName: 'Single Leg Calf Raise' },
  { name: 'Gêmeos no Smith', muscle: 'Pernas / Glúteos', englishName: 'Smith Machine Calf Raise' },
  { name: 'Gêmeos no Hack', muscle: 'Pernas / Glúteos', englishName: 'Hack Squat Calf Raise' },
  { name: 'Coice na Polia Baixa', muscle: 'Pernas / Glúteos', englishName: 'Cable Glute Kickback' },
  { name: 'Glúteo na Máquina', muscle: 'Pernas / Glúteos', englishName: 'Glute Kickback Machine' },
  { name: 'Extensão de Quadril no Banco', muscle: 'Pernas / Glúteos', englishName: 'Hyperextension' },
  { name: 'Extensão de Quadril na Polia', muscle: 'Pernas / Glúteos', englishName: 'Cable Hip Extension' },
  { name: 'Cadeira Abdutora', muscle: 'Pernas / Glúteos', englishName: 'Hip Abductor Machine' },
  { name: 'Cadeira Adutora', muscle: 'Pernas / Glúteos', englishName: 'Hip Adductor Machine' },
  { name: 'Nordic Curls', muscle: 'Pernas / Glúteos', englishName: 'Nordic Hamstring Curl' },
  { name: 'Flexão de Isquiotibiais com Bola', muscle: 'Pernas / Glúteos', englishName: 'Swiss Ball Leg Curl' },
  { name: 'Step Up (Subida no Banco)', muscle: 'Pernas / Glúteos', englishName: 'Step Up' },
  { name: 'Sissy Squat', muscle: 'Pernas / Glúteos', englishName: 'Sissy Squat' },
  { name: 'Hack Squat Reverso', muscle: 'Pernas / Glúteos', englishName: 'Reverse Hack Squat' },
  { name: 'Abdução de Quadril com Elástico', muscle: 'Pernas / Glúteos', englishName: 'Banded Hip Abduction' },
  { name: 'Glute Ham Raise', muscle: 'Pernas / Glúteos', englishName: 'Glute Ham Raise' },


  // OMBROS
  { name: 'Desenvolvimento com Haltere', muscle: 'Ombros', englishName: 'Dumbbell Shoulder Press', videoUrl: 'https://www.youtube.com/shorts/5pA-v7Z7U8E' },
  { name: 'Elevação Lateral com Haltere', muscle: 'Ombros', englishName: 'Dumbbell Lateral Raise', videoUrl: 'https://www.youtube.com/shorts/3oXyK-H69n4' },
  { name: 'Face Pull com Corda', muscle: 'Ombros', englishName: 'Face Pull', videoUrl: 'https://www.youtube.com/shorts/PZHeI7pUa8s' },
  { name: 'Face Pull Pegada Neutra', muscle: 'Ombros', englishName: 'Neutral Grip Face Pull' },
  { name: 'Encolhimento com Haltere (Shrug)', muscle: 'Ombros', englishName: 'Dumbbell Shrug' },
  { name: 'Encolhimento com Barra', muscle: 'Ombros', englishName: 'Barbell Shrug' },
  { name: 'Encolhimento na Polia', muscle: 'Ombros', englishName: 'Cable Shrug' },
  { name: 'Remada Alta com Barra', muscle: 'Ombros', englishName: 'Barbell Upright Row' },
  { name: 'Remada Alta na Polia', muscle: 'Ombros', englishName: 'Cable Upright Row' },
  { name: 'Remada Alta com Halteres', muscle: 'Ombros', englishName: 'Dumbbell Upright Row' },
  { name: 'Y-Raise', muscle: 'Ombros', englishName: 'Y-Raise' },
  { name: 'W-Raise', muscle: 'Ombros', englishName: 'W-Raise' },
  { name: 'Lu Raise', muscle: 'Ombros', englishName: 'Lu Raise' },
  { name: 'Rotação Externa na Polia', muscle: 'Ombros', englishName: 'Cable External Rotation' },
  { name: 'Rotação Interna na Polia', muscle: 'Ombros', englishName: 'Cable Internal Rotation' },
  { name: 'Elevação Lateral Unilateral Cabo', muscle: 'Ombros', englishName: 'Single Arm Cable Lateral Raise' },


  // BÍCEPS / ANTEBRAÇO
  { name: 'Rosca Direta com Barra E-Z', muscle: 'Bíceps / Antebraço', englishName: 'EZ Bar Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' }, 
  { name: 'Rosca Alternada', muscle: 'Bíceps / Antebraço', englishName: 'Alternating Dumbbell Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Rosca Martelo', muscle: 'Bíceps / Antebraço', englishName: 'Hammer Curl', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Rosca Scott com Barra E-Z', muscle: 'Bíceps / Antebraço', englishName: 'EZ Bar Preacher Curl', videoUrl: 'https://www.youtube.com/shorts/fS-uU-TjEqQ' },
  { name: 'Rosca Scott na Máquina', muscle: 'Bíceps / Antebraço', englishName: 'Machine Preacher Curl' },
  { name: 'Rosca Scott com Haltere', muscle: 'Bíceps / Antebraço', englishName: 'Dumbbell Preacher Curl' },
  { name: 'Rosca 21', muscle: 'Bíceps / Antebraço', englishName: '21s' },
  { name: 'Rosca Inclinada', muscle: 'Bíceps / Antebraço', englishName: 'Incline Bench Dumbbell Curl' },
  { name: 'Rosca Spider', muscle: 'Bíceps / Antebraço', englishName: 'Spider Curl' },
  { name: 'Rosca Aranha', muscle: 'Bíceps / Antebraço', englishName: 'Spider Curl' },
  { name: 'Rosca Drag Curl', muscle: 'Bíceps / Antebraço', englishName: 'Drag Curl' },
  { name: 'Bíceps Duplo no Pulley', muscle: 'Bíceps / Antebraço', englishName: 'High Cable Double Biceps Curl' },
  { name: 'Rosca Concentrada', muscle: 'Bíceps / Antebraço', englishName: 'Concentration Curl' },
  { name: 'Rosca Inversa com Barra W', muscle: 'Bíceps / Antebraço', englishName: 'EZ Bar Reverse Curl' },
  { name: 'Rosca Inversa na Polia', muscle: 'Bíceps / Antebraço', englishName: 'Reverse Cable Curl' },
  { name: 'Rosca Inversa com Halteres', muscle: 'Bíceps / Antebraço', englishName: 'Dumbbell Reverse Curl' },
  { name: 'Flexão de Punho com Barra', muscle: 'Bíceps / Antebraço', englishName: 'Barbell Wrist Curl' },
  { name: 'Flexão de Punho com Haltere', muscle: 'Bíceps / Antebraço', englishName: 'Dumbbell Wrist Curl' },
  { name: 'Flexão de Punho na Polia', muscle: 'Bíceps / Antebraço', englishName: 'Cable Wrist Curl' },
  { name: 'Extensão de Punho com Barra', muscle: 'Bíceps / Antebraço', englishName: 'Barbell Wrist Extension' },
  { name: 'Farmer Walk', muscle: 'Bíceps / Antebraço', englishName: 'Farmers Walk' },
  { name: 'Rolamento de Punho', muscle: 'Bíceps / Antebraço', englishName: 'Wrist Roller' },
  { name: 'Finger Curls', muscle: 'Bíceps / Antebraço', englishName: 'Finger Curls' },
  { name: 'Rosca Martelo com Corda na Polia', muscle: 'Bíceps / Antebraço', englishName: 'Cable Rope Hammer Curl' },


  // TRÍCEPS
  { name: 'Tríceps Pulley Barra Reta', muscle: 'Tríceps', englishName: 'Cable Triceps Pushdown', videoUrl: 'https://www.youtube.com/shorts/2-LAMpZBeuE' },
  { name: 'Tríceps Testa com Barra E-Z', muscle: 'Tríceps', englishName: 'EZ Bar Skull Crusher', videoUrl: 'https://www.youtube.com/shorts/kwG2ipFRgfo' },
  { name: 'Mergulho em Paralelas (Dips)', muscle: 'Tríceps', englishName: 'Triceps Dips', videoUrl: 'https://www.youtube.com/shorts/P6yM_E_tUjI' },
  { name: 'Mergulho no Banco (Bench Dips)', muscle: 'Tríceps', englishName: 'Bench Dips' },
  { name: 'Tríceps Coice com Haltere', muscle: 'Tríceps', englishName: 'Dumbbell Kickback' },
  { name: 'Tríceps Coice na Polia', muscle: 'Tríceps', englishName: 'Cable Kickback' },
  { name: 'Kick-back', muscle: 'Tríceps', englishName: 'Kickback' },
  { name: 'Supino com Pegada Estreita', muscle: 'Tríceps', englishName: 'Close Grip Bench Press' },
  { name: 'JM Press', muscle: 'Tríceps', englishName: 'JM Press' },
  { name: 'Katana Extension', muscle: 'Tríceps', englishName: 'Katana Extension' },
  { name: 'Tate Press', muscle: 'Tríceps', englishName: 'Tate Press' },
  { name: 'Flexão Diamante', muscle: 'Tríceps', englishName: 'Diamond Push Up' },
  { name: 'Flexão Cotovelos Fechados', muscle: 'Tríceps', englishName: 'Close Grip Push Up' },


  // ABDÔMEN / CORE
  { name: 'Abdominal Supra no Solo', muscle: 'Abdômen / Core', englishName: 'Abdominal Crunch' },
  { name: 'Abdominal Supra na Máquina', muscle: 'Abdômen / Core', englishName: 'Machine Crunch' },
  { name: 'Abdominal Supra com Anilha', muscle: 'Abdômen / Core', englishName: 'Weighted Crunch' },
  { name: 'Abdominal Borboleta', muscle: 'Abdômen / Core', englishName: 'Butterfly Sit-up' },
  { name: 'Sit-up', muscle: 'Abdômen / Core', englishName: 'Sit-up' },
  { name: 'Elevação de Pernas (Abdominal Infra)', muscle: 'Abdômen / Core', englishName: 'Leg Raise' },
  { name: 'Abdominal Infra Banco Inclinado', muscle: 'Abdômen / Core', englishName: 'Incline Leg Raise' },
  { name: 'Tesoura Abdominal', muscle: 'Abdômen / Core', englishName: 'Scissor Kicks' },
  { name: 'Flutter Kicks', muscle: 'Abdômen / Core', englishName: 'Flutter Kicks' },
  { name: 'Plancha Frontal Isométrica', muscle: 'Abdômen / Core', englishName: 'Plank' },
  { name: 'Plancha Lateral', muscle: 'Abdômen / Core', englishName: 'Side Plank' },
  { name: 'Plancha Spider-Man', muscle: 'Abdômen / Core', englishName: 'Spiderman Plank' },
  { name: 'Plancha Dinâmica', muscle: 'Abdômen / Core', englishName: 'Dynamic Plank' },
  { name: 'Side Dips na Plancha', muscle: 'Abdômen / Core', englishName: 'Plank Hip Dips' },
  { name: 'Roda Abdominal (Ab Wheel)', muscle: 'Abdômen / Core', englishName: 'Ab Wheel Rollout' },
  { name: 'Abdominal Canivete', muscle: 'Abdômen / Core', englishName: 'Jackknife Sit-up' },
  { name: 'V-Ups', muscle: 'Abdômen / Core', englishName: 'V-Ups' },
  { name: 'Woodchopper (Polia)', muscle: 'Abdômen / Core', englishName: 'Cable Woodchopper' },
  { name: 'Russian Twist', muscle: 'Abdômen / Core', englishName: 'Russian Twist' },
  { name: 'Giro de Tronco', muscle: 'Abdômen / Core', englishName: 'Torso Twist' },
  { name: 'Dead Bug', muscle: 'Abdômen / Core', englishName: 'Dead Bug' },
  { name: 'Bird Dog', muscle: 'Abdômen / Core', englishName: 'Bird Dog' },
  { name: 'Hollow Body Hold', muscle: 'Abdômen / Core', englishName: 'Hollow Body Hold' },
  { name: 'Mountain Climbers', muscle: 'Abdômen / Core', englishName: 'Mountain Climbers' },
  { name: 'Bear Crawl', muscle: 'Abdômen / Core', englishName: 'Bear Crawl' },
  { name: 'Pallof Press', muscle: 'Abdômen / Core', englishName: 'Pallof Press' },
  { name: 'Windshield Wipers', muscle: 'Abdômen / Core', englishName: 'Windshield Wipers' },
  { name: 'Prancha com Peso', muscle: 'Abdômen / Core', englishName: 'Weighted Plank' },
  { name: 'Abdominal Infra na Barra Fixa', muscle: 'Abdômen / Core', englishName: 'Hanging Leg Raise' },


  // MOBILIDADE / CARDIO
  { name: 'Mobilidade de Quadril 90/90', muscle: 'Mobilidade / Cardio', englishName: '90/90 Hip Mobility' },
  { name: 'Cat-Cow (Gato-Vaca)', muscle: 'Mobilidade / Cardio', englishName: 'Cat-Cow Stretch' },
  { name: 'Cão Olhando para Baixo', muscle: 'Mobilidade / Cardio', englishName: 'Downward Dog' },
  { name: 'World\'s Greatest Stretch', muscle: 'Mobilidade / Cardio', englishName: 'Worlds Greatest Stretch' },
  { name: 'Esteira', muscle: 'Mobilidade / Cardio', englishName: 'Treadmill Running' },
  { name: 'Bicicleta Ergométrica', muscle: 'Mobilidade / Cardio', englishName: 'Stationary Bike' },
  { name: 'Elíptico', muscle: 'Mobilidade / Cardio', englishName: 'Elliptical Trainer' },
  { name: 'Remo Ergométrico', muscle: 'Mobilidade / Cardio', englishName: 'Rowing Machine' },
  { name: 'Burpees', muscle: 'Mobilidade / Cardio', englishName: 'Burpees' },
  { name: 'Pular Corda', muscle: 'Mobilidade / Cardio', englishName: 'Jump Rope' },
  { name: 'Battle Ropes', muscle: 'Mobilidade / Cardio', englishName: 'Battle Ropes' },
  { name: 'Kettlebell Swing', muscle: 'Mobilidade / Cardio', englishName: 'Kettlebell Swing' },
  { name: 'Escada (Stairmaster)', muscle: 'Mobilidade / Cardio', englishName: 'Stair Climber' },
  { name: 'Mobilidade de Tornozelo', muscle: 'Mobilidade / Cardio', englishName: 'Ankle Mobility' },

];

export const MUSCLE_GROUPS = Array.from(new Set(EXERCISE_LIBRARY.map(ex => ex.muscle)));
