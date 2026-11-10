import { useMemo, useState } from 'react';
import { ChevronRight, FileText, Plus, ScrollText } from 'lucide-react';
import { useMoney, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import type { Client, DisplayStatus, Doc, DocKind } from '../lib/types';
import { daysBetween, docTotal, formatDate, invoiceStatus, plural, quoteStatus, todayISO } from '../lib/format';
import { Button, Card, EmptyState, FilterTabs, SearchInput, Select, StatusPill, cx } from '../components/ui';

type Row = { doc: Doc; status: DisplayStatus; total: number; client?: Client; date2: string };

const INVOICE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];
const QUOTE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Awaiting reply' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'converted', label: 'Invoiced' },
  { value: 'expired', label: 'Expired' },
  { value: 'declined', label: 'Declined' },
];

function hint(r: Row, today: string): { text: string; tone: string } | null {
  const d = r.doc;
  if (r.status === 'overdue') return { text: `${plural(daysBetween(r.date2, today), 'day')} overdue`, tone: 'text-danger-700' };
  if (r.status === 'paid' && d.kind === 'invoice') return { text: `Paid ${formatDate(d.paidDate)}`, tone: 'text-ink-3' };
  if (r.status === 'sent') {
    const n = daysBetween(today, r.date2);
    const verb = d.kind === 'invoice' ? 'Due' : 'Expires';
    return { text: n === 0 ? `${verb} today` : `${verb} in ${plural(n, 'day')}`, tone: n <= 3 && d.kind === 'quote' ? 'text-warning-700' : 'text-ink-3' };
  }
  return null;
}

