import React from 'react';

/**
 * Ícones simples (SVG, desenhados em código) representando os tipos de
 * corpo e níveis de autopercepção por região. Não são fotos -- silhuetas
 * minimalistas, no mesmo espírito visual do resto do app (ícones lucide),
 * evitando usar fotos reais de corpos (sensível, e questão de direitos de
 * imagem se viessem de busca na internet).
 */

interface IconProps {
  className?: string;
}

const base = "w-full h-full";

// ─── Tipos de corpo (6 opções) ──────────────────────────────────────
export function BodyTypeGordo({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="14" r="9" />
      <path d="M14 34 Q30 26 46 34 Q52 60 44 88 L38 88 L34 58 L30 70 L26 58 L22 88 L16 88 Q8 60 14 34 Z" />
    </svg>
  );
}

export function BodyTypeQuadrado({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="14" r="8" />
      <path d="M16 32 L44 32 L44 60 L38 60 L36 88 L30 60 L24 60 L22 88 L16 60 Z" />
    </svg>
  );
}

export function BodyTypeTriangular({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="14" r="8" />
      <path d="M24 32 L36 32 L48 58 L40 60 L36 88 L30 62 L24 88 L20 60 L12 58 Z" />
    </svg>
  );
}

export function BodyTypeLongilineo({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="10" r="7" />
      <path d="M22 26 L38 26 L36 55 L33 92 L30 60 L27 92 L24 55 Z" />
    </svg>
  );
}

export function BodyTypeBrevilineo({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="18" r="9" />
      <path d="M17 36 L43 36 L41 58 L36 58 L33 82 L30 62 L27 82 L24 58 L19 58 Z" />
    </svg>
  );
}

export function BodyTypeOmbrosLargos({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="30" cy="12" r="8" />
      <path d="M10 30 L50 30 L44 46 L36 42 L34 60 L31 90 L28 60 L26 60 L24 90 L26 42 L16 46 Z" />
    </svg>
  );
}

export const BODY_TYPES: { id: string; label: string; Icon: React.FC<IconProps> }[] = [
  { id: 'gordo', label: 'Corpo Cheio', Icon: BodyTypeGordo },
  { id: 'quadrado', label: 'Quadrado', Icon: BodyTypeQuadrado },
  { id: 'triangular', label: 'Triangular', Icon: BodyTypeTriangular },
  { id: 'longilineo', label: 'Longilíneo', Icon: BodyTypeLongilineo },
  { id: 'brevilineo', label: 'Brevilíneo', Icon: BodyTypeBrevilineo },
  { id: 'ombros_largos', label: 'Ombros Largos', Icon: BodyTypeOmbrosLargos },
];

// ─── Regiões do corpo, com 3 níveis cada (menos → mais definido/volume) ──
export const BODY_REGIONS: { id: string; label: string }[] = [
  { id: 'abdomen', label: 'Abdômen' },
  { id: 'bracos', label: 'Braços' },
  { id: 'pernas', label: 'Pernas' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'peito_ombros', label: 'Peito / Ombros' },
];

/** Ícone de nível (1, 2 ou 3) para uma região -- barras preenchidas. */
export function RegionLevelIcon({ level, className = base }: { level: 1 | 2 | 3; className?: string }) {
  const heights = [30, 55, 80];
  return (
    <svg viewBox="0 0 60 90" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {[0, 1, 2].map((i) => {
        const active = i < level;
        const h = heights[i];
        const barWidth = 12;
        const x = 8 + i * 18;
        const y = 82 - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={3}
            fill={active ? "currentColor" : "none"}
            opacity={active ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}
