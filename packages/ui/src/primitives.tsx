import { useEffect, useRef, type ReactNode } from 'react';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`jam-btn jam-btn--${variant}`}
      onClick={onClick}
      disabled={disabled === true}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      {children}
    </button>
  );
}

/** Modale accessible : rôle dialog, titre relié, focus piégé à l'ouverture, Échap = fermer si `onClose`. */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  }, []);
  return (
    <div className="jam-backdrop">
      <div
        ref={ref}
        className="jam-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onClose) onClose();
        }}
      >
        <h2 className="jam-modal__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
