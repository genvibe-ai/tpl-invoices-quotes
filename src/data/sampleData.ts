/**
 * Sumwell sample data — 12 clients, 30 invoices, 10 quotes.
 *
 * Replace anything in this file with your own records. Dates are written as
 * "days from today" (e.g. day(-30) = 30 days ago) so the demo always shows
 * a realistic mix of paid, overdue and upcoming work.
 */
import type { AppData, Client, Invoice, InvoiceStatus, LineItem, Quote, QuoteStatus, Settings } from '../lib/types';

const pad = (n: number) => String(n).padStart(2, '0');
function day(offset: number) {
  const x = new Date();
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + offset);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

let itemSeq = 0;
const li = (description: string, quantity: number, unitPrice: number, taxRate = 10): LineItem => ({
  id: `li-${++itemSeq}`,
  description,
  quantity,
  unitPrice,
  taxRate,
});

export const sampleSettings: Settings = {
  businessName: 'Oakline Electrical & Air',
  ownerName: 'Sam Whitlock',
  email: 'accounts@oaklineelectrical.com.au',
  phone: '0412 558 203',
  address: 'Unit 4, 18 Chard Road\nBrookvale NSW 2100',
  taxId: 'ABN 52 614 908 337',
  logo: '',
  taxRate: 10,
  taxLabel: 'GST',
  currency: 'AUD',
  invoicePrefix: 'INV-',
  quotePrefix: 'Q-',
  paymentTermsDays: 14,
  quoteValidityDays: 30,
  bankName: 'Commonwealth Bank',
  accountName: 'Oakline Electrical Pty Ltd',
  routingNumber: '062-118',
  accountNumber: '1043 8872',
  paymentNote: 'Please use the invoice number as your payment reference. Card payments accepted by phone.',
};

function buildClients(): Client[] {
  return [
    { id: 'c1', name: 'Harbourside Dental', contactName: 'Dr Priya Nair', email: 'priya@harboursidedental.com.au', phone: '02 9411 2038', address: '14 Alfred Street\nMilsons Point NSW 2061', notes: 'Book work before 8am or after 5pm — surgery is open weekdays.', createdAt: day(-370) },
    { id: 'c2', name: 'The Larder Café', contactName: 'Tom Becker', email: 'tom@thelarder.cafe', phone: '0423 118 902', address: '3/52 Pittwater Road\nManly NSW 2095', notes: 'Cool room is out the back; key from the manager.', createdAt: day(-330) },
    { id: 'c3', name: 'Margaret Ellison', contactName: 'Margaret Ellison', email: 'm.ellison@bigpond.com', phone: '0418 662 471', address: '27 Wattle Crescent\nLane Cove NSW 2066', notes: 'Prefers a call before arrival. Two dogs in the yard.', createdAt: day(-325) },
    { id: 'c4', name: 'Northbridge Physio', contactName: 'Ellen Marsh', email: 'admin@northbridgephysio.com.au', phone: '02 9958 4410', address: '201 Sailors Bay Road\nNorthbridge NSW 2063', notes: '', createdAt: day(-280) },
    { id: 'c5', name: 'Kestrel Property Group', contactName: 'Ana Ruiz', email: 'ana.ruiz@kestrelproperty.com.au', phone: '02 8007 3150', address: 'Level 6, 88 Phillip Street\nSydney NSW 2000', notes: 'Strata manager for 4 buildings. Purchase order number required on every invoice.', createdAt: day(-365) },
    { id: 'c6', name: 'James & Olivia Tan', contactName: 'Olivia Tan', email: 'olivia.tan@gmail.com', phone: '0407 993 115', address: '9 Grandview Parade\nEpping NSW 2121', notes: 'Ducted system installed. Annual service in autumn.', createdAt: day(-240) },
    { id: 'c7', name: 'Bloom Florist Co.', contactName: 'Hana Kobayashi', email: 'hello@bloomflorist.co', phone: '02 9967 2244', address: '61 Military Road\nNeutral Bay NSW 2089', notes: '', createdAt: day(-295) },
    { id: 'c8', name: 'Cove Street Childcare', contactName: 'Rebecca Lowe', email: 'director@covestreetcc.org.au', phone: '02 9817 6620', address: '12 Cove Street\nBirchgrove NSW 2041', notes: 'Working With Children Check required on site.', createdAt: day(-210) },
    { id: 'c9', name: 'Daniel Okafor', contactName: 'Daniel Okafor', email: 'dan.okafor@outlook.com', phone: '0433 270 588', address: '45 Elouera Road\nCronulla NSW 2230', notes: '', createdAt: day(-175) },
    { id: 'c10', name: 'Ridgeway Accounting', contactName: 'Martin Hale', email: 'martin@ridgewayaccounting.com.au', phone: '02 9420 7781', address: 'Suite 3, 1 Help Street\nChatswood NSW 2067', notes: 'Office relocating to Level 2 next quarter.', createdAt: day(-260) },
    { id: 'c11', name: 'Saltwater Yoga Studio', contactName: 'Jess Marlowe', email: 'jess@saltwateryoga.com.au', phone: '0402 145 730', address: '2/118 Curl Curl Parade\nCurl Curl NSW 2096', notes: '', createdAt: day(-190) },
    { id: 'c12', name: 'Fiona McAllister', contactName: 'Fiona McAllister', email: 'fiona.mcallister@icloud.com', phone: '0414 806 229', address: '7 Boundary Lane\nMosman NSW 2088', notes: 'Garden lighting project in stages.', createdAt: day(-140) },
  ];
}

