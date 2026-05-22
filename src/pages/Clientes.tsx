import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Phone, Mail, Trash2, Edit2, X,
  ShoppingBag, TrendingUp, Users, RepeatIcon,
  ChevronRight, Calendar, MapPin, FileText, CreditCard,
  Send, Clock, Cake,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SOURCES = [
  'Instagram', 'WhatsApp Easy Imports', 'WhatsApp João',
  'Indicação', 'Facebook', 'TikTok', 'Google', 'Loja Física', 'Outro',
];

const INACTIVE_MONTHS = 3;

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

type FormData = { name: string; email: string; phone: string; cpf: string; city: string; notes: string; source: string; birthday: string };
const emptyForm = (): FormData => ({ name: '', email: '', phone: '', cpf: '', city: '', notes: '', source: 'Instagram', birthday: '' });

function norm(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function getInitials(name: string) {
  return (name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function toWhatsApp(phone: string) {
  return phone.replace(/\D/g, '').replace(/^0/, '').replace(/^(\d{2})/, '55$1');
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-teal-500',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[((name || '').charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

const CustomerForm = ({ data, onChange }: { data: FormData; onChange: (d: FormData) => void }) => (
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
        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
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

const TYPE_BADGE: Record<string, string> = {
  venda: 'bg-green-100 text-green-700',
  troca: 'bg-purple-100 text-purple-700',
  compra: 'bg-blue-100 text-blue-700',
};
const TYPE_LABEL: Record<string, string> = { venda: 'Venda', troca: 'Troca', compra: 'Compra' };

export const Clientes: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm());

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm());

  const [detailCustomer, setDetailCustomer] = useState<any | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showMassModal, setShowMassModal] = useState(false);
  const [massMessage, setMassMessage] = useState('Olá {nome}! Temos novidades incríveis aqui na Easy Imports. Faz tempo que não te vemos por aqui! 😊');
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('🎂 Feliz aniversário, {nome}! Aqui é a equipe da Easy Imports desejando um dia muito especial pra você! 🥳\n\nComo presente de aniversário, preparamos um cupom exclusivo de 5% de desconto na sua próxima compra aqui na nossa loja! 🎁\n\nBasta mencionar este contato na hora da compra. Aproveite! 😊');
  const [birthdayMonthOffset, setBirthdayMonthOffset] = useState(0);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [custs, sales] = await Promise.all([
        dataService.getCustomers(),
        dataService.getSales(),
      ]);
      setCustomers(custs || []);
      setAllSales(sales || []);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const salesByCustomer = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const sale of allSales) {
      const cid = sale.customers?.id || sale.customer_id;
      if (cid) {
        if (!map[cid]) map[cid] = [];
        map[cid].push(sale);
      }
    }
    return map;
  }, [allSales]);

  function getSalesForCustomer(c: any): any[] {
    const byId = salesByCustomer[c.id] || [];
    if (byId.length > 0) return byId;
    return allSales.filter(s => {
      const nameMatch = norm(s.customer_name) === norm(c.name);
      const phoneMatch = c.phone && s.customer_phone && s.customer_phone === c.phone;
      return nameMatch || phoneMatch;
    });
  }

  // Enrich + sort alphabetically
  const enriched = useMemo(() => {
    return customers
      .map(c => {
        const sales = getSalesForCustomer(c);
        const totalSpent = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
        const lastSale = sales.slice().sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        return { ...c, _sales: sales, _totalSpent: totalSpent, _lastSale: lastSale };
      })
      .sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  }, [customers, salesByCustomer]);

  const inactiveCustomers = enriched.filter(c =>
    c._sales.length === 0 ||
    (c._lastSale && daysSince(c._lastSale.created_at) > INACTIVE_MONTHS * 30)
  );

  const filtered = (showInactive ? inactiveCustomers : enriched).filter(c =>
    norm(c.name).includes(norm(searchTerm)) ||
    (c.phone || '').includes(searchTerm) ||
    norm(c.email || '').includes(norm(searchTerm)) ||
    (c.cpf || '').includes(searchTerm)
  );

  // Global stats
  const totalRevenue    = enriched.reduce((a, c) => a + c._totalSpent, 0);
  const avgPerCustomer  = enriched.length > 0 ? totalRevenue / enriched.length : 0;
  const activeCustomers = enriched.filter(c => c._sales.length > 0).length;

  // LTV: average days between consecutive purchases across all customers
  const ltvDays = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const c of enriched) {
      if (c._sales.length < 2) continue;
      const dates = c._sales
        .map((s: any) => new Date(s.created_at).getTime())
        .sort((a: number, b: number) => a - b);
      let sum = 0;
      for (let i = 1; i < dates.length; i++) {
        sum += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
      }
      total += sum / (dates.length - 1);
      count++;
    }
    return count > 0 ? Math.round(total / count) : null;
  }, [enriched]);

  function getBirthdayMonth(birthday: string | null | undefined): number | null {
    if (!birthday) return null;
    const s = String(birthday).trim();
    // YYYY-MM-DD ou ISO (ex: "1990-05-15" ou "1990-05-15T03:00:00+00:00")
    const isoMatch = s.match(/^\d{4}-(\d{2})/);
    if (isoMatch) return parseInt(isoMatch[1], 10);
    // DD/MM/YYYY
    const brMatch = s.match(/^\d{2}\/(\d{2})/);
    if (brMatch) return parseInt(brMatch[1], 10);
    return null;
  }
  function getBirthdayDay(birthday: string | null | undefined): number {
    if (!birthday) return 0;
    const s = String(birthday).trim();
    const isoMatch = s.match(/^\d{4}-\d{2}-(\d{2})/);
    if (isoMatch) return parseInt(isoMatch[1], 10);
    const brMatch = s.match(/^(\d{2})\//);
    if (brMatch) return parseInt(brMatch[1], 10);
    return 0;
  }

  const customersWithBirthday = useMemo(() => customers.filter(c => c.birthday), [customers]);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + birthdayMonthOffset);
    return d;
  }, [birthdayMonthOffset]);
  const targetMonth = targetDate.getMonth() + 1;

  const birthdayCustomers = useMemo(() =>
    customers
      .filter(c => {
        const month = getBirthdayMonth(c.birthday);
        return month !== null && month === targetMonth;
      })
      .sort((a, b) => getBirthdayDay(a.birthday) - getBirthdayDay(b.birthday)),
    [customers, targetMonth]
  );

  function formatLtv(days: number | null): string {
    if (days === null) return '—';
    if (days < 7)  return `${days}d`;
    if (days < 30) return `${Math.round(days / 7)} sem.`;
    if (days < 365) return `${Math.round(days / 30)} meses`;
    return `${Math.round(days / 365)} ano${Math.round(days / 365) > 1 ? 's' : ''}`;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Informe o nome do cliente.'); return; }
    try {
      setIsSaving(true);
      const created = await dataService.addCustomer(formData);
      try {
        await dataService.addLead({
          name: formData.name, phone: formData.phone || '',
          email: formData.email || '', source: formData.source || 'Cadastro Direto',
          notes: formData.notes || '', status: 'closed',
        });
      } catch { /* ignore */ }
      if (created.__migration_needed) {
        toast.success('Cliente salvo! Endereço/CPF não foram incluídos — execute a migração SQL em Configurações.');
      } else {
        toast.success('Cliente cadastrado!');
      }
      setIsAddOpen(false); setFormData(emptyForm()); fetchAll();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (customer: any) => {
    setEditingId(customer.id);
    setEditForm({ name: customer.name || '', email: customer.email || '', phone: customer.phone || '',
      cpf: customer.cpf || '', city: customer.city || '', notes: customer.notes || '', source: customer.source || 'Instagram', birthday: customer.birthday || '' });
    setIsEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.name.trim()) { toast.error('O nome não pode ficar vazio.'); return; }
    try {
      setIsEditSaving(true);
      const updated = await dataService.updateCustomer(editingId, editForm);
      if (updated.__migration_needed) {
        toast.success('Atualizado! Endereço/CPF não foram incluídos — execute a migração SQL.');
      } else {
        toast.success('Cliente atualizado!');
      }
      setIsEditOpen(false); setEditingId(null); fetchAll();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const customer = enriched.find(c => c.id === id);
      await dataService.deleteCustomer(id);
      try {
        const leads = await dataService.getLeads();
        const match = leads.find((l: any) =>
          l.status === 'closed' && (
            (customer?.phone && l.phone && l.phone === customer.phone) ||
            l.name?.toLowerCase() === name.toLowerCase()
          )
        );
        if (match) await dataService.deleteLead(match.id);
      } catch { /* ignore sync errors */ }
      toast.success('Cliente removido!');
      fetchAll();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  // ── Customer Card ─────────────────────────────────────────────────────────

  const CustomerCard = ({ c }: { c: any }) => {
    const initials = getInitials(c.name);
    const color = avatarColor(c.name);
    const salesCount = c._sales.length;
    const lastDate = c._lastSale
      ? new Date(c._lastSale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md group">
        <div className="flex items-start gap-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0', color)}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 truncate">{c.name}</p>
            {c.city && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-neutral-400 flex-shrink-0" />
                <p className="text-xs text-neutral-400 truncate">{c.city}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-neutral-50 rounded-xl p-2 text-center">
            <p className="text-base font-black text-neutral-900">{salesCount}</p>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wide mt-0.5">
              {salesCount === 1 ? 'Compra' : 'Compras'}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-2 text-center col-span-2">
            <p className="text-base font-black text-neutral-900">{formatCurrency(c._totalSpent)}</p>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wide mt-0.5">Total gasto</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {lastDate ? (
              <p className="text-[10px] text-neutral-400">
                Última compra: <span className="font-bold text-neutral-500">{lastDate}</span>
              </p>
            ) : (
              <p className="text-[10px] text-neutral-300 italic">Sem compras registradas</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {c.phone && (
              <a
                href={`https://wa.me/${toWhatsApp(c.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Contatar"
              >
                <Phone size={13} />
              </a>
            )}
            <button
              onClick={() => setDetailCustomer(c)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Ver histórico"
            >
              <FileText size={13} />
            </button>
            <button
              onClick={() => handleOpenEdit(c)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => handleDelete(c.id, c.name)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remover"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Detail Panel ──────────────────────────────────────────────────────────

  const DetailPanel = ({ c }: { c: any }) => {
    const initials = getInitials(c.name);
    const color = avatarColor(c.name);
    const sales = c._sales.slice().sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex bg-neutral-900/40 backdrop-blur-md" onClick={() => setDetailCustomer(null)}>
        <div className="hidden sm:flex flex-1" />
        <div
          className="w-full sm:max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center gap-4 z-10">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0', color)}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-neutral-900 truncate">{c.name}</h2>
              {c.city && <p className="text-sm text-neutral-400 truncate">{c.city}</p>}
            </div>
            <button
              onClick={() => setDetailCustomer(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-neutral-900">{sales.length}</p>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide mt-0.5">Compras</p>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-3 text-center col-span-2">
                <p className="text-2xl font-black text-neutral-900">{formatCurrency(c._totalSpent)}</p>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide mt-0.5">Total gasto</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contato</p>
              <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                {c.phone && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-neutral-800 flex-1">{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mail size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-neutral-800 truncate">{c.email}</span>
                  </div>
                )}
                {c.cpf && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <CreditCard size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-neutral-800">{c.cpf}</span>
                  </div>
                )}
                {c.city && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <MapPin size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-neutral-800 truncate">{c.city}</span>
                  </div>
                )}
                {c.birthday && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-neutral-800">
                      {new Date(c.birthday + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {c.created_at && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm text-neutral-500">
                      Cliente desde {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
              {c.notes && (
                <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-neutral-600 mb-1">Observações</p>
                  <p className="text-sm text-neutral-700">{c.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                Histórico de compras ({sales.length})
              </p>
              {sales.length === 0 ? (
                <div className="bg-neutral-50 rounded-2xl px-4 py-8 flex flex-col items-center gap-2 text-center">
                  <ShoppingBag size={28} className="text-neutral-300" />
                  <p className="text-sm text-neutral-400 font-medium">Nenhuma compra registrada</p>
                  <p className="text-xs text-neutral-300">As vendas aparecerão aqui automaticamente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sales.map((s: any) => {
                    const stype = s.sale_type || (s.incoming_name?.trim() ? 'troca' : 'venda');
                    const dateStr = s.created_at
                      ? new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    return (
                      <div key={s.id} className="bg-neutral-50 rounded-2xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-neutral-500">
                                {s.sale_number || `#${s.id?.slice(0,6).toUpperCase()}`}
                              </span>
                              <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full', TYPE_BADGE[stype] || TYPE_BADGE.venda)}>
                                {TYPE_LABEL[stype] || 'Venda'}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-neutral-900 mt-1 truncate">{s.product_name}</p>
                            {s.incoming_name?.trim() && (
                              <p className="text-xs text-neutral-400">Troca: {s.incoming_name}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-neutral-900">{formatCurrency(Number(s.total_amount))}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">{dateStr}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                          {s.payment_method && (
                            <span className="bg-neutral-100 px-2 py-0.5 rounded-full font-medium">{s.payment_method}</span>
                          )}
                          {s.product_condition && (
                            <span className="bg-neutral-100 px-2 py-0.5 rounded-full font-medium">{s.product_condition}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-neutral-100 px-6 py-4 flex gap-3">
            {c.phone && (
              <a
                href={`https://wa.me/${toWhatsApp(c.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors"
              >
                <Phone size={16} />
                Contatar
              </a>
            )}
            <button
              onClick={() => { setDetailCustomer(null); handleOpenEdit(c); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm transition-colors"
            >
              <Edit2 size={16} />
              Editar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-neutral-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {detailCustomer && <DetailPanel c={detailCustomer} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Clientes</h2>
          <p className="text-neutral-500">
            <strong>{customers.length}</strong> cliente{customers.length !== 1 ? 's' : ''} cadastrado{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => { setFormData(emptyForm()); setIsAddOpen(true); }}>
          Novo Cliente
        </Button>
      </div>

      {/* Stats — 4 cards */}
      {customers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total</p>
              <p className="text-xl sm:text-2xl font-black text-neutral-900 leading-none">{customers.length}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">{activeCustomers} com compras</p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest">Faturamento</p>
              <p className="text-base sm:text-xl font-black text-neutral-900 leading-none">{formatCurrency(totalRevenue)}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400">clientes</p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={16} className="text-primary-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ticket</p>
              <p className="text-base sm:text-xl font-black text-neutral-900 leading-none">{formatCurrency(avgPerCustomer)}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400">por cliente</p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <RepeatIcon size={16} className="text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-widest">LTV</p>
              <p className="text-xl sm:text-2xl font-black text-neutral-900 leading-none">{formatLtv(ltvDays)}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400">
                {ltvDays !== null ? 'retorno médio' : 'insuficiente'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, e-mail ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm font-bold transition-all whitespace-nowrap',
              showInactive
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-amber-300'
            )}
          >
            <Clock size={14} />
            Inativos {inactiveCustomers.length > 0 && <span className="bg-amber-200 text-amber-800 rounded-full px-1.5 py-0.5 text-[11px]">{inactiveCustomers.length}</span>}
          </button>
          <button
            onClick={() => setShowMassModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-neutral-200 bg-white text-sm font-bold text-neutral-600 hover:border-primary/40 hover:text-neutral-900 transition-all whitespace-nowrap"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Mensagem em </span>Massa
          </button>
          <button
            onClick={() => setShowBirthdayModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-amber-200 bg-amber-50 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-all whitespace-nowrap relative"
          >
            <Cake size={14} />
            Aniversariantes
            {birthdayCustomers.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {birthdayCustomers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cards grid — alphabetical */}
      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
            <Users size={28} className="text-neutral-300" />
          </div>
          <div>
            <p className="font-bold text-neutral-600">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              {searchTerm ? 'Tente outros termos.' : 'Adicione seu primeiro cliente.'}
            </p>
          </div>
          {!searchTerm && (
            <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddOpen(true)}>
              Adicionar Cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => <CustomerCard key={c.id} c={c} />)}
        </div>
      )}

      {/* Modal Adicionar */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Cadastrar Novo Cliente" maxWidth="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <CustomerForm data={formData} onChange={setFormData} />
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsAddOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit">Salvar Cliente</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Cliente" maxWidth="lg">
        <form onSubmit={handleEditSave} className="space-y-4">
          <CustomerForm data={editForm} onChange={setEditForm} />
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsEditOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isEditSaving} type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Aniversariantes do Mês */}
      {showBirthdayModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-md"
          onClick={() => { setShowBirthdayModal(false); setBirthdayMonthOffset(0); }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-neutral-100 flex-shrink-0 bg-amber-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cake size={18} className="text-amber-500" />
                  <h2 className="font-black text-lg text-neutral-900">Aniversariantes</h2>
                </div>
                <button onClick={() => { setShowBirthdayModal(false); setBirthdayMonthOffset(0); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              {/* Month navigation */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setBirthdayMonthOffset(o => o - 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border-2 border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors font-black text-base flex-shrink-0"
                >
                  ←
                </button>
                <div className="flex-1 text-center">
                  <p className="font-black text-sm text-amber-800">
                    {targetDate.toLocaleString('pt-BR', { month: 'long' }).replace(/^./, c => c.toUpperCase())} {targetDate.getFullYear()}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <span className="text-xs text-amber-600">
                      {birthdayCustomers.length} aniversariante{birthdayCustomers.length !== 1 ? 's' : ''}
                    </span>
                    {birthdayMonthOffset !== 0 && (
                      <button
                        onClick={() => setBirthdayMonthOffset(0)}
                        className="text-[10px] font-bold text-amber-500 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full transition-colors"
                      >
                        mês atual
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setBirthdayMonthOffset(o => o + 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border-2 border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors font-black text-base flex-shrink-0"
                >
                  →
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Mensagem de Parabéns</label>
                <textarea
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none"
                  rows={4}
                  value={birthdayMessage}
                  onChange={e => setBirthdayMessage(e.target.value)}
                />
                <p className="text-[10px] text-neutral-400 mt-1">Use {'{nome}'} para personalizar com o primeiro nome</p>
              </div>

              {birthdayCustomers.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <Cake size={36} className="text-neutral-200" />
                  <div>
                    <p className="font-bold text-neutral-500">Nenhum aniversariante em {targetDate.toLocaleString('pt-BR', { month: 'long' })}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {customersWithBirthday.length === 0
                        ? 'Edite os clientes e preencha a data de nascimento para aparecerem aqui.'
                        : 'Use as setas ← → para navegar entre os meses.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                    Clientes ({birthdayCustomers.length})
                  </p>
                  <div className="space-y-1.5">
                    {birthdayCustomers.map(c => {
                      const dayNum = getBirthdayDay(c.birthday);
                      const now = new Date();
                      const isToday = birthdayMonthOffset === 0 && dayNum === now.getDate();
                      return (
                        <div key={c.id} className={cn(
                          'flex items-center gap-3 rounded-xl px-4 py-2.5 border',
                          isToday ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-transparent'
                        )}>
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0', avatarColor(c.name))}>
                            {getInitials(c.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-neutral-900 truncate">{c.name}</p>
                              {isToday && <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Hoje! 🎂</span>}
                            </div>
                            <p className="text-xs text-neutral-400">
                              {`Dia ${dayNum}`}{c.phone ? ` · ${c.phone}` : ''}
                            </p>
                          </div>
                          {c.phone ? (
                            <a
                              href={`https://wa.me/${toWhatsApp(c.phone)}?text=${encodeURIComponent(birthdayMessage.replace(/\{nome\}/g, c.name.split(' ')[0]))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex-shrink-0"
                            >
                              <Send size={11} />
                              Enviar
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-400 flex-shrink-0">Sem telefone</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Mensagem em Massa */}
      {showMassModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-md"
          onClick={() => setShowMassModal(false)}
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-black text-lg text-neutral-900">Mensagem em Massa</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Use {'{nome}'} para personalizar com o nome do cliente</p>
              </div>
              <button onClick={() => setShowMassModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Mensagem</label>
                <textarea
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
                  rows={4}
                  value={massMessage}
                  onChange={e => setMassMessage(e.target.value)}
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                  Clientes com WhatsApp ({filtered.filter(c => c.phone).length})
                </p>
                <div className="space-y-1.5">
                  {filtered.filter(c => c.phone).map(c => (
                    <div key={c.id} className="flex items-center gap-3 bg-neutral-50 rounded-xl px-4 py-2.5">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0', avatarColor(c.name))}>
                        {getInitials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">{c.name}</p>
                        <p className="text-xs text-neutral-400">{c.phone}</p>
                      </div>
                      <a
                        href={`https://wa.me/${toWhatsApp(c.phone)}?text=${encodeURIComponent(massMessage.replace(/\{nome\}/g, c.name.split(' ')[0]))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-colors flex-shrink-0"
                      >
                        <Send size={11} />
                        Enviar
                      </a>
                    </div>
                  ))}
                  {filtered.filter(c => c.phone).length === 0 && (
                    <p className="text-sm text-neutral-400 text-center py-4">Nenhum cliente com telefone cadastrado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Clientes;
