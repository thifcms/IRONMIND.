/**
 * Gera uma imagem (cartão) resumindo o treino concluído, pra
 * compartilhar no WhatsApp/Instagram/etc -- desenhado num <canvas> em
 * memória, sem precisar de nenhuma lib externa de imagem.
 */

export interface WorkoutCardData {
  dayLabel: string;
  exerciseCount: number;
  streakCount: number;
  dateLabel: string; // já formatado, ex: "24 de agosto"
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateWorkoutCard(data: WorkoutCardData): Promise<Blob | null> {
  const W = 1080, H = 1350; // proporção 4:5, boa pro feed do Instagram
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Fundo em degradê escuro
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Textura sutil: alguns círculos translúcidos
  ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.15, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.1, H * 0.85, 220, 0, Math.PI * 2);
  ctx.fill();

  // Logo (best-effort -- se falhar ao carregar, segue sem ele)
  try {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const logo = await loadImage(`${base.replace(/\/$/, '')}/icon.svg`);
    const logoSize = 100;
    ctx.drawImage(logo, W / 2 - logoSize / 2, 90, logoSize, logoSize);
  } catch {
    // sem logo, sem problema
  }

  ctx.textAlign = 'center';

  // Marca
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px Arial, sans-serif';
  ctx.fillText('IRONMIND', W / 2, 260);

  // "TREINO CONCLUÍDO"
  ctx.fillStyle = '#3b82f6';
  ctx.font = '900 56px Arial, sans-serif';
  ctx.fillText('TREINO CONCLUÍDO', W / 2, 420);

  // Nome do treino
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px Arial, sans-serif';
  ctx.fillText(data.dayLabel.toUpperCase(), W / 2, 520);

  // Data
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 32px Arial, sans-serif';
  ctx.fillText(data.dateLabel, W / 2, 570);

  // Linha divisória
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, 650);
  ctx.lineTo(W * 0.8, 650);
  ctx.stroke();

  // Estatísticas (exercícios + streak) lado a lado
  const statY = 820;
  const col1X = W * 0.3, col2X = W * 0.7;

  ctx.fillStyle = '#3b82f6';
  ctx.font = '900 110px Arial, sans-serif';
  ctx.fillText(String(data.exerciseCount), col1X, statY);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 28px Arial, sans-serif';
  ctx.fillText('EXERCÍCIOS', col1X, statY + 60);

  ctx.fillStyle = '#f97316';
  ctx.font = '900 110px Arial, sans-serif';
  ctx.fillText(`${data.streakCount}🔥`, col2X, statY);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 28px Arial, sans-serif';
  ctx.fillText('DIAS SEGUIDOS', col2X, statY + 60);

  // Rodapé
  ctx.fillStyle = '#475569';
  ctx.font = '600 26px Arial, sans-serif';
  ctx.fillText('Treinado com IronMind', W / 2, H - 80);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}

/** Compartilha o cartão via Web Share API (com arquivo) quando disponível;
 *  senão, baixa a imagem direto. */
export async function shareWorkoutCard(data: WorkoutCardData): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const blob = await generateWorkoutCard(data);
    if (!blob) return 'failed';

    const file = new File([blob], 'ironmind-treino.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Treino concluído no IronMind',
        text: `Acabei de concluir o treino "${data.dayLabel}" no IronMind! ${data.streakCount} dias seguidos 🔥`,
      });
      return 'shared';
    }

    // Fallback: baixa a imagem
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ironmind-treino.png';
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch (e) {
    console.warn('Falha ao gerar/compartilhar cartão de treino:', e);
    return 'failed';
  }
}
