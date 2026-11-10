import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { useMoney, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { clientStats } from '../lib/selectors';
import { formatDate, plural, todayISO } from '../lib/format';
import { Avatar, Button, Card, EmptyState, SearchInput, Select, cx } from '../components/ui';
import { ClientModal } from '../components/ClientModal';

export default function ClientsPage() {
  const { data, saveClient, notify } = useStore();
  const fmt = useMoney();
  const today = todayISO();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => data.clients.map((c) => ({ client: c, ...clientStats(data, c.id, today) })), [data, today]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = rows.filter(
      (r) => !term || [r.client.name, r.client.contactName, r.client.email, r.client.phone, r.client.address].some((v) => v.toLowerCase().includes(term)),
    );
    out.sort((a, b) => {
      if (sort === 'spent') return b.spent - a.spent;
      if (sort === 'owing') return b.outstanding - a.outstanding;
      if (sort === 'recent') return b.lastDate.localeCompare(a.lastDate);
      return a.client.name.localeCompare(b.client.name);
    });
    return out;
  }, [rows, q, sort]);

  const totalOwing = rows.reduce((s, r) => s + r.outstanding, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const owingCount = rows.filter((r) => r.outstanding > 0).length;

  return (
    <div className="animate-fade-up">
      <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Clients</h1>
          <p className="mt-2 text-ink-2">The people and businesses you work for.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>New client</Button>
      </header>

      <div className="mb-8 grid divide-y divide-line rounded-xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: 'Clients', value: String(rows.length), sub: 'On your books' },
          { label: 'Owed to you', value: fmt(totalOwing), sub: `${plural(owingCount, 'client')} with unpaid invoices` },
          { label: 'Lifetime revenue', value: fmt(totalSpent), sub: 'All paid invoices' },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-4 px-5 py-4 sm:block sm:px-6 sm:py-5">
            <p className="text-sm text-ink-2">{s.label}</p>
            <div className="text-right sm:text-left">
              <p className="text-xl font-medium tabular-nums tracking-tight sm:mt-2 sm:text-2xl">{s.value}</p>
              <p className="text-xs text-ink-3 sm:mt-1">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, suburb" />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort clients" className="sm:w-44">
          <option value="name">Name A–Z</option>
          <option value="spent">Most spent</option>
          <option value="owing">Most owing</option>
          <option value="recent">Recent activity</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title={rows.length ? 'No clients match' : 'No clients yet'}
            body={rows.length ? 'Try a different search.' : 'Add the people you work for, then quote and invoice them.'}
            action={!rows.length && <Button variant="primary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>New client</Button>}
          />
        ) : (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-line bg-paper/50 text-left text-xs text-ink-3">
                  <th className="py-3 pl-6 pr-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 text-right font-medium">Invoices</th>
                  <th className="px-3 py-3 text-right font-medium">Owing</th>
                  <th className="py-3 pl-3 pr-6 text-right font-medium">Total spent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.client.id} onClick={() => navigate(`/clients/${r.client.id}`)} className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-paper/60">
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.client.name} />
                        <div className="min-w-0">
                          <a href={`#/clients/${r.client.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium hover:text-accent-700">{r.client.name}</a>
                          <p className="truncate text-xs text-ink-3">{r.lastDate ? `Last job ${formatDate(r.lastDate)}` : 'No jobs yet'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-56 px-3 py-4">
                      <p className="truncate text-ink-2">{r.client.email}</p>
                      <p className="truncate text-xs text-ink-3">{r.client.phone}</p>
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink-2">{r.invoices.length}</td>
                    <td className={cx('px-3 py-4 text-right tabular-nums', r.overdue > 0 ? 'font-medium text-danger-700' : r.outstanding > 0 ? 'text-ink' : 'text-ink-3')}>
                      {r.outstanding > 0 ? fmt(r.outstanding) : '—'}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right font-medium tabular-nums">{fmt(r.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {filtered.map((r) => (
                <li key={r.client.id}>
                  <a href={`#/clients/${r.client.id}`} className="flex items-center gap-3 px-4 py-4 active:bg-paper/60">
                    <Avatar name={r.client.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.client.name}</p>
                      <p className="truncate text-sm text-ink-3">
                        {plural(r.invoices.length, 'invoice')} · spent <span className="tabular-nums">{fmt(r.spent)}</span>
                      </p>
                      {r.outstanding > 0 && (
                        <p className={cx('mt-0.5 text-xs tabular-nums', r.overdue > 0 ? 'text-danger-700' : 'text-ink-2')}>
                          {fmt(r.outstanding)} owing{r.overdue > 0 ? ' · overdue' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-ink-3" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ClientModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={(c) => {
          saveClient(c);
          notify(`${c.name} added`);
        }}
      />
    </div>
  );
}
