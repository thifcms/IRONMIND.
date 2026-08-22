import React from 'react';

/**
 * Ícones (SVG, desenhados em código) representando os tipos de corpo e
 * níveis de autopercepção por região. Não são fotos -- silhuetas
 * preenchidas e mais trabalhadas, evitando usar fotos reais de corpos
 * (sensível, e questão de fragmentação por região se viessem de busca
 * na internet). v2: silhuetas preenchidas com mais contraste entre os
 * tipos, e ícones de "nível por região" como mini-silhuetas em vez de
 * barras abstratas.
 */

interface IconProps {
  className?: string;
}

const base = "w-full h-full";

// ─── Tipos de corpo (6 opções), silhuetas preenchidas de frente ────────
export function BodyTypeGordo({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 80 130" className={className}>
      <circle cx="40" cy="16" r="13" fill="currentColor" />
      <path
        d="M22 34 Q40 26 58 34 Q70 48 68 66 Q66 80 60 90 Q64 106 60 124 L48 124 L44 92 L40 100 L36 92 L32 124 L20 124 Q16 106 20 90 Q14 80 12 66 Q10 48 22 34 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BodyTypeQuadrado({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 80 130" className={className}>
      <circle cx="40" cy="14" r="11" fill="currentColor" />
      <path
        d="M20 30 L60 30 Q64 30 64 40 L62 76 Q62 80 58 80 L52 80 L50 124 L42 124 L40 84 L38 124 L30 124 L28 80 L22 80 Q18 80 18 76 L16 40 Q16 30 20 30 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BodyTypeTriangular({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 80 130" className={className}>
      <circle cx="40" cy="14" r="10" fill="currentColor" />
      <path
        d="M32 28 L48 28 Q54 40 60 58 Q66 74 70 78 Q64 82 56 78 Q54 100 52 124 L44 124 L40 88 L36 124 L28 124 Q26 100 24 78 Q16 82 10 78 Q14 74 20 58 Q26 40 32 28 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BodyTypeLongilineo({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 80 130" className={className}>
      <circle cx="40" cy="12" r="9" fill="currentColor" />
      <path
        d="M28 24 L52 24 Q54 40 50 62 L47 96 L44 124 L38 124 L36 96 L34 62 L30 96 L28 124 L22 124 L19 96 L16 62 Q12 40 28 24 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BodyTypeBrevilineo({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 80 130" className={className}>
      <circle cx="40" cy="19" r="12" fill="currentColor" />
      <path
        d="M23 38 L57 38 Q60 38 60 46 L58 68 Q57 72 53 72 L50 72 L48 100 L46 124 L36 124 L34 100 L32 100 L30 124 L20 124 L22 100 L20 72 L17 72 Q13 72 12 68 L10 46 Q10 38 23 38 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BodyTypeOmbrosLargos({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 80 130" className={className}>
      <circle cx="40" cy="13" r="10" fill="currentColor" />
      <path
        d="M10 34 L70 34 Q68 44 58 50 L53 46 Q52 60 50 74 Q49 100 47 124 L40 124 L38 88 L36 88 L34 124 L27 124 Q25 100 24 74 Q22 60 21 46 L16 50 Q6 44 10 34 Z"
        fill="currentColor"
      />
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

// ─── Regiões do corpo, com 3 níveis cada ──────────────────────────────
export const BODY_REGIONS: { id: string; label: string }[] = [
  { id: 'abdomen', label: 'Abdômen' },
  { id: 'bracos', label: 'Braços' },
  { id: 'pernas', label: 'Pernas' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'peito_ombros', label: 'Peito / Ombros' },
];

/**
 * Ícone de nível (1, 2 ou 3) por região -- mini-silhueta genérica do
 * corpo, com a região em questão desenhada maior/mais definida
 * conforme o nível (em vez de barras abstratas).
 */
export function RegionLevelIcon({ level, region, className = base }: { level: 1 | 2 | 3; region?: string; className?: string }) {
  const scale = { 1: 0.55, 2: 0.78, 3: 1 }[level];
  const opacity = { 1: 0.45, 2: 0.7, 3: 1 }[level];

  // Corpo-base (sempre igual, suave) + destaque na região, escalado pelo nível
  return (
    <svg viewBox="0 0 60 90" className={className}>
      {/* silhueta base, sempre visível e sutil */}
      <g fill="currentColor" opacity={0.25}>
        <circle cx="30" cy="10" r="7" />
        <path d="M20 22 L40 22 L38 50 L36 80 L32 80 L30 52 L28 80 L24 80 L22 50 Z" />
      </g>
      {/* destaque na região, cresce com o nível */}
      <g fill="currentColor" opacity={opacity}>
        {region === 'bracos' && (
          <>
            <rect x={20 - 3 * scale} y="24" width={3 * scale + 2} height={26 * scale} rx="2" />
            <rect x="37" y="24" width={3 * scale + 2} height={26 * scale} rx="2" />
          </>
        )}
        {region === 'pernas' && (
          <>
            <rect x="24" y={52} width={4 * scale + 1.5} height={28 * scale} rx="2" />
            <rect x="31" y={52} width={4 * scale + 1.5} height={28 * scale} rx="2" />
          </>
        )}
        {region === 'gluteos' && (
          <ellipse cx="30" cy="55" rx={9 * scale} ry={7 * scale} />
        )}
        {region === 'peito_ombros' && (
          <path d={`M${20 - 3 * scale} 24 L${40 + 3 * scale} 24 L${38 + scale} ${30 + 5 * scale} L${22 - scale} ${30 + 5 * scale} Z`} />
        )}
        {(!region || region === 'abdomen') && (
          <rect x="26" y="32" width="8" height={16 * scale} rx="2" />
        )}
      </g>
    </svg>
  );
}
