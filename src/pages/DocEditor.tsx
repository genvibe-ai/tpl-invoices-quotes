import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRightLeft, Check, CircleAlert, Download, ExternalLink, FileText, Plus, RotateCcw, Send, ThumbsDown, ThumbsUp, Trash2, UserPlus, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import type { Doc, DocKind, Invoice, LineItem, Quote } from '../lib/types';
import { addDays, daysBetween, formatDate, formatMoney, invoiceStatus, lineTotal, plural, quoteStatus, todayISO, totals, uid } from '../lib/format';
import { Button, Card, EmptyState, Field, Input, Modal, NumInput, Select, StatusPill, Textarea, cx } from '../components/ui';
import { DocPreview, ScaledPreview } from '../components/DocPreview';
import { ClientModal } from '../components/ClientModal';

type Props = { kind: DocKind; id: string; query: URLSearchParams };
type Patch = Partial<Omit<Invoice, 'kind' | 'status'>> & Partial<Omit<Quote, 'kind' | 'status'>>;

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

export default function DocEditor({ kind, id, query }: Props) {
  const { data, saveDoc, deleteDoc, nextNumber, convertQuote, notify, saveClient } = useStore();
  const { settings } = data;
  const isNew = id === 'new';
  const isInvoice = kind === 'invoice';
  const listPath = isInvoice ? '/invoices' : '/quotes';
  const Noun = isInvoice ? 'Invoice' : 'Quote';
  const today = todayISO();

  const [draft, setDraft] = useState<Doc | null>(() => {
    if (!isNew) {
      const found = (isInvoice ? (data.invoices as Doc[]) : data.quotes).find((d) => d.id === id);
      return found ? structuredClone(found) : null;
    }
    const clientId = query.get('client') ?? '';
    const items: LineItem[] = [{ id: uid('li'), description: '', quantity: 1, unitPrice: 0, taxRate: settings.taxRate }];
    if (isInvoice) {
      return { id: uid('inv'), kind: 'invoice', number: nextNumber('invoice'), clientId, issueDate: today, dueDate: addDays(today, settings.paymentTermsDays), status: 'draft', items, notes: '' };
    }
    return { id: uid('q'), kind: 'quote', number: nextNumber('quote'), clientId, issueDate: today, expiryDate: addDays(today, settings.quoteValidityDays), status: 'draft', items, notes: '' };
  });
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [sendOpen, setSendOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  // Autosave existing documents shortly after each change.
  const draftRef = useRef(draft);
  const dirtyRef = useRef(dirty);
  draftRef.current = draft;
  dirtyRef.current = dirty;

  useEffect(() => {
    if (isNew || !dirty || !draft) return;
    const t = window.setTimeout(() => {
      saveDoc(draft);
      setDirty(false);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, dirty, isNew, saveDoc]);

  useEffect(
    () => () => {
      if (!isNew && dirtyRef.current && draftRef.current) saveDoc(draftRef.current);
    },
    [isNew, saveDoc],
  );

  const persist = useCallback(
    (next: Doc, message?: string) => {
      saveDoc(next);
      setDraft(next);
      setDirty(false);
      setError('');
      if (message) notify(message);
      if (isNew) window.setTimeout(() => navigate(`${listPath}/${next.id}`, { replace: true }), 0);
    },
    [saveDoc, notify, isNew, listPath],
  );

  if (!draft) {
    return (
      <EmptyState
        icon={<FileText size={20} />}
        title={`${Noun} not found`}
        body="It may have been deleted."
        action={<Button href={listPath} variant="primary">Back to {Noun.toLowerCase()}s</Button>}
      />
    );
  }

  const doc = draft;
  const client = data.clients.find((c) => c.id === doc.clientId);
  const t = totals(doc.items);
  const fmt = (n: number) => formatMoney(n, settings.currency);
  const status = doc.kind === 'invoice' ? invoiceStatus(doc, today) : quoteStatus(doc, today);
  const sortedClients = [...data.clients].sort((a, b) => a.name.localeCompare(b.name));

  const patch = (p: Patch) => {
    setDraft((d) => (d ? ({ ...d, ...p } as Doc) : d));
    setDirty(true);
    setError('');
  };
  const updateItem = (itemId: string, p: Partial<LineItem>) => patch({ items: doc.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) });
  const addItem = () => patch({ items: [...doc.items, { id: uid('li'), description: '', quantity: 1, unitPrice: 0, taxRate: settings.taxRate }] });
  const removeItem = (itemId: string) => patch({ items: doc.items.filter((i) => i.id !== itemId) });

  function validate() {
    if (!doc.clientId || !client) return 'Choose a client first.';
    if (!doc.items.some((i) => i.description.trim())) return 'Add at least one line item with a description.';
    return '';
  }

  function guarded(fn: () => void) {
    const e = validate();
    if (e) {
      setError(e);
      setView('edit');
      return;
    }
    fn();
  }

  const save = () => persist(doc, isNew ? `${Noun} saved as draft` : 'Saved');

  const confirmSend = (via: 'email' | 'mark') => {
    const next = { ...doc, sentDate: today, status: doc.status === 'draft' ? 'sent' : doc.status } as Doc;
    persist(next, via === 'email' ? `${Noun} ready in your email app` : `${Noun} marked as sent`);
    setSendOpen(false);
  };

  const markPaid = () => doc.kind === 'invoice' && persist({ ...doc, status: 'paid', paidDate: today, sentDate: doc.sentDate ?? today }, 'Marked as paid');
  const markUnpaid = () => doc.kind === 'invoice' && persist({ ...doc, status: 'sent', paidDate: undefined }, 'Marked as unpaid');
  const setQuoteStatus = (s: 'accepted' | 'declined' | 'sent') => doc.kind === 'quote' && persist({ ...doc, status: s }, s === 'accepted' ? 'Quote accepted' : s === 'declined' ? 'Quote marked as declined' : 'Quote reopened');

  const convert = () => {
    if (doc.kind !== 'quote') return;
    const invId = convertQuote(doc);
    notify('Converted to a draft invoice');
    window.setTimeout(() => navigate(`/invoices/${invId}`), 0);
  };

  const downloadPdf = () => {
    const prev = document.title;
    document.title = `${doc.number} — ${settings.businessName}`;
    window.print();
    window.setTimeout(() => (document.title = prev), 800);
  };

  const remove = () => {
    deleteDoc(kind, doc.id);
    notify(`${Noun} ${doc.number} deleted`);
    navigate(listPath);
  };

  const back = (e: React.MouseEvent) => {
    if (isNew && dirty && !window.confirm('Discard this unsaved draft?')) e.preventDefault();
  };

  const setTerms = (days: number) => patch(doc.kind === 'invoice' ? { dueDate: addDays(doc.issueDate, days) } : { expiryDate: addDays(doc.issueDate, days) });
  const secondDate = doc.kind === 'invoice' ? doc.dueDate : doc.expiryDate;
  const termDays = daysBetween(doc.issueDate, secondDate);

  /* ---------- Action buttons ---------- */
  const actions: React.ReactNode[] = [];
  actions.push(<Button key="pdf" icon={<Download size={16} />} onClick={downloadPdf}>Download PDF</Button>);
  if (doc.kind === 'invoice') {
    const isDraft = doc.status === 'draft';
    actions.push(
      <Button key="send" variant={isDraft ? 'primary' : 'secondary'} icon={<Send size={16} />} onClick={() => guarded(() => setSendOpen(true))}>
        {isDraft ? 'Send' : 'Resend'}
      </Button>,
    );
    if (doc.status === 'paid') actions.push(<Button key="unpaid" variant="ghost" icon={<RotateCcw size={16} />} onClick={markUnpaid}>Mark unpaid</Button>);
    else actions.push(<Button key="paid" variant={isDraft ? 'secondary' : 'primary'} icon={<Check size={16} />} onClick={() => guarded(markPaid)}>Mark as paid</Button>);
  } else {
    if (doc.status === 'converted' && doc.convertedInvoiceId) {
      actions.push(<Button key="view" variant="primary" icon={<ExternalLink size={16} />} href={`/invoices/${doc.convertedInvoiceId}`}>View invoice</Button>);
    } else {
      const isDraft = doc.status === 'draft';
      actions.push(
        <Button key="send" variant={isDraft ? 'primary' : 'secondary'} icon={<Send size={16} />} onClick={() => guarded(() => setSendOpen(true))}>
          {isDraft ? 'Send' : 'Resend'}
        </Button>,
      );
      actions.push(
        <Button key="convert" variant={isDraft ? 'secondary' : 'primary'} icon={<ArrowRightLeft size={16} />} onClick={() => guarded(() => { if (dirty) saveDoc(doc); convert(); })}>
          Convert to invoice
        </Button>,
      );
    }
  }

  const statusLine = (() => {
    if (doc.kind === 'invoice') {
      if (status === 'overdue') return { tone: 'danger', text: `${plural(daysBetween(doc.dueDate, today), 'day')} overdue — was due ${formatDate(doc.dueDate)}.` };
      if (status === 'paid') return { tone: 'accent', text: `Paid in full on ${formatDate(doc.paidDate)}.` };
      if (status === 'sent') return { tone: 'info', text: `Sent ${formatDate(doc.sentDate)} · due ${formatDate(doc.dueDate)}.` };
    } else {
      if (status === 'expired') return { tone: 'warning', text: `Expired on ${formatDate(doc.expiryDate)}. Extend the date and resend, or mark the outcome.` };
      if (status === 'converted') return { tone: 'accent', text: 'Accepted and converted to an invoice.' };
      if (status === 'accepted') return { tone: 'accent', text: 'Accepted — convert it to an invoice when the job’s done.' };
      if (status === 'declined') return { tone: 'neutral', text: 'The client declined this quote.' };
      if (status === 'sent') return { tone: 'info', text: `Sent ${formatDate(doc.sentDate)} · awaiting reply until ${formatDate(doc.expiryDate)}.` };
    }
    return null;
  })();
  const toneCls: Record<string, string> = {
    danger: 'border-danger-100 bg-danger-50 text-danger-700',
    warning: 'border-warning-100 bg-warning-50 text-warning-700',
    accent: 'border-accent-100 bg-accent-50 text-accent-700',
    info: 'border-info-100 bg-info-50 text-info-700',
    neutral: 'border-line bg-paper-2 text-ink-2',
  };

  const fromQuote = doc.kind === 'invoice' && doc.fromQuoteId ? data.quotes.find((q) => q.id === doc.fromQuoteId) : undefined;
  const quoteSent = doc.kind === 'quote' && (doc.status === 'sent' || status === 'expired');

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <a href={'#' + listPath} onClick={back} className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft size={16} /> {Noun}s
        </a>
      </div>
      <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-medium leading-tight tracking-tight tabular-nums sm:text-5xl">{isNew ? `New ${Noun.toLowerCase()}` : doc.number}</h1>
            <StatusPill status={status} />
          </div>
          <p className="mt-2 text-ink-2">
            {client ? client.name : 'No client yet'} · <span className="tabular-nums font-medium text-ink">{fmt(t.total)}</span>
            <span className="ml-3 text-sm text-ink-3">{isNew ? (dirty ? 'Not saved yet' : 'New draft') : dirty ? 'Saving…' : 'All changes saved'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isNew && <Button variant="secondary" onClick={() => guarded(save)}>Save draft</Button>}
          {actions}
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          <CircleAlert size={16} /> {error}
          <button className="ml-auto rounded p-1 hover:bg-danger-100" onClick={() => setError('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Mobile edit/preview toggle */}
      <div className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-paper-2/60 p-1 lg:hidden">
        {(['edit', 'preview'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cx('h-9 rounded-md text-sm font-medium transition-colors', view === v ? 'border border-line bg-surface text-ink' : 'text-ink-2')}>
            {v === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Form */}
        <div className={cx('space-y-6 lg:col-span-7', view === 'preview' && 'hidden lg:block')}>
          {statusLine && <div className={cx('rounded-lg border px-4 py-3 text-sm', toneCls[statusLine.tone])}>{statusLine.text}</div>}
          {fromQuote && (
            <p className="text-sm text-ink-3">
              Created from quote{' '}
              <a href={`#/quotes/${fromQuote.id}`} className="font-medium text-accent-700 hover:underline">{fromQuote.number}</a>
            </p>
          )}
          {doc.kind === 'quote' && (quoteSent || doc.status === 'accepted' || doc.status === 'declined') && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
              <span className="mr-auto text-sm text-ink-2">Heard back from the client?</span>
              {doc.status !== 'accepted' && <Button size="sm" icon={<ThumbsUp size={14} />} onClick={() => setQuoteStatus('accepted')}>Accepted</Button>}
              {doc.status !== 'declined' && <Button size="sm" icon={<ThumbsDown size={14} />} onClick={() => setQuoteStatus('declined')}>Declined</Button>}
              {(doc.status === 'accepted' || doc.status === 'declined') && <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setQuoteStatus('sent')}>Reopen</Button>}
            </div>
          )}

          <Section title="Client">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                className="flex-1"
                aria-label="Client"
                value={doc.clientId}
                onChange={(e) => (e.target.value === '__new' ? setClientOpen(true) : patch({ clientId: e.target.value }))}
              >
                <option value="">Choose a client…</option>
                {sortedClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__new">+ Add a new client</option>
              </Select>
              <Button icon={<UserPlus size={16} />} onClick={() => setClientOpen(true)}>New client</Button>
            </div>
            {client && (
              <div className="mt-4 grid gap-x-6 gap-y-1 rounded-lg bg-paper/70 px-4 py-3 text-sm text-ink-2 sm:grid-cols-2">
                <p><span className="text-ink-3">Contact</span> · {client.contactName}</p>
                <p className="truncate"><span className="text-ink-3">Email</span> · {client.email || '—'}</p>
                <p><span className="text-ink-3">Phone</span> · {client.phone || '—'}</p>
                <p className="truncate"><span className="text-ink-3">Address</span> · {client.address.replace(/\n/g, ', ') || '—'}</p>
              </div>
            )}
          </Section>

          <Section title="Details">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={`${Noun} number`}>
                <Input value={doc.number} onChange={(e) => patch({ number: e.target.value })} className="tabular-nums" />
              </Field>
              <Field label="Issue date">
                <Input type="date" value={doc.issueDate} onChange={(e) => e.target.value && patch({ issueDate: e.target.value })} />
              </Field>
              <Field label={isInvoice ? 'Due date' : 'Valid until'}>
                <Input type="date" value={secondDate} onChange={(e) => e.target.value && patch(doc.kind === 'invoice' ? { dueDate: e.target.value } : { expiryDate: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-ink-3">{isInvoice ? 'Payment terms' : 'Valid for'}</span>
              {(isInvoice ? [0, 7, 14, 30] : [14, 30, 60]).map((d) => (
                <button
                  key={d}
                  onClick={() => setTerms(d)}
                  className={cx('h-8 rounded-full border px-3 text-sm transition-colors', termDays === d ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line-strong text-ink-2 hover:bg-paper-2')}
                >
                  {d === 0 ? 'On receipt' : `${d} days`}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Line items" aside={<span className="text-sm text-ink-3">{plural(doc.items.length, 'item')}</span>}>
            <div className="hidden grid-cols-[minmax(0,1fr)_72px_112px_72px_104px_36px] gap-3 border-b border-line pb-2 text-xs font-medium text-ink-3 sm:grid">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">{settings.taxLabel || 'Tax'} %</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <ul>
              {doc.items.map((i, idx) => (
                <li key={i.id} className="grid grid-cols-6 items-start gap-2 border-b border-line py-3 sm:grid-cols-[minmax(0,1fr)_72px_112px_72px_104px_36px] sm:gap-3">
                  <Input
                    className="col-span-6 sm:col-span-1"
                    value={i.description}
                    placeholder={idx === 0 ? 'e.g. Split system service & clean' : 'Description'}
                    aria-label="Description"
                    onChange={(e) => updateItem(i.id, { description: e.target.value })}
                  />
                  <label className="col-span-2 sm:col-span-1">
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden">Qty</span>
                    <NumInput value={i.quantity} onValue={(n) => updateItem(i.id, { quantity: n })} aria-label="Quantity" />
                  </label>
                  <label className="col-span-2 sm:col-span-1">
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden">Price</span>
                    <NumInput value={i.unitPrice} onValue={(n) => updateItem(i.id, { unitPrice: n })} aria-label="Unit price" />
                  </label>
                  <label className="col-span-2 sm:col-span-1">
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden">{settings.taxLabel || 'Tax'} %</span>
                    <NumInput value={i.taxRate} onValue={(n) => updateItem(i.id, { taxRate: n })} aria-label="Tax rate" />
                  </label>
                  <p className="col-span-5 flex h-10 items-center text-sm font-medium tabular-nums sm:col-span-1 sm:justify-end">
                    <span className="mr-2 text-xs font-normal text-ink-3 sm:hidden">Amount</span>
                    {fmt(lineTotal(i))}
                  </p>
                  <button
                    onClick={() => removeItem(i.id)}
                    className="col-span-1 flex h-10 w-9 items-center justify-center justify-self-end rounded-md text-ink-3 transition-colors hover:bg-danger-50 hover:text-danger-600"
                    aria-label="Remove line"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <Button size="sm" icon={<Plus size={16} />} onClick={addItem}>Add line</Button>
              <dl className="w-full text-sm sm:w-72">
                <div className="flex justify-between py-1">
                  <dt className="text-ink-2">Subtotal</dt>
                  <dd className="tabular-nums">{fmt(t.subtotal)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-ink-2">{settings.taxLabel || 'Tax'}</dt>
                  <dd className="tabular-nums">{fmt(t.tax)}</dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-line-strong pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{fmt(t.total)}</dd>
                </div>
              </dl>
            </div>
          </Section>

          <Section title="Notes">
            <Textarea
              rows={3}
              value={doc.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder={isInvoice ? 'Purchase order number, warranty info, a thank-you…' : 'Scope, exclusions, timing — anything the client should know.'}
            />
            <p className="mt-2 text-xs text-ink-3">Shown on the {Noun.toLowerCase()}. Payment details come from Settings.</p>
          </Section>

          {!isNew && (
            <div className="flex justify-end">
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>Delete {Noun.toLowerCase()}</Button>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className={cx('lg:col-span-5', view === 'edit' && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-2">Live preview</p>
              <button onClick={downloadPdf} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline">
                <Download size={14} /> PDF
              </button>
            </div>
            <div className="rounded-xl border border-line bg-paper-2/70 p-3 sm:p-4">
              <ScaledPreview>
                <DocPreview doc={doc} client={client} settings={settings} />
              </ScaledPreview>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only copy */}
      {createPortal(
        <div id="print-root">
          <DocPreview doc={doc} client={client} settings={settings} />
        </div>,
        document.body,
      )}

      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        doc={doc}
        total={fmt(t.total)}
        clientEmail={client?.email ?? ''}
        clientContact={client?.contactName ?? ''}
        business={settings.businessName}
        owner={settings.ownerName}
        onSend={confirmSend}
      />

      <ClientModal
        open={clientOpen}
        onClose={() => setClientOpen(false)}
        onSave={(c) => {
          saveClient(c);
          patch({ clientId: c.id });
          notify(`${c.name} added`);
        }}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${doc.number}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="dangerSolid" onClick={remove}>Delete {Noun.toLowerCase()}</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">This removes the {Noun.toLowerCase()} for {client?.name ?? 'this client'} ({fmt(t.total)}). It can’t be undone.</p>
      </Modal>
    </div>
  );
}

function SendModal({
  open,
  onClose,
  doc,
  total,
  clientEmail,
  clientContact,
  business,
  owner,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  doc: Doc;
  total: string;
  clientEmail: string;
  clientContact: string;
  business: string;
  owner: string;
  onSend: (via: 'email' | 'mark') => void;
}) {
  const isInvoice = doc.kind === 'invoice';
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!open) return;
    const first = clientContact.split(' ')[0] || 'there';
    setTo(clientEmail);
    setSubject(`${isInvoice ? 'Invoice' : 'Quote'} ${doc.number} from ${business}`);
    setBody(
      isInvoice
        ? `Hi ${first},\n\nPlease find attached invoice ${doc.number} for ${total}, due ${formatDate(doc.kind === 'invoice' ? doc.dueDate : '')}.\n\nPayment details are on the invoice. Thanks for your business.\n\n${owner}\n${business}`
        : `Hi ${first},\n\nThanks for having us out. Attached is quote ${doc.number} for ${total}, valid until ${formatDate(doc.kind === 'quote' ? doc.expiryDate : '')}.\n\nJust reply to this email if you’d like to go ahead.\n\n${owner}\n${business}`,
    );
  }, [open, clientEmail, clientContact, doc.number, doc.kind, total, business, owner, isInvoice, doc]);

  const openEmail = () => {
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(Attach the PDF downloaded from Sumwell.)')}`;
    window.open(href, '_blank');
    onSend('email');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send ${isInvoice ? 'invoice' : 'quote'}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onSend('mark')}>Just mark as sent</Button>
          <Button variant="primary" icon={<Send size={16} />} onClick={openEmail} disabled={!to}>Open in email</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="To">
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message" hint="Opens in your email app — download the PDF and attach it before sending.">
          <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
