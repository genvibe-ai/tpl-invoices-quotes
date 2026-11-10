import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Mail, MapPin, Pencil, Phone, Plus, ScrollText, StickyNote, Trash2, Users } from 'lucide-react';
import { useMoney, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { clientStats } from '../lib/selectors';
import type { Doc } from '../lib/types';
import { docTotal, formatDate, invoiceStatus, quoteStatus, todayISO } from '../lib/format';
import { Avatar, Button, Card, CardHeader, EmptyState, Modal, StatusPill, cx } from '../components/ui';
import { ClientModal } from '../components/ClientModal';

function DocRows({ docs, today }: { docs: Doc[]; today: string }) {
  const fmt = useMoney();
  return (
    <ul className="divide-y divide-line">
      {docs.map((d) => {
        const status = d.kind === 'invoice' ? invoiceStatus(d, today) : quoteStatus(d, today);
        return (
          <li key={d.id}>
            <a href={`#/${d.kind === 'invoice' ? 'invoices' : 'quotes'}/${d.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-paper/60 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums">{d.number}</p>
                <p className="truncate text-xs text-ink-3">
                  {formatDate(d.issueDate)} · {d.items[0]?.description || 'No items'}
                </p>
              </div>
              <StatusPill status={status} className="hidden sm:inline-flex" />
              <div className="text-right">
                <p className="text-sm font-medium tabular-nums">{fmt(docTotal(d))}</p>
                <StatusPill status={status} className="mt-1 sm:hidden" />
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function ClientDetail({ id }: { id: string }) {
  const { data, saveClient, deleteClient, notify } = useStore();
  const fmt = useMoney();
  const today = todayISO();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const client = data.clients.find((c) => c.id === id);
  const stats = useMemo(() => clientStats(data, id, today), [data, id, today]);

  if (!client) {
    return <EmptyState icon={<Users size={20} />} title="Client not found" body="They may have been removed." action={<Button href="/clients" variant="primary">All clients</Button>} />;
  }

  const invoices = [...stats.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const quotes = [...stats.quotes].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const hasDocs = invoices.length + quotes.length > 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <a href="#/clients" className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft size={16} /> Clients
        </a>
      </div>

      <header className="mb-8 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-balance sm:text-5xl">{client.name}</h1>
            <p className="mt-1 text-ink-2">
              {client.contactName !== client.name ? `${client.contactName} · ` : ''}Client since {formatDate(client.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Pencil size={16} />} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button href={`/quotes/new?client=${client.id}`} icon={<Plus size={16} />}>New quote</Button>
          <Button href={`/invoices/new?client=${client.id}`} variant="primary" icon={<Plus size={16} />}>New invoice</Button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {[
          { label: 'Total spent', value: fmt(stats.spent), tone: '' },
          { label: 'Owing', value: fmt(stats.outstanding), tone: '' },
          { label: 'Overdue', value: fmt(stats.overdue), tone: stats.overdue > 0 ? 'text-danger-700' : '' },
          { label: 'Open quotes', value: fmt(stats.openQuotesValue), tone: '', sub: `${stats.openQuotes} awaiting reply` },
        ].map((s) => (
          <div key={s.label} className="bg-surface p-4 sm:p-6">
            <p className="text-sm text-ink-2">{s.label}</p>
            <p className={cx('mt-2 text-xl font-medium tabular-nums tracking-tight sm:text-2xl', s.tone)}>{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-ink-3">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 font-display text-xl font-medium tracking-tight">Contact</h2>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <Mail size={16} className="mt-0.5 shrink-0 text-ink-3" />
                {client.email ? <a href={`mailto:${client.email}`} className="break-all text-accent-700 hover:underline">{client.email}</a> : <span className="text-ink-3">No email</span>}
              </li>
              <li className="flex gap-3">
                <Phone size={16} className="mt-0.5 shrink-0 text-ink-3" />
                {client.phone ? <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="tabular-nums hover:text-accent-700">{client.phone}</a> : <span className="text-ink-3">No phone</span>}
              </li>
              <li className="flex gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-ink-3" />
                <span className="whitespace-pre-line text-ink-2">{client.address || 'No address'}</span>
              </li>
              {client.notes && (
                <li className="flex gap-3 border-t border-line pt-4">
                  <StickyNote size={16} className="mt-0.5 shrink-0 text-ink-3" />
                  <span className="text-ink-2">{client.notes}</span>
                </li>
              )}
            </ul>
          </Card>
          <div className="px-1">
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              disabled={hasDocs}
              onClick={() => setDeleteOpen(true)}
              title={hasDocs ? 'Delete their invoices and quotes first' : undefined}
            >
              Delete client
            </Button>
            {hasDocs && <p className="mt-1 px-3 text-xs text-ink-3">Clients with invoices or quotes can’t be deleted.</p>}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader title="Invoices" description={`${invoices.length} total`} action={<Button size="sm" variant="ghost" href={`/invoices/new?client=${client.id}`} icon={<Plus size={14} />}>Add</Button>} />
            <div className="mt-4 border-t border-line">
              {invoices.length ? <DocRows docs={invoices} today={today} /> : <EmptyState icon={<FileText size={20} />} title="No invoices yet" />}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Quotes" description={`${quotes.length} total`} action={<Button size="sm" variant="ghost" href={`/quotes/new?client=${client.id}`} icon={<Plus size={14} />}>Add</Button>} />
            <div className="mt-4 border-t border-line">
              {quotes.length ? <DocRows docs={quotes} today={today} /> : <EmptyState icon={<ScrollText size={20} />} title="No quotes yet" />}
            </div>
          </Card>
        </div>
      </div>

      <ClientModal
        open={editOpen}
        client={client}
        onClose={() => setEditOpen(false)}
        onSave={(c) => {
          saveClient(c);
          notify('Client updated');
        }}
      />
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${client.name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="dangerSolid"
              onClick={() => {
                deleteClient(client.id);
                notify(`${client.name} deleted`);
                navigate('/clients');
              }}
            >
              Delete client
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Their contact details will be removed. This can’t be undone.</p>
      </Modal>
    </div>
  );
}
