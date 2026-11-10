import type { AppData } from './types';
import { docTotal, invoiceStatus, quoteStatus } from './format';

export function clientStats(data: AppData, clientId: string, today: string) {
  const invoices = data.invoices.filter((i) => i.clientId === clientId);
  const quotes = data.quotes.filter((q) => q.clientId === clientId);
  let spent = 0;
  let outstanding = 0;
  let overdue = 0;
  let lastDate = '';
  for (const inv of invoices) {
    const t = docTotal(inv);
    const s = invoiceStatus(inv, today);
    if (s === 'paid') spent += t;
    if (s === 'sent' || s === 'overdue') outstanding += t;
    if (s === 'overdue') overdue += t;
    if (inv.issueDate > lastDate) lastDate = inv.issueDate;
  }
  for (const q of quotes) if (q.issueDate > lastDate) lastDate = q.issueDate;
  const openQuotes = quotes.filter((q) => quoteStatus(q, today) === 'sent');
  return {
    invoices,
    quotes,
    spent,
    outstanding,
    overdue,
    openQuotes: openQuotes.length,
    openQuotesValue: openQuotes.reduce((s, q) => s + docTotal(q), 0),
    lastDate,
  };
}
