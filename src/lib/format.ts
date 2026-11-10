import type { Invoice, InvoiceDisplayStatus, LineItem, Quote, QuoteDisplayStatus } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function addDays(iso: string, n: number) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** whole days from a to b (positive if b is later) */
export function daysBetween(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

const dateFmt = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' });

export const formatDate = (iso?: string) => (iso ? dateFmt.format(parseISO(iso)) : '—');
export const formatShortDate = (iso?: string) => (iso ? shortDateFmt.format(parseISO(iso)) : '—');

export const CURRENCIES: { code: string; label: string; locale: string }[] = [
  { code: 'AUD', label: 'Australian dollar', locale: 'en-AU' },
  { code: 'NZD', label: 'New Zealand dollar', locale: 'en-NZ' },
  { code: 'GBP', label: 'British pound', locale: 'en-GB' },
  { code: 'USD', label: 'US dollar', locale: 'en-US' },
  { code: 'CAD', label: 'Canadian dollar', locale: 'en-CA' },
  { code: 'EUR', label: 'Euro', locale: 'en-IE' },
  { code: 'SGD', label: 'Singapore dollar', locale: 'en-SG' },
  { code: 'ZAR', label: 'South African rand', locale: 'en-ZA' },
  { code: 'INR', label: 'Indian rupee', locale: 'en-IN' },
];

const fmtCache = new Map<string, Intl.NumberFormat>();
function getFmt(currency: string, compact: boolean) {
  const key = `${currency}:${compact}`;
  let f = fmtCache.get(key);
  if (!f) {
    const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? 'en-AU';
    try {
      f = new Intl.NumberFormat(locale, compact
        ? { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }
        : { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      f = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
    }
    fmtCache.set(key, f);
  }
  return f;
}

export const formatMoney = (n: number, currency: string, compact = false) => getFmt(currency, compact).format(n || 0);

const round2 = (n: number) => Math.round(n * 100) / 100;

export const lineTotal = (li: LineItem) => round2((li.quantity || 0) * (li.unitPrice || 0));

export function totals(items: LineItem[]) {
  let subtotal = 0;
  let tax = 0;
  for (const li of items) {
    const t = lineTotal(li);
    subtotal += t;
    tax += (t * (li.taxRate || 0)) / 100;
  }
  subtotal = round2(subtotal);
  tax = round2(tax);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

export const docTotal = (d: { items: LineItem[] }) => totals(d.items).total;

export function invoiceStatus(inv: Invoice, today = todayISO()): InvoiceDisplayStatus {
  if (inv.status === 'sent' && inv.dueDate < today) return 'overdue';
  return inv.status;
}

export function quoteStatus(q: Quote, today = todayISO()): QuoteDisplayStatus {
  if (q.status === 'sent' && q.expiryDate < today) return 'expired';
  return q.status;
}

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter((w) => /[A-Za-z]/.test(w[0] ?? ''))
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '·'
  );
}
