import { useRef, useState, type ReactNode } from 'react';
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Settings } from '../lib/types';
import { CURRENCIES, formatMoney, initials } from '../lib/format';
import { Button, Card, Field, Input, Modal, NumInput, Select, Textarea } from '../components/ui';

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="grid gap-6 p-5 sm:p-8 lg:grid-cols-3 lg:gap-10">
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        <p className="mt-1 max-w-xs text-sm text-ink-3">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { data, saveSettings, resetToSample, clearAll, notify } = useStore();
  const [form, setForm] = useState<Settings>(data.settings);
  const [confirm, setConfirm] = useState<null | 'reset' | 'clear'>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  function onLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Please choose an image file');
    if (file.size > 800_000) return notify('Logo must be under 800 KB');
    const reader = new FileReader();
    reader.onload = () => set('logo', String(reader.result));
    reader.readAsDataURL(file);
  }

  const save = () => {
    saveSettings(form);
    notify('Settings saved');
  };

  return (
    <div className="animate-fade-up">
      <header className="mb-8 sm:mb-10">
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Settings</h1>
        <p className="mt-2 text-ink-2">How your business appears on quotes and invoices.</p>
      </header>

      <div className="space-y-6">
        <Section title="Business" description="Your name, address and contact details appear at the top of every document.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" className="sm:col-span-2">
              <Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
            </Field>
            <Field label="Your name">
              <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
            </Field>
            <Field label="Business number" hint="ABN, VAT, EIN or similar.">
              <Input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={2} className="min-h-20" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Logo" description="PNG, JPG or SVG, under 800 KB. A wide logo on a transparent background prints best.">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-paper p-3">
              {form.logo ? (
                <img src={form.logo} alt="Your logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-700 font-display text-xl text-accent-50">{initials(form.businessName || 'S')}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
              <Button icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>{form.logo ? 'Replace logo' : 'Upload logo'}</Button>
              {form.logo && <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => set('logo', '')}>Remove</Button>}
            </div>
          </div>
        </Section>

        <Section title="Tax & currency" description="Defaults for new line items. You can still change the rate on any single line.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency" className="sm:col-span-3">
              <Select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tax name" hint="e.g. GST, VAT, Sales tax">
              <Input value={form.taxLabel} onChange={(e) => set('taxLabel', e.target.value)} />
            </Field>
            <Field label="Default tax rate (%)">
              <NumInput value={form.taxRate} onValue={(n) => set('taxRate', n)} />
            </Field>
            <div className="flex flex-col justify-end">
              <p className="rounded-lg bg-paper px-3 py-2.5 text-sm text-ink-2">
                Example: <span className="tabular-nums text-ink">{formatMoney(100, form.currency)}</span> + {form.taxRate}% = <span className="tabular-nums font-medium text-ink">{formatMoney(100 * (1 + form.taxRate / 100), form.currency)}</span>
              </p>
            </div>
          </div>
        </Section>

        <Section title="Numbering & terms" description="How new documents are numbered and how long clients have to pay or accept.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice prefix">
              <Input value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} />
            </Field>
            <Field label="Quote prefix">
              <Input value={form.quotePrefix} onChange={(e) => set('quotePrefix', e.target.value)} />
            </Field>
            <Field label="Payment terms (days)">
              <NumInput value={form.paymentTermsDays} onValue={(n) => set('paymentTermsDays', Math.max(0, Math.round(n)))} />
            </Field>
            <Field label="Quotes valid for (days)">
              <NumInput value={form.quoteValidityDays} onValue={(n) => set('quoteValidityDays', Math.max(1, Math.round(n)))} />
            </Field>
          </div>
        </Section>

        <Section title="Payment details" description="Printed at the bottom of every invoice so clients know how to pay you.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank">
              <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
            </Field>
            <Field label="Account name">
              <Input value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
            </Field>
            <Field label="BSB / Sort code / Routing">
              <Input value={form.routingNumber} onChange={(e) => set('routingNumber', e.target.value)} className="tabular-nums" />
            </Field>
            <Field label="Account number">
              <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} className="tabular-nums" />
            </Field>
            <Field label="Payment instructions" className="sm:col-span-2">
              <Textarea rows={3} value={form.paymentNote} onChange={(e) => set('paymentNote', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Your data" description="Everything is saved in this browser. Reset to the sample data or start with a clean slate.">
          <div className="flex flex-wrap gap-2">
            <Button icon={<RotateCcw size={16} />} onClick={() => setConfirm('reset')}>Restore sample data</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirm('clear')}>Delete all clients & documents</Button>
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-20 z-20 mt-6 flex animate-fade-up items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3 md:bottom-6 sm:px-6">
          <p className="text-sm text-ink-2">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setForm(data.settings)}>Discard</Button>
            <Button variant="primary" onClick={save}>Save changes</Button>
          </div>
        </div>
      )}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reset' ? 'Restore sample data?' : 'Delete everything?'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm === 'reset' ? 'primary' : 'dangerSolid'}
              onClick={() => {
                if (confirm === 'reset') {
                  const fresh = resetToSample();
                  setForm(fresh.settings);
                  notify('Sample data restored');
                } else {
                  clearAll();
                  notify('All clients and documents deleted');
                }
                setConfirm(null);
              }}
            >
              {confirm === 'reset' ? 'Restore' : 'Delete everything'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {confirm === 'reset'
            ? 'This replaces all your clients, invoices, quotes and settings with the sample business.'
            : 'All clients, invoices and quotes will be removed from this browser. Your business settings stay.'}
        </p>
      </Modal>
    </div>
  );
}