export default function DocList({ kind }: { kind: DocKind }) {
  const { data } = useStore();
  const fmt = useMoney();
  const today = todayISO();
  const isInvoice = kind === 'invoice';
  const initialTab = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('status') ?? 'all';

  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState('');
  const [range, setRange] = useState('all');
  const [sort, setSort] = useState('newest');

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(data.clients.map((c) => [c.id, c]));
    const docs: Doc[] = isInvoice ? data.invoices : data.quotes;
    return docs.map((d) => ({
      doc: d,
      status: d.kind === 'invoice' ? invoiceStatus(d, today) : quoteStatus(d, today),
      total: docTotal(d),
      client: byId.get(d.clientId),
      date2: d.kind === 'invoice' ? d.dueDate : d.expiryDate,
    }));
  }, [data, isInvoice, today]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let from = '';
    if (range === 'month') from = today.slice(0, 8) + '01';
    if (range === '90') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      from = d.toISOString().slice(0, 10);
    }
    if (range === 'year') from = today.slice(0, 4) + '-01-01';
    const out = rows.filter(
      (r) =>
        (tab === 'all' || r.status === tab) &&
        (!from || r.doc.issueDate >= from) &&
        (!term ||
          r.doc.number.toLowerCase().includes(term) ||
          r.client?.name.toLowerCase().includes(term) ||
          r.client?.contactName.toLowerCase().includes(term) ||
          r.doc.items.some((i) => i.description.toLowerCase().includes(term))),
    );
    out.sort((a, b) => {
      if (sort === 'oldest') return a.doc.issueDate.localeCompare(b.doc.issueDate) || a.doc.number.localeCompare(b.doc.number);
      if (sort === 'high') return b.total - a.total;
      if (sort === 'low') return a.total - b.total;
      return b.doc.issueDate.localeCompare(a.doc.issueDate) || b.doc.number.localeCompare(a.doc.number);
    });
    return out;
  }, [rows, tab, q, range, sort, today]);

  const summary = useMemo(() => {
    const sum = (pred: (r: Row) => boolean) => rows.filter(pred).reduce((s, r) => s + r.total, 0);
    if (isInvoice) {
      const year = today.slice(0, 4);
      return [
        { label: 'Outstanding', value: fmt(sum((r) => r.status === 'sent' || r.status === 'overdue')), sub: `${plural((counts.sent ?? 0) + (counts.overdue ?? 0), 'invoice')} unpaid` },
        { label: 'Overdue', value: fmt(sum((r) => r.status === 'overdue')), sub: `${plural(counts.overdue ?? 0, 'invoice')}`, danger: (counts.overdue ?? 0) > 0 },
        { label: `Paid in ${year}`, value: fmt(sum((r) => r.status === 'paid' && r.doc.kind === 'invoice' && (r.doc.paidDate ?? '').startsWith(year))), sub: 'Calendar year to date' },
      ];
    }
    const won = (counts.accepted ?? 0) + (counts.converted ?? 0);
    const decided = won + (counts.declined ?? 0);
    return [
      { label: 'Awaiting reply', value: fmt(sum((r) => r.status === 'sent')), sub: plural(counts.sent ?? 0, 'quote') },
      { label: 'Won', value: fmt(sum((r) => r.status === 'accepted' || r.status === 'converted')), sub: plural(won, 'quote') + ' accepted' },
      { label: 'Win rate', value: decided ? `${Math.round((won / decided) * 100)}%` : '—', sub: `${decided} decided` },
    ];
  }, [rows, counts, isInvoice, fmt, today]);

  const tabs = (isInvoice ? INVOICE_TABS : QUOTE_TABS).map((t) => ({ ...t, count: counts[t.value] ?? 0 }));
  const base = isInvoice ? '/invoices' : '/quotes';
  const Noun = isInvoice ? 'Invoice' : 'Quote';
  const Icon = isInvoice ? FileText : ScrollText;
  const filteredTotal = filtered.reduce((s, r) => s + r.total, 0);

  return (
    <div className="animate-fade-up">
      <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{Noun}s</h1>
          <p className="mt-2 text-ink-2">{isInvoice ? 'Every bill you’ve sent, and who still owes you.' : 'Prices you’ve put forward, and which ones came through.'}</p>
        </div>
        <Button href={`${base}/new`} variant="primary" icon={<Plus size={16} />}>New {Noun.toLowerCase()}</Button>
      </header>

      <div className="mb-8 grid divide-y divide-line rounded-xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {summary.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-4 px-5 py-4 sm:block sm:px-6 sm:py-5">
            <p className="text-sm text-ink-2">{s.label}</p>
            <div className="text-right sm:text-left">
              <p className={cx('text-xl font-medium tabular-nums tracking-tight sm:mt-2 sm:text-2xl', 'danger' in s && s.danger && 'text-danger-700')}>{s.value}</p>
              <p className="text-xs text-ink-3 sm:mt-1">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder={`Search ${Noun.toLowerCase()}s, clients, items`} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range" className="sm:w-36">
              <option value="all">All time</option>
              <option value="month">This month</option>
              <option value="90">Last 90 days</option>
              <option value="year">This year</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="sm:w-36">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="high">Highest amount</option>
              <option value="low">Lowest amount</option>
            </Select>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState icon={<Icon size={20} />} title={`No ${Noun.toLowerCase()}s yet`} body={`Create your first ${Noun.toLowerCase()} — it takes about a minute.`} action={<Button href={`${base}/new`} variant="primary" icon={<Plus size={16} />}>New {Noun.toLowerCase()}</Button>} />
          ) : (
            <EmptyState icon={<Icon size={20} />} title="Nothing matches" body="Try a different search or filter." action={<Button onClick={() => { setQ(''); setTab('all'); setRange('all'); }}>Clear filters</Button>} />
          )
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-line bg-paper/50 text-left text-xs text-ink-3">
                  <th className="py-3 pl-6 pr-3 font-medium">Number</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Issued</th>
                  <th className="px-3 py-3 font-medium">{isInvoice ? 'Due' : 'Expires'}</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="py-3 pl-3 pr-6 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const h = hint(r, today);
                  const href = `${base}/${r.doc.id}`;
                  return (
                    <tr key={r.doc.id} onClick={() => navigate(href)} className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-paper/60">
                      <td className="py-4 pl-6 pr-3">
                        <a href={'#' + href} onClick={(e) => e.stopPropagation()} className="font-medium tabular-nums hover:text-accent-700">{r.doc.number}</a>
                      </td>
                      <td className="max-w-64 px-3 py-4">
                        <p className="truncate font-medium">{r.client?.name ?? <span className="text-ink-3">No client</span>}</p>
                        <p className="truncate text-xs text-ink-3">{r.doc.items[0]?.description || '—'}</p>
                      </td>
                      <td className="px-3 py-4 tabular-nums text-ink-2">{formatDate(r.doc.issueDate)}</td>
                      <td className="px-3 py-4">
                        <p className="tabular-nums text-ink-2">{formatDate(r.date2)}</p>
                        {h && <p className={cx('text-xs', h.tone)}>{h.text}</p>}
                      </td>
                      <td className="px-3 py-4"><StatusPill status={r.status} /></td>
                      <td className="py-4 pl-3 pr-6 text-right font-medium tabular-nums">{fmt(r.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {filtered.map((r) => {
                const h = hint(r, today);
                return (
                  <li key={r.doc.id}>
                    <a href={`#${base}/${r.doc.id}`} className="flex items-start gap-3 px-4 py-4 active:bg-paper/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.client?.name ?? 'No client'}</p>
                        <p className="mt-0.5 truncate text-sm text-ink-3">
                          <span className="tabular-nums">{r.doc.number}</span> · {formatDate(r.doc.issueDate)}
                        </p>
                        {h && <p className={cx('mt-1 text-xs', h.tone)}>{h.text}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-medium tabular-nums">{fmt(r.total)}</p>
                        <StatusPill status={r.status} />
                      </div>
                      <ChevronRight size={16} className="mt-1 shrink-0 text-ink-3" />
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-line bg-paper/50 px-4 py-3 text-sm text-ink-3 sm:px-6">
              <span>
                Showing {filtered.length} of {rows.length}
              </span>
              <span className="tabular-nums">
                Total <span className="font-medium text-ink">{fmt(filteredTotal)}</span>
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