function inv(
  num: number,
  clientId: string,
  issued: number,
  status: InvoiceStatus,
  items: LineItem[],
  o: { paid?: number; due?: number; notes?: string; fromQuoteId?: string } = {},
): Invoice {
  return {
    id: `inv-${num}`,
    kind: 'invoice',
    number: `INV-${num}`,
    clientId,
    issueDate: day(issued),
    dueDate: day(o.due ?? issued + 14),
    status,
    sentDate: status === 'draft' ? undefined : day(issued),
    paidDate: status === 'paid' ? day(o.paid ?? issued + 9) : undefined,
    items,
    notes: o.notes ?? '',
    fromQuoteId: o.fromQuoteId,
  };
}

function buildInvoices(): Invoice[] {
  return [
    inv(1001, 'c5', -355, 'paid', [li('Common area LED batten replacement', 42, 68), li('Labour — electrician', 16, 95), li('Scissor lift hire (1 day)', 1, 380)], { paid: -342, notes: 'PO 44817 — Building B, Waverton.' }),
    inv(1002, 'c1', -340, 'paid', [li('Daikin 7.1kW split system — supply & install', 1, 2450), li('Dedicated circuit & isolator', 1, 320)], { paid: -331 }),
    inv(1003, 'c3', -320, 'paid', [li('Callout fee', 1, 89), li('Replace downlights with LED', 4, 65), li('Interconnected smoke alarm', 2, 145)], { paid: -318 }),
    inv(1004, 'c2', -300, 'paid', [li('Kitchen exhaust fan circuit', 1, 680), li('Labour — electrician', 3, 95)], { paid: -290 }),
    inv(1005, 'c7', -285, 'paid', [li('Cool room thermostat replacement', 1, 420), li('Callout fee', 1, 89)], { paid: -270 }),
    inv(1006, 'c4', -265, 'paid', [li('Split system service & clean', 3, 165), li('Replacement filters', 3, 38)], { paid: -255 }),
    inv(1007, 'c10', -250, 'paid', [li('Double power & data point', 6, 135), li('RCD safety switch upgrade', 2, 210)], { paid: -237 }),
    inv(1008, 'c6', -232, 'paid', [li('Ducted air conditioning — 12.5kW supply & install', 1, 8900), li('Four-zone controller', 1, 640)], { paid: -220, notes: '5-year manufacturer warranty registered on your behalf.' }),
    inv(1009, 'c5', -215, 'paid', [li('Annual emergency & exit lighting test', 1, 1150), li('Replace LED exit sign', 3, 185)], { paid: -199, notes: 'PO 45102.' }),
    inv(1010, 'c8', -200, 'paid', [li('RCD safety switch install', 2, 240), li('Test & tag portable appliances', 64, 4.5)], { paid: -189 }),
    inv(1011, 'c11', -183, 'paid', [li('Ceiling fan — supply & install', 4, 395)], { paid: -170 }),
    inv(1012, 'c9', -168, 'paid', [li('Switchboard upgrade (ceramic fuses to RCBOs)', 1, 1680), li('Callout fee', 1, 89)], { paid: -150 }),
    inv(1013, 'c1', -150, 'paid', [li('Split system service & clean', 2, 165), li('Refrigerant top-up', 1, 220)], { paid: -140 }),
    inv(1014, 'c12', -135, 'paid', [li('Garden spike light — supply & install', 8, 120), li('Labour — electrician', 5, 95)], { paid: -118, notes: 'Stage 1 of garden lighting.' }),
    inv(1015, 'c2', -120, 'paid', [li('Daikin 3.5kW split system — supply & install', 1, 1890), li('Remove & dispose old unit', 1, 180)], { paid: -108 }),
    inv(1016, 'c5', -104, 'paid', [li('Car park lighting fault repair', 1, 760), li('Labour — electrician', 6, 95)], { paid: -87, notes: 'PO 45560.' }),
    inv(1017, 'c3', -90, 'paid', [li('Double power point install', 3, 135)], { paid: -84 }),
    inv(1018, 'c4', -76, 'paid', [li('Daikin 7.1kW split system — supply & install', 2, 2450), li('Electrical connection & circuits', 1, 540)], { paid: -60, fromQuoteId: 'q-2001' }),
    inv(1019, 'c7', -62, 'sent', [li('Shopfront LED track lighting', 12, 85), li('Labour — electrician', 6, 95)], { due: -48 }),
    inv(1020, 'c10', -55, 'paid', [li('Server room air conditioner service', 1, 290), li('Condensate pump replacement', 1, 210)], { paid: -40 }),
    inv(1021, 'c8', -45, 'sent', [li('Smoke alarm compliance check', 9, 145), li('Emergency lighting test', 1, 480)], { due: -31 }),
    inv(1022, 'c6', -38, 'paid', [li('Ducted system annual service', 1, 340)], { paid: 0 }),
    inv(1023, 'c11', -30, 'sent', [li('Sound system power circuit', 1, 520), li('Dimmer switch install', 4, 110)], { due: -16 }),
    inv(1024, 'c1', -24, 'paid', [li('Treatment room light fittings', 6, 140), li('Labour — electrician', 4, 95)], { paid: -2 }),
    inv(1025, 'c5', -20, 'paid', [li('Intercom power supply fault', 1, 320), li('Callout fee', 1, 89)], { paid: -1, notes: 'PO 46021.' }),
    inv(1026, 'c9', -18, 'sent', [li('EV charger (7kW wall box) install', 1, 1450), li('Dedicated circuit from switchboard', 1, 380)], { due: -4 }),
    inv(1027, 'c2', -10, 'sent', [li('Cool room evaporator fan motor', 1, 560), li('Labour — technician', 2, 95)], { due: 4 }),
    inv(1028, 'c12', -7, 'sent', [li('Pool pump circuit & weatherproof outlet', 1, 410)], { due: 7 }),
    inv(1029, 'c4', -4, 'draft', [li('Quarterly split system service', 3, 165)], { due: 10 }),
    inv(1030, 'c10', -1, 'draft', [li('Office relocation — power & data points', 14, 135), li('Labour — electrician', 8, 95)], { due: 13, notes: 'Level 2 fit-out. Final count of points to confirm on site.' }),
  ];
}

