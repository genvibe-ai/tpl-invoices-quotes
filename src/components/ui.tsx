import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, Check, CheckCheck, ChevronDown, CircleAlert, CircleX, Clock, Pencil, Search, Send, X } from 'lucide-react';
import type { DisplayStatus } from '../lib/types';
import { initials } from '../lib/format';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------- Button ---------- */
const VARIANTS = {
  primary: 'bg-accent-700 text-accent-50 hover:bg-accent-800 active:bg-accent-900',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-paper-2 hover:border-ink-3/40',
  ghost: 'text-ink-2 hover:bg-paper-2 hover:text-ink',
  danger: 'text-danger-600 hover:bg-danger-50',
  dangerSolid: 'bg-danger-600 text-danger-50 hover:bg-danger-700',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  href?: string;
};

export function Button({ variant = 'secondary', size = 'md', icon, className, children, href, ...rest }: ButtonProps) {
  const cls = cx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:opacity-45 disabled:pointer-events-none',
    size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
    VARIANTS[variant],
    className,
  );
  if (href) {
    return (
      <a href={'#' + href} className={cls}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/* ---------- Status pill ---------- */
const STATUS: Record<DisplayStatus, { label: string; cls: string; Icon: typeof Check }> = {
  draft: { label: 'Draft', cls: 'border-line-strong bg-paper-2 text-ink-2', Icon: Pencil },
  sent: { label: 'Sent', cls: 'border-info-100 bg-info-50 text-info-700', Icon: Send },
  overdue: { label: 'Overdue', cls: 'border-danger-100 bg-danger-50 text-danger-700', Icon: CircleAlert },
  paid: { label: 'Paid', cls: 'border-accent-100 bg-accent-50 text-accent-700', Icon: Check },
  accepted: { label: 'Accepted', cls: 'border-accent-100 bg-accent-50 text-accent-700', Icon: CheckCheck },
  declined: { label: 'Declined', cls: 'border-line-strong bg-paper-2 text-ink-3', Icon: CircleX },
  expired: { label: 'Expired', cls: 'border-warning-100 bg-warning-50 text-warning-700', Icon: Clock },
  converted: { label: 'Invoiced', cls: 'border-accent-200 bg-surface text-accent-700', Icon: ArrowRightLeft },
};

export function StatusPill({ status, className }: { status: DisplayStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium', s.cls, className)}>
      <s.Icon size={12} strokeWidth={2.25} aria-hidden />
      {s.label}
    </span>
  );
}

/* ---------- Form controls ---------- */
export const inputCls =
  'h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3/80 transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputCls, className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputCls, 'h-auto min-h-24 py-2.5 leading-relaxed', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx('relative', className)}>
      <select {...rest} className={cx(inputCls, 'cursor-pointer appearance-none pr-9')}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  );
}

export function NumInput({
  value,
  onValue,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number; onValue: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => ((parseFloat(t) || 0) === value ? t : String(value)));
  }, [value]);
  return (
    <input
      inputMode="decimal"
      {...rest}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.-]/g, '');
        setText(t);
        const n = parseFloat(t);
        onValue(Number.isFinite(n) ? n : 0);
      }}
      className={cx(inputCls, 'text-right tabular-nums', className)}
    />
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(inputCls, 'pl-9')}
      />
    </div>
  );
}

/* ---------- Layout ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-xl border border-line bg-surface', className)}>{children}</section>;
}

export function CardHeader({ title, action, description }: { title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3 text-sm text-ink-3">{eyebrow}</div>}
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-balance sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-prose text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function FilterTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
      <div className="inline-flex gap-1 rounded-lg border border-line bg-paper-2/60 p-1">
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cx(
                'inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors',
                active ? 'border border-line bg-surface text-ink' : 'border border-transparent text-ink-2 hover:text-ink',
              )}
            >
              {t.label}
              {t.count !== undefined && <span className={cx('tabular-nums text-xs', active ? 'text-ink-3' : 'text-ink-3/80')}>{t.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper text-ink-3">{icon}</div>
      <p className="font-display text-xl font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-paper-2 font-medium text-ink-2',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-14 w-14 text-base',
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/35" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[92dvh] w-full animate-fade-up flex-col overflow-hidden rounded-t-2xl border border-line bg-surface sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
          <button onClick={onClose} className="-mr-2 rounded-md p-2 text-ink-3 hover:bg-paper-2 hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
