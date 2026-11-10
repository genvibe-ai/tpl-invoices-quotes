import type { ReactNode } from 'react';
import { CircleCheck, FileText, LayoutGrid, Plus, ScrollText, Settings as SettingsIcon, Sigma, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { invoiceStatus, todayISO } from '../lib/format';
import { Avatar, cx } from './ui';

const NAV = [
  { key: '', label: 'Dashboard', href: '/', Icon: LayoutGrid },
  { key: 'invoices', label: 'Invoices', href: '/invoices', Icon: FileText },
  { key: 'quotes', label: 'Quotes', href: '/quotes', Icon: ScrollText },
  { key: 'clients', label: 'Clients', href: '/clients', Icon: Users },
  { key: 'settings', label: 'Settings', href: '/settings', Icon: SettingsIcon },
];

function Brand() {
  return (
    <a href="#/" className="flex items-center gap-2.5" aria-label="Sumwell home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-700 text-accent-50">
        <Sigma size={18} strokeWidth={2.25} />
      </span>
      <span className="font-display text-2xl font-medium tracking-tight">Sumwell</span>
    </a>
  );
}

export function Shell({ active, children }: { active: string; children: ReactNode }) {
  const { data, toast } = useStore();
  const today = todayISO();
  const overdueCount = data.invoices.filter((i) => invoiceStatus(i, today) === 'overdue').length;

  return (
    <div className="min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper px-4 py-6 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ key, label, href, Icon }) => {
            const isActive = active === key;
            return (
              <a
                key={key}
                href={'#' + href}
                aria-current={isActive ? 'page' : undefined}
                className={cx(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2.1 : 1.8} className={isActive ? 'text-accent-700' : ''} />
                {label}
                {key === 'invoices' && overdueCount > 0 && (
                  <span className="ml-auto rounded-full bg-danger-50 px-2 py-0.5 text-xs tabular-nums text-danger-700" title={`${overdueCount} overdue`}>
                    {overdueCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        <div className="mt-8 px-1">
          <a href="#/invoices/new" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-700 text-sm font-medium text-accent-50 transition-colors hover:bg-accent-800">
            <Plus size={16} /> New invoice
          </a>
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-line px-2 pt-5">
          {data.settings.logo ? (
            <img src={data.settings.logo} alt="" className="h-9 w-9 rounded-full border border-line object-contain bg-surface" />
          ) : (
            <Avatar name={data.settings.businessName || 'My business'} />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{data.settings.businessName || 'Your business'}</p>
            <p className="truncate text-xs text-ink-3">{data.settings.ownerName}</p>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 md:hidden">
        <Brand />
        <a href="#/invoices/new" className="flex h-9 items-center gap-1.5 rounded-lg bg-accent-700 px-3 text-sm font-medium text-accent-50">
          <Plus size={16} /> Invoice
        </a>
      </header>

      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 md:pb-16 lg:px-10">{children}</div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {NAV.map(({ key, label, href, Icon }) => {
          const isActive = active === key;
          return (
            <a
              key={key}
              href={'#' + href}
              aria-current={isActive ? 'page' : undefined}
              className={cx('relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium', isActive ? 'text-accent-700' : 'text-ink-3')}
            >
              {isActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent-700" />}
              <span className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.1 : 1.8} />
                {key === 'invoices' && overdueCount > 0 && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-danger-600 ring-2 ring-surface" />}
              </span>
              {label}
            </a>
          );
        })}
      </nav>

      {toast && (
        <div key={toast.id} role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 animate-fade-up items-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm text-paper md:bottom-8 md:left-auto md:right-8 md:translate-x-0">
          <CircleCheck size={16} className="text-accent-200" />
          {toast.message}
        </div>
      )}
    </div>
  );
}
