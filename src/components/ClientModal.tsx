import { useEffect, useState } from 'react';
import type { Client } from '../lib/types';
import { todayISO, uid } from '../lib/format';
import { Button, Field, Input, Modal, Textarea } from './ui';

const blank = (): Client => ({ id: uid('c'), name: '', contactName: '', email: '', phone: '', address: '', notes: '', createdAt: todayISO() });

export function ClientModal({ open, onClose, onSave, client }: { open: boolean; onClose: () => void; onSave: (c: Client) => void; client?: Client }) {
  const [form, setForm] = useState<Client>(client ?? blank());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(client ? { ...client } : blank());
      setError('');
    }
  }, [open, client]);

  const set = (k: keyof Client, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name.trim()) return setError('Give the client a name.');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setError('That email address doesn’t look right.');
    onSave({ ...form, name: form.name.trim(), contactName: form.contactName.trim() || form.name.trim() });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Edit client' : 'New client'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>{client ? 'Save changes' : 'Add client'}</Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Business or client name" className="sm:col-span-2">
          <Input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Harbourside Dental" />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0400 000 000" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="accounts@example.com" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea rows={2} className="min-h-20" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder={'Street\nSuburb, State, Postcode'} />
        </Field>
        <Field label="Private notes" hint="Only you see these — access, pets, preferences." className="sm:col-span-2">
          <Textarea rows={2} className="min-h-20" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger-600 sm:col-span-2">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
