// Icônes vectorielles (aria-hidden : le libellé est porté par le bouton).
const stroke = { fill: 'none', stroke: '#fff', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function NutIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      <circle cx="12" cy="12" r="11" fill="#f5c33b" stroke="#8a5a10" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="#ffe595" strokeWidth="1" />
      <path d="M12 6.4 16.9 9.2v5.6L12 17.6 7.1 14.8V9.2z" fill="#c98f1a" stroke="#8a5a10" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.3" fill="#5b3a08" />
    </svg>
  );
}

export type BoosterIcon = 'undo' | 'slot' | 'clear';

export function BoosterGlyph({ icon, size = 34 }: { icon: BoosterIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      {icon === 'undo' ? <path {...stroke} d="M9 6 4.5 10.5 9 15M5 10.5h9.5a4.5 4.5 0 0 1 0 9H10" /> : null}
      {icon === 'slot' ? (
        <>
          <rect {...stroke} x="3.5" y="5.5" width="17" height="13" rx="3" />
          <path {...stroke} d="M12 9v6M9 12h6" />
        </>
      ) : null}
      {icon === 'clear' ? <path {...stroke} d="M12 3.5v10M8 9.8l4 4 4-4M4.5 17h15v3.5h-15z" /> : null}
    </svg>
  );
}
