/**
 * Dados de imagens (fotos ilustradas geradas por IA) usadas na etapa
 * "Corpo & Dieta" do perfil: tipo de corpo, autopercepção atual e meta,
 * por região corporal. Substituem as silhuetas SVG antigas.
 *
 * Todas as imagens ficam em /public/bodydiet/... e são referenciadas
 * por caminho absoluto (sem import), pois são assets estáticos.
 */

export interface BodyOption {
  id: string;
  src: string;
}

// ─── Tipos de corpo (etapa "tipoCorpo") ───────────────────────────────
export const BODY_TYPES: { id: string; label: string; src: string }[] = [
  { id: 'gordo', label: 'Corpo Cheio', src: '/bodydiet/corpo/corpo_gordo.png' },
  { id: 'musculoso', label: 'Musculoso / Definido', src: '/bodydiet/corpo/corpo_musculoso.png' },
];

// ─── Regiões do corpo: cada uma tem 5 opções "atuais" (linha 1 da
// grade de referência) e de 1 a 3 "níveis" de meta, cada nível com
// 5 variações de corpo pra escolher ──────────────────────────────────
export interface BodyRegion {
  id: string;
  label: string;
  current: BodyOption[];
  goalLevels: BodyOption[][];
}

function row(prefix: string, folder: string, r: number, count = 5): BodyOption[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}_${r}_${i + 1}`,
    src: `/bodydiet/${folder}/${folder}_${r}_${i + 1}.png`,
  }));
}

export const BODY_REGIONS: BodyRegion[] = [
  {
    id: 'costas',
    label: 'Ombros e Costas',
    current: row('costas', 'costas', 1),
    goalLevels: [row('costas', 'costas', 2), row('costas', 'costas', 3), row('costas', 'costas', 4)],
  },
  {
    id: 'torso',
    label: 'Torso / Abdômen',
    current: row('torso', 'torso', 1),
    goalLevels: [row('torso', 'torso', 2), row('torso', 'torso', 3), row('torso', 'torso', 4)],
  },
  {
    id: 'gluteos',
    label: 'Quadril e Glúteos',
    current: row('gluteos', 'gluteos', 1),
    goalLevels: [row('gluteos', 'gluteos', 2)],
  },
  {
    id: 'pernas',
    label: 'Pernas',
    current: Array.from({ length: 5 }, (_, i) => ({ id: `pernas_${i + 1}`, src: `/bodydiet/pernas/pernas_${i + 1}.png` })),
    // Pernas só tem uma leva de fotos -- usa a mesma leva como opções de meta.
    goalLevels: [Array.from({ length: 5 }, (_, i) => ({ id: `pernas_${i + 1}`, src: `/bodydiet/pernas/pernas_${i + 1}.png` }))],
  },
];
