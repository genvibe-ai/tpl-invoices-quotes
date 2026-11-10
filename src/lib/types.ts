export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** percent, e.g. 10 for 10% */
  taxRate: number;
};

export type Client = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type InvoiceDisplayStatus = InvoiceStatus | 'overdue';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
export type QuoteDisplayStatus = QuoteStatus | 'expired';
export type DisplayStatus = InvoiceDisplayStatus | QuoteDisplayStatus;

export type Invoice = {
  id: string;
  kind: 'invoice';
  number: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  sentDate?: string;
  paidDate?: string;
  items: LineItem[];
  notes: string;
  fromQuoteId?: string;
};

export type Quote = {
  id: string;
  kind: 'quote';
  number: string;
  clientId: string;
  issueDate: string;
  expiryDate: string;
  status: QuoteStatus;
  sentDate?: string;
  items: LineItem[];
  notes: string;
  convertedInvoiceId?: string;
};

export type Doc = Invoice | Quote;
export type DocKind = 'invoice' | 'quote';

export type Settings = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  /** data URL */
  logo: string;
  taxRate: number;
  taxLabel: string;
  currency: string;
  invoicePrefix: string;
  quotePrefix: string;
  paymentTermsDays: number;
  quoteValidityDays: number;
  bankName: string;
  accountName: string;
  routingNumber: string;
  accountNumber: string;
  paymentNote: string;
};

export type AppData = {
  version: number;
  clients: Client[];
  invoices: Invoice[];
  quotes: Quote[];
  settings: Settings;
};
