import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, Client, Doc, DocKind, Invoice, Quote, Settings } from './types';
import { createSampleData, sampleSettings } from '../data/sampleData';
import { addDays, formatMoney, todayISO, uid } from './format';

const KEY = 'sumwell:data:v1';

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as AppData;
      if (p && p.version === 1 && Array.isArray(p.invoices) && Array.isArray(p.clients)) {
        return { ...p, settings: { ...sampleSettings, ...p.settings } };
      }
    }
  } catch {
    /* corrupted storage — fall back to sample data */
  }
  return createSampleData();
}

function computeNext(data: AppData, kind: DocKind) {
  const docs: Doc[] = kind === 'invoice' ? data.invoices : data.quotes;
  const prefix = kind === 'invoice' ? data.settings.invoicePrefix : data.settings.quotePrefix;
  const nums = docs.map((d) => parseInt(d.number.replace(/\D/g, ''), 10)).filter(Number.isFinite);
  const next = nums.length ? Math.max(...nums) + 1 : kind === 'invoice' ? 1001 : 2001;
  return `${prefix}${next}`;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

type Toast = { id: number; message: string };

type Store = {
  data: AppData;
  toast: Toast | null;
  notify: (message: string) => void;
  saveDoc: (doc: Doc) => void;
  deleteDoc: (kind: DocKind, id: string) => void;
  saveClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  saveSettings: (s: Settings) => void;
  nextNumber: (kind: DocKind) => string;
  convertQuote: (q: Quote) => string;
  resetToSample: () => AppData;
  clearAll: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [toast, setToast] = useState<Toast | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full (e.g. a very large logo) */
    }
  }, [data]);

  const notify = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2800);
  }, []);

  const saveDoc = useCallback((doc: Doc) => {
    if (doc.kind === 'invoice') {
      const inv = doc;
      setData((d) => ({ ...d, invoices: upsert(d.invoices, inv) }));
    } else {
      const q = doc;
      setData((d) => ({ ...d, quotes: upsert(d.quotes, q) }));
    }
  }, []);

  const deleteDoc = useCallback((kind: DocKind, id: string) => {
    setData((d) =>
      kind === 'invoice'
        ? { ...d, invoices: d.invoices.filter((x) => x.id !== id) }
        : { ...d, quotes: d.quotes.filter((x) => x.id !== id) },
    );
  }, []);

  const saveClient = useCallback((c: Client) => setData((d) => ({ ...d, clients: upsert(d.clients, c) })), []);
  const deleteClient = useCallback((id: string) => setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id) })), []);
  const saveSettings = useCallback((s: Settings) => setData((d) => ({ ...d, settings: s })), []);
  const nextNumber = useCallback((kind: DocKind) => computeNext(dataRef.current, kind), []);

  const convertQuote = useCallback((q: Quote) => {
    const cur = dataRef.current;
    const today = todayISO();
    const invoice: Invoice = {
      id: uid('inv'),
      kind: 'invoice',
      number: computeNext(cur, 'invoice'),
      clientId: q.clientId,
      issueDate: today,
      dueDate: addDays(today, cur.settings.paymentTermsDays),
      status: 'draft',
      items: q.items.map((i) => ({ ...i, id: uid('li') })),
      notes: q.notes,
      fromQuoteId: q.id,
    };
    const nq: Quote = { ...q, status: 'converted', convertedInvoiceId: invoice.id };
    setData((d) => ({ ...d, invoices: [invoice, ...d.invoices], quotes: upsert(d.quotes, nq) }));
    return invoice.id;
  }, []);

  const resetToSample = useCallback(() => {
    const fresh = createSampleData();
    setData(fresh);
    return fresh;
  }, []);

  const clearAll = useCallback(() => setData((d) => ({ ...d, clients: [], invoices: [], quotes: [] })), []);

  const value = useMemo<Store>(
    () => ({ data, toast, notify, saveDoc, deleteDoc, saveClient, deleteClient, saveSettings, nextNumber, convertQuote, resetToSample, clearAll }),
    [data, toast, notify, saveDoc, deleteDoc, saveClient, deleteClient, saveSettings, nextNumber, convertQuote, resetToSample, clearAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

export function useMoney() {
  const { data } = useStore();
  const cur = data.settings.currency;
  return useCallback((n: number) => formatMoney(n, cur), [cur]);
}
