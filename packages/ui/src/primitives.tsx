import { useEffect, useRef, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`jam-btn jam-btn--${variant} jam-btn--${size}`}
      onClick={onClick}
      disabled={disabled === true}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      {children}
    </button>
  );
}

export type Tone = 'green' | 'blue' | 'red' | 'gold';

/**
 * Modale accessible : rôle dialog nommé, ruban de titre coloré, focus sur la première action,
 * Échap et bouton × pour fermer si `onClose`.
 */
export function Modal({
  title,
  tone = 'blue',
  children,
  onClose,
  closeLabel = 'Fermer',
}: {
  title: string;
  tone?: Tone;
  children: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.jam-modal__body button:not([disabled])')?.focus();
  }, []);
  return (
    <div className="jam-backdrop">
      <div
        ref={ref}
        className={`jam-modal jam-modal--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onClose) onClose();
        }}
      >
        <h2 className="jam-ribbon">{title}</h2>
        {onClose ? (
          <button type="button" className="jam-close" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        ) : null}
        <div className="jam-modal__body">{children}</div>
      </div>
    </div>
  );
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="jam-switch" onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span className="jam-switch__track" aria-hidden="true">
        <span className="jam-switch__thumb" />
      </span>
    </button>
  );
}
