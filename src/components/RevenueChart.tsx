import { useState } from 'react';
import { formatMoney } from '../lib/format';
import { cx } from './ui';

export type MonthPoint = { key: string; label: string; year: number; value: number };

function niceCeil(v: number) {
  if (v <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

export function RevenueChart({ months, currency }: { months: MonthPoint[]; currency: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.value), 0);
  const top = niceCeil(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const total = months.reduce((s, m) => s + m.value, 0);
  const shown = active != null ? months[active] : null;
  const last = months.length - 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-ink-3">{shown ? `${shown.label} ${shown.year}` : 'Last 12 months'}</p>
          <p className="mt-1 text-3xl font-medium tabular-nums tracking-tight">{formatMoney(shown ? shown.value : total, currency)}</p>
        </div>
        <p className="text-sm text-ink-3">
          Average {formatMoney(total / months.length, currency)} / month
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <div className="relative hidden h-56 w-12 shrink-0 sm:block" aria-hidden>
          {ticks.map((f) => (
            <span key={f} className="absolute right-0 translate-y-1/2 text-xs tabular-nums text-ink-3" style={{ bottom: `${f * 100}%` }}>
              {formatMoney(top * f, currency, true)}
            </span>
          ))}
        </div>
        <div className="relative h-56 flex-1">
          {ticks.map((f) => (
            <div key={f} className={cx('absolute inset-x-0 border-t', f === 0 ? 'border-line-strong' : 'border-dashed border-line')} style={{ bottom: `${f * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-3" onMouseLeave={() => setActive(null)}>
            {months.map((m, i) => {
              const isActive = active === i;
              const h = m.value > 0 ? Math.max((m.value / top) * 100, 1.5) : 0;
              const color = isActive ? (i === last ? 'bg-accent-900' : 'bg-accent-500') : i === last ? 'bg-accent-700' : 'bg-accent-200';
              return (
                <button
                  key={m.key}
                  type="button"
                  className="flex h-full flex-1 items-end focus-visible:outline-offset-4"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(isActive ? null : i)}
                  aria-label={`${m.label} ${m.year}: ${formatMoney(m.value, currency)}`}
                >
                  <span className={cx('block w-full rounded-t-sm transition-[background-color,height] duration-300', color)} style={{ height: `${h}%` }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <div className="hidden w-12 shrink-0 sm:block" />
        <div className="flex flex-1 gap-1.5 sm:gap-3">
          {months.map((m, i) => (
            <span key={m.key} className={cx('flex-1 text-center text-xs', i === last || active === i ? 'font-medium text-ink' : 'text-ink-3')}>
              <span className="sm:hidden">{m.label[0]}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
