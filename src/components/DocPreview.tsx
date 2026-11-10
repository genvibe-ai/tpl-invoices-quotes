import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Client, Doc, Settings } from '../lib/types';
import { formatDate, formatMoney, initials, lineTotal, totals } from '../lib/format';

export const PAGE_W = 794;
const PAGE_H = 1123;

function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`mb-2 text-xs font-medium uppercase tracking-widest text-ink-3 ${className}`}>{children}</p>;
}

export function DocPreview({ doc, client, settings }: { doc: Doc; client?: Client; settings: Settings }) {
  const isInvoice = doc.kind === 'invoice';
  const t = totals(doc.items);
  const fmt = (n: number) => formatMoney(n, settings.currency);
  const paid = doc.kind === 'invoice' && doc.status === 'paid';
  const secondDate = doc.kind === 'invoice' ? doc.dueDate : doc.expiryDate;
  const hasPayment = settings.bankName || settings.accountNumber || settings.paymentNote;
  const taxRates = Array.from(new Set(doc.items.map((i) => i.taxRate)));
  const taxLabel = settings.taxLabel || 'Tax';

  return (
    <div className="bg-[#fffefa] text-ink" style={{ width: PAGE_W, minHeight: PAGE_H }}>
      <div className="flex flex-col px-16 py-16" style={{ minHeight: PAGE_H }}>
        <header className="flex items-start justify-between gap-10">
          <div className="max-w-xs">
            {settings.logo ? (
              <img src={settings.logo} alt={`${settings.businessName} logo`} className="mb-5 max-h-14 max-w-48 object-contain" />
            ) : (
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-700 font-display text-xl text-accent-50">
                {initials(settings.businessName || 'S')}
              </div>
            )}
            <p className="font-display text-2xl font-medium leading-tight">{settings.businessName || 'Your business'}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{settings.address}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {[settings.email, settings.phone].filter(Boolean).join(' · ')}
            </p>
            {settings.taxId && <p className="text-sm text-ink-2">{settings.taxId}</p>}
          </div>
          <div className="text-right">
            <p className="font-display text-5xl font-normal leading-none tracking-tight">{isInvoice ? 'Invoice' : 'Quote'}</p>
            <p className="mt-3 text-sm tabular-nums text-ink-2">{doc.number}</p>
            {paid && doc.kind === 'invoice' && (
              <p className="mt-4 inline-flex rounded-full border border-accent-200 px-3 py-1 text-xs font-medium text-accent-700">
                Paid {formatDate(doc.paidDate)}
              </p>
            )}
          </div>
        </header>

        <div className="mt-14 grid grid-cols-3 gap-8 border-t border-ink pt-6">
          <div>
            <Label>{isInvoice ? 'Billed to' : 'Prepared for'}</Label>
            {client ? (
              <div className="text-sm leading-relaxed">
                <p className="font-medium">{client.name}</p>
                {client.contactName && client.contactName !== client.name && <p className="text-ink-2">Attn: {client.contactName}</p>}
                <p className="whitespace-pre-line text-ink-2">{client.address}</p>
                <p className="text-ink-2">{client.email}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-3">Choose a client</p>
            )}
          </div>
          <div className="text-sm">
            <Label>Issued</Label>
            <p className="tabular-nums">{formatDate(doc.issueDate)}</p>
            <Label className="mt-5">{isInvoice ? 'Due' : 'Valid until'}</Label>
            <p className="tabular-nums">{formatDate(secondDate)}</p>
          </div>
          <div className="text-right">
            <Label>{isInvoice ? (paid ? 'Amount paid' : 'Amount due') : 'Quote total'}</Label>
            <p className="font-sans text-3xl font-medium tabular-nums tracking-tight">{fmt(t.total)}</p>
            <p className="mt-1 text-xs text-ink-3">{settings.currency}, incl. {taxLabel}</p>
          </div>
        </div>

        <table className="mt-12 w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs uppercase tracking-widest text-ink-3">
              <th className="pb-3 font-medium">Description</th>
              <th className="w-16 pb-3 text-right font-medium">Qty</th>
              <th className="w-28 pb-3 text-right font-medium">Price</th>
              <th className="w-16 pb-3 text-right font-medium">{taxLabel}</th>
              <th className="w-32 pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((i) => (
              <tr key={i.id} className="border-b border-line align-top">
                <td className="py-4 pr-4 leading-snug">{i.description || <span className="text-ink-3">Untitled item</span>}</td>
                <td className="py-4 text-right tabular-nums">{i.quantity}</td>
                <td className="py-4 text-right tabular-nums">{fmt(i.unitPrice)}</td>
                <td className="py-4 text-right tabular-nums text-ink-2">{i.taxRate}%</td>
                <td className="py-4 text-right tabular-nums">{fmt(lineTotal(i))}</td>
              </tr>
            ))}
            {doc.items.length === 0 && (
              <tr className="border-b border-line">
                <td colSpan={5} className="py-6 text-center text-ink-3">No line items yet</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="ml-auto mt-6 w-72 text-sm">
          <div className="flex justify-between py-1.5">
            <span className="text-ink-2">Subtotal</span>
            <span className="tabular-nums">{fmt(t.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-ink-2">
              {taxLabel}
              {taxRates.length === 1 ? ` (${taxRates[0]}%)` : ''}
            </span>
            <span className="tabular-nums">{fmt(t.tax)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-ink pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{fmt(t.total)}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="mt-16 grid grid-cols-2 gap-12 text-sm leading-relaxed">
          <div>
            {isInvoice ? (
              hasPayment ? (
                <>
                  <Label>Payment details</Label>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                    {settings.bankName && (<><dt className="text-ink-3">Bank</dt><dd>{settings.bankName}</dd></>)}
                    {settings.accountName && (<><dt className="text-ink-3">Account name</dt><dd>{settings.accountName}</dd></>)}
                    {settings.routingNumber && (<><dt className="text-ink-3">BSB / Sort</dt><dd className="tabular-nums">{settings.routingNumber}</dd></>)}
                    {settings.accountNumber && (<><dt className="text-ink-3">Account no.</dt><dd className="tabular-nums">{settings.accountNumber}</dd></>)}
                    <dt className="text-ink-3">Reference</dt>
                    <dd className="tabular-nums">{doc.number}</dd>
                  </dl>
                  {settings.paymentNote && <p className="mt-3 text-ink-2">{settings.paymentNote}</p>}
                </>
              ) : null
            ) : (
              <>
                <Label>Accepting this quote</Label>
                <p className="text-ink-2">
                  This quote is valid until {formatDate(secondDate)}. To go ahead, reply to {settings.email || 'us'}
                  {settings.phone ? ` or call ${settings.phone}` : ''} quoting {doc.number}.
                </p>
              </>
            )}
          </div>
          <div>
            {doc.notes && (
              <>
                <Label>Notes</Label>
                <p className="whitespace-pre-line text-ink-2">{doc.notes}</p>
              </>
            )}
          </div>
        </div>

        <footer className="mt-12 flex justify-between border-t border-line pt-5 text-xs text-ink-3">
          <span>Thank you for your business.</span>
          <span>{settings.businessName}</span>
        </footer>
      </div>
    </div>
  );
}

/** Renders an A4 page scaled down to fit its container width. */
export function ScaledPreview({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(PAGE_H * 0.6);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const s = Math.min(1, o.clientWidth / PAGE_W);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full">
      <div className="relative overflow-hidden rounded-md border border-line" style={{ height }}>
        <div ref={inner} style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
