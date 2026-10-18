// Icônes vectorielles (aria-hidden : le libellé est porté par le bouton). `currentColor` pour suivre le thème.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function NutIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      <path d="M12 1.8 21 7v10l-9 5.2L3 17V7z" fill="#ffc928" stroke="#b07a00" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 4.2 19 8.3v7.4L12 19.8 5 15.7V8.3z" fill="#ffdb5c" />
      <circle cx="12" cy="12" r="3.6" fill="#b07a00" />
      <circle cx="12" cy="12" r="2.2" fill="#6e4b00" />
      <path d="M7.5 8.6 12 6l2.6 1.5" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export type BoosterIcon = 'undo' | 'slot' | 'clear';

export function BoosterGlyph({ icon, size = 30 }: { icon: BoosterIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      {icon === 'undo' ? <path {...stroke} d="M9 6 4.5 10.5 9 15M5 10.5h9.5a4.5 4.5 0 0 1 0 9H10" /> : null}
      {icon === 'slot' ? (
        <>
          <circle {...stroke} cx="12" cy="12" r="8.5" />
          <path {...stroke} d="M12 8v8M8 12h8" />
        </>
      ) : null}
      {icon === 'clear' ? <path {...stroke} d="M12 3.5v9.5M8 9.5l4 4 4-4M4.5 17h15v3.5h-15z" /> : null}
    </svg>
  );
}

export function GearIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      <path
        {...stroke}
        strokeWidth={2.2}
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19.4 13.5l1.6 1.2-2 3.5-1.9-.7a7 7 0 0 1-1.7 1l-.3 2H11l-.3-2a7 7 0 0 1-1.7-1l-1.9.7-2-3.5 1.6-1.2a7 7 0 0 1 0-2l-1.6-1.2 2-3.5 1.9.7a7 7 0 0 1 1.7-1l.3-2h4l.3 2a7 7 0 0 1 1.7 1l1.9-.7 2 3.5-1.6 1.2a7 7 0 0 1 0 2Z"
      />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      <path {...stroke} strokeWidth={4} d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Pictogramme « pub récompensée » : écran avec triangle de lecture. */
export function AdIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="jam-icon">
      <rect x="2.5" y="4.5" width="19" height="15" rx="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M10 9v6l5-3z" fill="currentColor" />
    </svg>
  );
}

export type ProductIcon = 'nuts' | 'noads' | 'starter' | 'piggy';

export function ProductArt({ icon, tier = 1 }: { icon: ProductIcon; tier?: number }) {
  if (icon === 'nuts') {
    const n = Math.min(4, Math.max(1, tier));
    return (
      <span className="jam-art jam-art--nuts" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <NutIcon key={i} size={30 - n * 2} />
        ))}
      </span>
    );
  }
  return (
    <svg width="54" height="54" viewBox="0 0 48 48" aria-hidden="true" className="jam-art">
      {icon === 'noads' ? (
        <>
          <rect x="6" y="11" width="36" height="26" rx="7" fill="#2f8cf5" />
          <text x="24" y="29.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="inherit">
            AD
          </text>
          <path d="M9 40 39 8" stroke="#f0444b" strokeWidth="5" strokeLinecap="round" />
        </>
      ) : null}
      {icon === 'starter' ? (
        <>
          <rect x="7" y="20" width="34" height="22" rx="5" fill="#9b5cf6" />
          <rect x="5" y="14" width="38" height="9" rx="4" fill="#b98bff" />
          <rect x="21" y="14" width="6" height="28" fill="#ffc928" />
          <path d="M24 14c-4-8-13-6-9 0M24 14c4-8 13-6 9 0" fill="none" stroke="#ffc928" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : null}
      {icon === 'piggy' ? (
        <>
          <ellipse cx="24" cy="27" rx="16" ry="12" fill="#ff8fb1" />
          <circle cx="37" cy="25" r="5.5" fill="#ff7aa2" />
          <circle cx="36" cy="24" r="1.2" fill="#7a2343" />
          <circle cx="38.5" cy="24" r="1.2" fill="#7a2343" />
          <path d="M17 17l3-6 4 5" fill="#ff7aa2" />
          <rect x="14" y="36" width="5" height="6" rx="2" fill="#ff7aa2" />
          <rect x="28" y="36" width="5" height="6" rx="2" fill="#ff7aa2" />
          <rect x="19" y="15" width="10" height="3" rx="1.5" fill="#7a2343" />
          <circle cx="29" cy="23" r="1.6" fill="#7a2343" />
        </>
      ) : null}
    </svg>
  );
}

/** Illustration de vis pour le logo. */
export function ScrewArt({ color = '#ffc928', size = 64 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="jam-art">
      <ellipse cx="35" cy="38" rx="24" ry="22" fill="#0b1a33" opacity=".25" />
      <circle cx="32" cy="32" r="26" fill="#fff" />
      <circle cx="32" cy="32" r="23" fill={color} />
      <circle cx="28" cy="27" r="14" fill="#fff" opacity=".22" />
      <path d="M20 32h24M32 20v24" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path d="M21 33h24M33 21v24" stroke="#0b1a33" strokeOpacity=".2" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="22" cy="17" rx="7" ry="3.5" fill="#fff" opacity=".6" />
    </svg>
  );
}
