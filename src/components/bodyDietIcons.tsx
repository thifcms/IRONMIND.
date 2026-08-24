/**
 * Dados de imagens (fotos ilustradas geradas por IA) usadas na etapa
 * "Corpo & Dieta" do perfil: tipo de corpo, autopercepção atual e meta,
 * por região corporal. Substituem as silhuetas SVG antigas.
 *
 * Todas as imagens ficam em /public/bodydiet/... . O Render/Netlify
 * servem o app na raiz do domínio ('/'), mas o GitHub Pages publica
 * dentro de uma subpasta (github.io/IRONMIND./) -- por isso os
 * caminhos passam pelo helper asset() abaixo, que prefixa com o
 * BASE_URL correto em vez de ficar fixo em "/" (que só funciona na
 * raiz e quebra -- fica com ícone de imagem quebrada -- assim que o
 * app é publicado numa subpasta).
 */

function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

export interface BodyOption {
  id: string;
  src: string;
}

// ─── Tipos de corpo (etapa "tipoCorpo") ───────────────────────────────
export const BODY_TYPES: { id: string; label: string; src: string }[] = [
  { id: 'gordo', label: 'Gordo / Endomorfa', src: asset('bodydiet/tipos/gordo.jpg') },
  { id: 'quadrado', label: 'Quadrado / Retangular', src: asset('bodydiet/tipos/quadrado.jpg') },
  { id: 'triangular', label: 'Triangular / Pera', src: asset('bodydiet/tipos/triangular.jpg') },
  { id: 'vshape', label: 'Ombros Largos', src: asset('bodydiet/tipos/vshape.jpg') },
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
    src: asset(`bodydiet/${folder}/${folder}_${r}_${i + 1}.png`),
  }));
}

// Glúteos v2: 5 níveis (1 imagem cada), Nível 1 (plano) a Nível 5 (hipertrofiado).
// A mesma escala serve tanto pra "atual" quanto pra "meta".
const GLUTEOS_NIVEIS: BodyOption[] = Array.from({ length: 5 }, (_, i) => ({
  id: `gluteos_nivel_${i + 1}`,
  src: asset(`bodydiet/gluteos_v2/gluteos_nivel_${i + 1}.jpg`),
}));
export const GLUTEOS_NIVEL_LABELS = ['Plano', 'Leve volume', 'Firme e definido', 'Bem definido', 'Hipertrofiado'];

// Pernas v3: 10 fotos (5 "atuais" + 5 "meta"), mesmo padrão de
// costas/torso (uma linha sem escolha de nível, cada foto é uma opção).
const PERNAS_ATUAL: BodyOption[] = Array.from({ length: 5 }, (_, i) => ({
  id: `pernas_${i + 1}`,
  src: asset(`bodydiet/pernas_v3/pernas_${i + 1}.jpg`),
}));
const PERNAS_META: BodyOption[] = Array.from({ length: 5 }, (_, i) => ({
  id: `pernas_${i + 6}`,
  src: asset(`bodydiet/pernas_v3/pernas_${i + 6}.jpg`),
}));

export const BODY_REGIONS: BodyRegion[] = [
  {
    id: 'costas',
    label: 'Ombros e Costas',
    current: row('costas', 'costas', 1),
    goalLevels: [row('costas', 'costas', 2), row('costas', 'costas', 3), row('costas', 'costas', 4)],
  },
  {
    id: 'torso',
    label: 'Peito / Abdômen',
    current: row('torso', 'torso', 1),
    goalLevels: [row('torso', 'torso', 2), row('torso', 'torso', 3), row('torso', 'torso', 4)],
  },
  {
    id: 'gluteos',
    label: 'Quadril e Glúteos',
    current: GLUTEOS_NIVEIS,
    goalLevels: [GLUTEOS_NIVEIS],
  },
  {
    id: 'pernas',
    label: 'Pernas',
    current: PERNAS_ATUAL,
    goalLevels: [PERNAS_META],
  },
];
