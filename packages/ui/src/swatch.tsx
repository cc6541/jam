// Invariant 6 : une couleur a toujours un motif associé. Les motifs miroitent ceux du rendu Pixi.
export type SwatchPattern = 'dots' | 'stripes' | 'cross' | 'wave' | 'grid' | 'plain';

export interface SwatchDef {
  id: string;
  label: string;
  color: string;
  pattern: SwatchPattern;
}

function PatternPaths({ pattern }: { pattern: SwatchPattern }) {
  const common = { stroke: '#fff', strokeOpacity: 0.9, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  switch (pattern) {
    case 'dots':
      return (
        <g fill="#fff" fillOpacity={0.9}>
          <circle cx="-4.5" cy="-3" r="2.2" />
          <circle cx="4.5" cy="-3" r="2.2" />
          <circle cx="0" cy="4.5" r="2.2" />
        </g>
      );
    case 'stripes':
      return <path {...common} d="M-7 2 L2 -7 M-2 7 L7 -2" />;
    case 'cross':
      return <path {...common} d="M-8 0 H8 M0 -8 V8" />;
    case 'wave':
      return <path {...common} d="M-8 0 Q-4 -5 0 0 T8 0" />;
    case 'grid':
      return <path {...common} d="M-5 -5 H5 V5 H-5 Z M0 -5 V5 M-5 0 H5" />;
    case 'plain':
      return <circle {...common} r="4.5" />;
  }
}

export function Swatch({ swatch, size = 28 }: { swatch: SwatchDef; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" role="img" aria-label={swatch.label}>
      <circle r="11" fill={swatch.color} stroke="#111" strokeWidth="1.5" />
      <PatternPaths pattern={swatch.pattern} />
    </svg>
  );
}
