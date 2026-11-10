## What this app is
Sumwell, a quotes-and-invoices web app for small service businesses (fictional brand; demo business "Oakline Electrical & Air", owner Sam Whitlock). Vite 8, React 19, TypeScript, Tailwind CSS 4, lucide-react. Runs entirely in the browser on sample data saved in localStorage (`sumwell:data:v1`): no backend, no env vars. Scripts: `yarn dev`, `yarn build`.

## Built so far
Dashboard (received this month, overdue total, quotes awaiting reply, 12-month revenue chart, needs-attention list), invoices list (Draft, Sent, Paid, Overdue; search and filters), invoice and quote editor with a live printable preview (client, line items with quantity, price and tax, notes, due date), quotes with "Convert to invoice", clients list and client page, settings (business name, logo, tax rate, currency, payment details). On phones the sidebar becomes a bottom bar and tables become cards.

## Design
Warm paper background #f6f3ec, surfaces #fffdf8, ink #1a1917, one deep green accent; Newsreader serif for headings, Geist for the interface; tabular figures for money; thin borders rather than heavy shadows. No gradients.

## Structure
- `src/data/sampleData.ts`: `sampleSettings` (business, tax, currency) and `createSampleData()` (12 clients, invoices, quotes).
- `src/lib/store.tsx`: the data store, saved to localStorage; `src/lib/selectors.ts` totals and statuses; `src/lib/format.ts` money and dates; `src/lib/router.ts` hash routes; `src/lib/types.ts`.
- `src/pages/`: Dashboard, DocList, DocEditor, Clients, ClientDetail, Settings. `src/components/`: Shell (sidebar and bottom bar), DocPreview, RevenueChart, ClientModal, ui.

## User preferences & rules
Rebrand through `sampleSettings` and the sample data first; keep the design tokens in `src/index.css`; format money and dates only through `src/lib/format.ts`; the app must keep working with no backend and no env vars.

## Open issues & next ideas
Data lives in one browser only. Ideas: Supabase for sign-in and sync across devices, emailing invoices, online payment links, recurring invoices.