function quote(
  num: number,
  clientId: string,
  issued: number,
  status: QuoteStatus,
  items: LineItem[],
  o: { notes?: string; convertedInvoiceId?: string; expires?: number } = {},
): Quote {
  return {
    id: `q-${num}`,
    kind: 'quote',
    number: `Q-${num}`,
    clientId,
    issueDate: day(issued),
    expiryDate: day(o.expires ?? issued + 30),
    status,
    sentDate: status === 'draft' ? undefined : day(issued),
    items,
    notes: o.notes ?? '',
    convertedInvoiceId: o.convertedInvoiceId,
  };
}

function buildQuotes(): Quote[] {
  return [
    quote(2001, 'c4', -85, 'converted', [li('Daikin 7.1kW split system — supply & install', 2, 2450), li('Electrical connection & circuits', 1, 540)], { convertedInvoiceId: 'inv-1018' }),
    quote(2002, 'c7', -60, 'declined', [li('Full shop rewire incl. new switchboard', 1, 7400)], { notes: 'Client chose to defer until lease renewal.' }),
    quote(2003, 'c1', -40, 'accepted', [li('Ducted air conditioning — reception & waiting room', 1, 6800), li('Two-zone controller', 1, 640)], { notes: 'Install scheduled over a weekend to avoid patient hours.' }),
    quote(2004, 'c8', -27, 'sent', [li('Daikin 7.1kW split system — classroom', 2, 2450), li('Isolator & circuit', 2, 160)]),
    quote(2005, 'c11', -25, 'sent', [li('Mitsubishi 8kW split system — studio', 1, 2950), li('Wall bracket & condensate pump', 1, 260)]),
    quote(2006, 'c6', -14, 'sent', [li('Solar-ready switchboard upgrade', 1, 2150)]),
    quote(2007, 'c12', -9, 'sent', [li('Garden spike light — supply & install', 6, 120), li('Labour — electrician', 4, 95)], { notes: 'Stage 2 — rear garden and pathway.' }),
    quote(2008, 'c3', -5, 'sent', [li('Bathroom exhaust fan — ducted to eave', 2, 260)]),
    quote(2009, 'c9', -2, 'draft', [li('Home battery pre-wiring & isolation', 1, 1350)]),
    quote(2010, 'c2', -1, 'draft', [li('Kitchen pendant lighting refit', 10, 95), li('Labour — electrician', 5, 95)]),
  ];
}

export function createSampleData(): AppData {
  itemSeq = 0;
  return {
    version: 1,
    clients: buildClients(),
    invoices: buildInvoices(),
    quotes: buildQuotes(),
    settings: { ...sampleSettings },
  };
}
