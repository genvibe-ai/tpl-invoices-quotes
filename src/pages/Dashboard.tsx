import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleAlert, Clock, Inbox, Pencil, Plus } from 'lucide-react';
import { useMoney, useStore } from '../lib/store';
import { daysBetween, docTotal, formatDate, invoiceStatus, parseISO, plural, quoteStatus, toISO, todayISO } from '../lib/format';
import { Button, Card, CardHeader, EmptyState, cx } from '../components/ui';
import { RevenueChart, type MonthPoint } from '../components/RevenueChart';

type Attention = {
  id: string;
  href: string;
  number: string;
  client: string;
  note: string;
  amount: number;
  tone: 'danger' | 'warning' | 'neutral';
  rank: number;
};

const TONE = {
  danger: { icon: CircleAlert, cls: 'bg-danger-50 text-danger-600 border-danger-100', note: 'text-danger-700' },
  warning: { icon: Clock, cls: 'bg-warning-50 text-warning-600 border-warning-100', note: 'text-warning-700' },
  neutral: { icon: Pencil, cls: 'bg-paper-2 text-ink-2 border-line', note: 'text-ink-3' },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { data } = useStore();
  const fmt = useMoney();
  const today = todayISO();

  const s = useMemo(() => {
    const clientName = (id: string) => data.clients.find((c) => c.id === id)?.name ?? 'No client';
    const thisMonth = today.slice(0, 7);
    const lm = parseISO(today);
    lm.setDate(1);
    lm.setMonth(lm.getMonth() - 1);
    const lastMonth = toISO(lm).slice(0, 7);

    let received = 0;
    let receivedLast = 0;
    let receivedCount = 0;
    let overdueTotal = 0;
    let overdueCount = 0;
    let outstanding = 0;
    const attention: Attention[] = [];

    const base = parseISO(today);
    base.setDate(1);
    const months: MonthPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base);
      d.setMonth(base.getMonth() - i);
      months.push({ key: toISO(d).slice(0, 7), label: d.toLocaleString('en-AU', { month: 'short' }), year: d.getFullYear(), value: 0 });
    }

    for (const inv of data.invoices) {
      const t = docTotal(inv);
      const st = invoiceStatus(inv, today);
      if (st === 'paid' && inv.paidDate) {
        const k = inv.paidDate.slice(0, 7);
        if (k === thisMonth) {
          received += t;
          receivedCount++;
        }
        if (k === lastMonth) receivedLast += t;
        const m = months.find((x) => x.key === k);
        if (m) m.value += t;
      }
      if (st === 'sent' || st === 'overdue') outstanding += t;
      if (st === 'overdue') {
        overdueTotal += t;
        overdueCount++;
        const late = daysBetween(inv.dueDate, today);
        attention.push({ id: inv.id, href: `/invoices/${inv.id}`, number: inv.number, client: clientName(inv.clientId), note: `${plural(late, 'day')} overdue`, amount: t, tone: 'danger', rank: 1000 - late });
      }
      if (st === 'draft') {
        attention.push({ id: inv.id, href: `/invoices/${inv.id}`, number: inv.number, client: clientName(inv.clientId), note: 'Draft — not sent yet', amount: t, tone: 'neutral', rank: 3000 });
      }
    }

    let awaitingValue = 0;
    let awaitingCount = 0;
    for (const q of data.quotes) {
      if (quoteStatus(q, today) !== 'sent') continue;
      const t = docTotal(q);
      awaitingValue += t;
      awaitingCount++;
      const left = daysBetween(today, q.expiryDate);
      if (left <= 7) {
        attention.push({ id: q.id, href: `/quotes/${q.id}`, number: q.number, client: clientName(q.clientId), note: left === 0 ? 'Expires today' : `Expires in ${plural(left, 'day')}`, amount: t, tone: 'warning', rank: 2000 + left });
      }
    }

    attention.sort((a, b) => a.rank - b.rank);
    const change = receivedLast > 0 ? ((received - receivedLast) / receivedLast) * 100 : null;
    return { received, receivedCount, change, overdueTotal, overdueCount, outstanding, awaitingValue, awaitingCount, attention, months };
  }, [data, today]);

  const monthName = parseISO(today).toLocaleString('en-AU', { month: 'long' });
  const firstName = data.settings.ownerName.split(' ')[0];

  return (
    <div className="animate-fade-up">
      <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm text-ink-3">{formatDate(today)}</p>
          <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-2 text-ink-2">
            {s.overdueCount > 0
              ? <>You have <span className="font-medium text-ink">{fmt(s.outstanding)}</span> outstanding, {s.overdueCount} {s.overdueCount === 1 ? 'invoice is' : 'invoices are'} past due.</>
              : <>Nothing overdue — <span className="font-medium text-ink">{fmt(s.outstanding)}</span> outstanding and on time.</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/quotes/new" icon={<Plus size={16} />}>New quote</Button>
          <Button href="/invoices/new" variant="primary" icon={<Plus size={16} />}>New invoice</Button>
        </div>
      </header>

      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        <a href="#/invoices" className="group bg-surface p-5 transition-colors hover:bg-paper/60 sm:p-6">
          <p className="text-sm text-ink-2">Received in {monthName}</p>
          <p className="mt-3 text-3xl font-medium tabular-nums tracking-tight">{fmt(s.received)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-3">
            {s.change !== null && (
              <span className={cx('inline-flex items-center gap-0.5 font-medium', s.change >= 0 ? 'text-accent-600' : 'text-ink-2')}>
                {s.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(s.change).toFixed(0)}%
              </span>
            )}
            {s.change !== null ? 'vs last month · ' : ''}
            {plural(s.receivedCount, 'payment')}
          </p>
        </a>
        <a href="#/invoices?status=overdue" className="group bg-surface p-5 transition-colors hover:bg-paper/60 sm:p-6">
          <p className="flex items-center gap-2 text-sm text-ink-2">
            Overdue
            {s.overdueCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-danger-600" aria-hidden />}
          </p>
          <p className={cx('mt-3 text-3xl font-medium tabular-nums tracking-tight', s.overdueTotal > 0 && 'text-danger-700')}>{fmt(s.overdueTotal)}</p>
          <p className="mt-2 text-sm text-ink-3">{s.overdueCount > 0 ? `${plural(s.overdueCount, 'invoice')} past due date` : 'Everyone has paid on time'}</p>
        </a>
        <a href="#/quotes?status=sent" className="group bg-surface p-5 transition-colors hover:bg-paper/60 sm:p-6">
          <p className="text-sm text-ink-2">Quotes awaiting reply</p>
          <p className="mt-3 text-3xl font-medium tabular-nums tracking-tight">{s.awaitingCount}</p>
          <p className="mt-2 text-sm text-ink-3">Worth {fmt(s.awaitingValue)} if accepted</p>
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue" description="Payments received, by month" />
          <div className="px-5 pb-6 pt-6 sm:px-6">
            <RevenueChart months={s.months} currency={data.settings.currency} />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Needs attention"
            description={s.attention.length ? `${plural(s.attention.length, 'item')} to follow up` : undefined}
          />
          {s.attention.length === 0 ? (
            <EmptyState icon={<Inbox size={20} />} title="All caught up" body="Nothing overdue and no quotes about to expire." />
          ) : (
            <ul className="mt-4 flex-1 divide-y divide-line border-t border-line">
              {s.attention.slice(0, 7).map((a) => {
                const T = TONE[a.tone];
                return (
                  <li key={a.id}>
                    <a href={'#' + a.href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-paper/60 sm:px-6">
                      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', T.cls)}>
                        <T.icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.client}</span>
                        <span className="mt-0.5 block text-xs text-ink-3">
                          <span className="tabular-nums">{a.number}</span>
                        </span>
                        <span className={cx('block text-xs', T.note)}>{a.note}</span>
                      </span>
                      <span className="text-sm font-medium tabular-nums">{fmt(a.amount)}</span>
                      <ChevronRight size={16} className="-mr-1 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {s.attention.length > 7 && (
            <div className="border-t border-line px-5 py-3 text-sm sm:px-6">
              <a href="#/invoices?status=overdue" className="font-medium text-accent-700 hover:underline">View all overdue invoices</a>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
