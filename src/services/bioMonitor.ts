/**
 * Bio-Monitor IA: Segurança e Performance
 * Responsável por analisar riscos e fadiga.
 */
export const bioMonitor = {
  // Analisar fadiga baseada na velocidade da execução (Velocity Based Training)
  analyzeFatigue(repSpeeds: number[]): 'fresco' | 'fadiga_leve' | 'critico' {
    if (repSpeeds.length < 2) return 'fresco';
    
    const lastSpeed = repSpeeds[repSpeeds.length - 1];
    const initialSpeed = repSpeeds[0];
    const drop = (initialSpeed - lastSpeed) / initialSpeed;

    if (drop > 0.4) return 'critico'; // Queda de 40% na velocidade indica falha iminente
    if (drop > 0.2) return 'fadiga_leve';
    return 'fresco';
  },

  // Alerta de batimentos cardíacos (Simulado via Web API ou Google Fit)
  checkHeartRateZone(bpm: number, age: number) {
    const maxHR = 220 - age;
    const intensity = (bpm / maxHR) * 100;

    if (intensity > 90) return { status: 'perigo', msg: 'Reduza a intensidade imediatamente!' };
    if (intensity > 70) return { status: 'ideal', msg: 'Zona de queima de gordura/aeróbico.' };
    return { status: 'aquecimento', msg: 'Intensidade baixa.' };
  }
};
