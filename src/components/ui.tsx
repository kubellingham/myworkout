import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' on' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">
        −
      </button>
      <span>
        {value}
        {suffix && <small> {suffix}</small>}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        +
      </button>
    </div>
  );
}

/** Minutes : seconds input, value in seconds. */
export function DurationInput({ value, onChange, ariaLabel }: { value: number; onChange: (s: number) => void; ariaLabel?: string }) {
  const [m, setM] = useState(String(Math.floor(value / 60)));
  const [s, setS] = useState(String(value % 60).padStart(2, '0'));

  useEffect(() => {
    setM(String(Math.floor(value / 60)));
    setS(String(value % 60).padStart(2, '0'));
  }, [value]);

  const commit = (mm: string, ss: string) => {
    const total = (parseInt(mm || '0', 10) || 0) * 60 + (parseInt(ss || '0', 10) || 0);
    onChange(Math.max(0, Math.min(total, 24 * 3600)));
  };

  return (
    <div className="duration" aria-label={ariaLabel}>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={m}
        aria-label="minutes"
        onFocus={(e) => e.target.select()}
        onChange={(e) => setM(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={() => commit(m, s)}
      />
      <span>:</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={s}
        aria-label="seconds"
        onFocus={(e) => e.target.select()}
        onChange={(e) => setS(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={() => commit(m, s)}
      />
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  placeholder,
  decimal = false,
  ariaLabel,
  className,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
  decimal?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setText((prev) => {
      const parsed = prev.trim() === '' ? null : Number(prev.replace(',', '.'));
      return parsed === (value ?? null) ? prev : value == null ? '' : String(value);
    });
  }, [value]);
  return (
    <input
      className={`num-input ${className ?? ''}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, '');
        setText(t);
        if (t.trim() === '') onChange(null);
        else {
          const n = Number(t.replace(',', '.'));
          if (Number.isFinite(n)) onChange(n);
        }
      }}
    />
  );
}
