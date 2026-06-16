import React from 'react';
import { Input } from './ui/Input';
import { CUSTOMER_SOURCES as SOURCES } from '../lib/constants';

/** Campos do cliente — fonte única usada em Clientes e em Vendas (novo cliente na venda) */
export type CustomerFormData = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  city: string;
  notes: string;
  source: string;
  birthday: string;
};

export const emptyCustomerForm = (): CustomerFormData => ({
  name: '', email: '', phone: '', cpf: '', city: '', notes: '', source: 'Instagram', birthday: '',
});

/** Payload pronto para dataService.addCustomer/updateCustomer */
export const customerFormToPayload = (d: CustomerFormData) => ({
  name: d.name.trim(),
  phone: d.phone.trim(),
  email: d.email.trim(),
  cpf: d.cpf.trim(),
  city: d.city.trim(),
  source: d.source,
  birthday: d.birthday || '',
  notes: d.notes.trim(),
});

export const CustomerForm: React.FC<{ data: CustomerFormData; onChange: (d: CustomerFormData) => void }> = ({ data, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="md:col-span-2">
      <Input label="Nome Completo *" placeholder="Ex: Ricardo Santos" required
        value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} autoComplete="off" />
    </div>
    <Input label="Telefone" placeholder="(11) 99999-9999"
      value={data.phone} onChange={(e) => onChange({ ...data, phone: e.target.value })} autoComplete="off" />
    <Input label="Email" type="email" placeholder="cliente@email.com"
      value={data.email} onChange={(e) => onChange({ ...data, email: e.target.value })} autoComplete="off" />
    <Input label="CPF / CNPJ" placeholder="CPF ou CNPJ"
      value={data.cpf} onChange={(e) => onChange({ ...data, cpf: e.target.value })} autoComplete="off" />
    <Input label="Endereço / Cidade" placeholder="Rua, número, bairro, cidade"
      value={data.city} onChange={(e) => onChange({ ...data, city: e.target.value })} autoComplete="off" />
    <div>
      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Origem</label>
      <select
        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        value={data.source}
        onChange={(e) => onChange({ ...data, source: e.target.value })}
      >
        {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <Input label="Data de Nascimento" type="date"
      value={data.birthday} onChange={(e) => onChange({ ...data, birthday: e.target.value })} />
    <div className="md:col-span-2">
      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Observações</label>
      <textarea
        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all resize-none"
        rows={3}
        placeholder="Informações adicionais sobre o cliente..."
        value={data.notes}
        onChange={(e) => onChange({ ...data, notes: e.target.value })}
      />
    </div>
  </div>
);
