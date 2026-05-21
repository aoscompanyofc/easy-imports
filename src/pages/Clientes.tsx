import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, Phone, Mail, Trash2, Edit2, X,
  MessageCircle, ShoppingBag, TrendingUp, Users,
  ChevronRight, Calendar, MapPin, FileText, CreditCard, GripVertical,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ORDER_KEY = 'easy-imports-clientes-order';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FormData = { name: string; email: string; phone: string; cpf: string; city: string; notes: string };
const emptyForm = (): FormData => ({ name: '', email: '', phone: '', cpf: '', city: '', notes: '' });

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
  const code = (name || '').charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const CustomerForm = ({ data, onChange }: { data: FormData; onChange: (d: FormData) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="md:col-span-2">
      <Input label="Nome Completo *" placeholder="Ex: Ricardo Santos" required
        value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} autoComplete="off" />
    </div>
    <Input label="WhatsApp" placeholder="(11) 99999-9999"
      value={data.phone} onChange={(e) => onChange({ ...data, phone: e.target.value })} autoComplete="off" />
    <Input label="Email" type="email" placeholder="cliente@email.com"
      value={data.email} onChange={(e) => onChange({ ...data, email: e.target.value })} autoComplete="off" />
    <Input label="CPF / CNPJ" placeholder="CPF ou CNPJ"
      value={data.cpf} onChange={(e) => onChange({ ...data, cpf: e.target.value })} autoComplete="off" />
    <Input label="Endereço / Cidade" placeholder="Rua, número, bairro, cidade"
      value={data.city} onChange={(e) => onChange({ ...data, city: e.target.value })} autoComplete="off" />
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
  const [order, setOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch { return []; }
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm());

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm());

  const [detailCustomer, setDetailCustomer] = useState<any | null>(null);

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

  // Build per-customer sales lookup
  const salesByCustomer = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const sale of allSales) {
      // Primary: customer_id FK (via the embedded `customers` relation)
      const cid = sale.customers?.id || sale.customer_id;
      if (cid) {
        if (!map[cid]) map[cid] = [];
        map[cid].push(sale);
      }
    }
    return map;
  }, [allSales]);

  // For each customer, get their sales (by ID, then fallback by name)
  function getSalesForCustomer(c: any): any[] {
    const byId = salesByCustomer[c.id] || [];
    if (byId.length > 0) return byId;
    // Fallback: match by name + phone
    return allSales.filter(s => {
      const nameMatch = norm(s.customer_name) === norm(c.name);
      const phoneMatch = c.phone && s.customer_phone && s.customer_phone === c.phone;
      return nameMatch || phoneMatch;
    });
  }

  const enriched = useMemo(() => {
    const base = customers.map(c => {
      const sales = getSalesForCustomer(c);
      const totalSpent = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
      const lastSale = sales.slice().sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      return { ...c, _sales: sales, _totalSpent: totalSpent, _lastSale: lastSale };
    });
    if (order.length === 0) return base;
    const map: Record<string, any> = {};
    for (const c of base) map[c.id] = c;
    const sorted = order.filter(id => map[id]).map(id => map[id]);
    const rest = base.filter(c => !order.includes(c.id));
    return [...sorted, ...rest];
  }, [customers, salesByCustomer, order]);

  const filtered = enriched.filter(c =>
    norm(c.name).includes(norm(searchTerm)) ||
    (c.phone || '').includes(searchTerm) ||
    norm(c.email || '').includes(norm(searchTerm)) ||
    (c.cpf || '').includes(searchTerm)
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder(prev => {
      const ids = enriched.map(c => c.id);
      const oldIdx = ids.indexOf(String(active.id));
      const newIdx = ids.indexOf(String(over.id));
      const newOrder = arrayMove(ids, oldIdx, newIdx);
      localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
  }, [enriched]);

  // Global stats
  const totalRevenue = enriched.reduce((a, c) => a + c._totalSpent, 0);
  const avgPerCustomer = enriched.length > 0 ? totalRevenue / enriched.length : 0;
  const activeCustomers = enriched.filter(c => c._sales.length > 0).length;

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Informe o nome do cliente.'); return; }
    try {
      setIsSaving(true);
      await dataService.addCustomer(formData);
      toast.success('Cliente cadastrado!');
      setIsAddOpen(false);
      setFormData(emptyForm());
      fetchAll();
    } catch (error: any) {
      if (error.message === '__MIGRATION_NEEDED__') {
        toast.success('Cliente salvo!');
        setIsAddOpen(false); setFormData(emptyForm()); fetchAll();
      } else {
        toast.error('Erro ao salvar: ' + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (customer: any) => {
    setEditingId(customer.id);
    setEditForm({ name: customer.name || '', email: customer.email || '', phone: customer.phone || '',
      cpf: customer.cpf || '', city: customer.city || '', notes: customer.notes || '' });
    setIsEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.name.trim()) { toast.error('O nome não pode ficar vazio.'); return; }
    try {
      setIsEditSaving(true);
      await dataService.updateCustomer(editingId, editForm);
      toast.success('Cliente atualizado!');
      setIsEditOpen(false); setEditingId(null); fetchAll();
    } catch (error: any) {
      if (error.message === '__MIGRATION_NEEDED__') {
        toast.success('Atualizado!');
        setIsEditOpen(false); setEditingId(null); fetchAll();
      } else {
        toast.error('Erro ao atualizar: ' + error.message);
      }
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await dataService.deleteCustomer(id);
      toast.success('Cliente removido!');
      fetchAll();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  // ── Customer Card (base — reused by DragOverlay too) ─────────────────────

  const CardContent = ({ c, isDragging = false }: { c: any; isDragging?: boolean }) => {
    const initials = getInitials(c.name);
    const color = avatarColor(c.name);
    const salesCount = c._sales.length;
    const lastDate = c._lastSale
      ? new Date(c._lastSale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    return (
      <div className={cn(
        'bg-white border rounded-2xl p-4 transition-all duration-200 group relative',
        isDragging
          ? 'border-primary shadow-2xl shadow-primary/20 rotate-1 scale-105 opacity-90'
          : 'border-neutral-200 hover:border-primary/40 hover:shadow-md',
      )}>
        {/* Drag handle — top right */}
        <div className="absolute top-3 right-3 text-neutral-300 group-hover:text-neutral-400 transition-colors cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </div>

        <div className="flex items-start gap-3 pr-5">
          {/* Avatar */}
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0', color)}>
            {initials}
          </div>

          {/* Info */}
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

        {/* Stats row */}
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

        {/* Last sale + actions */}
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
          {!isDragging && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {c.phone && (
                <a
                  href={`https://wa.me/${toWhatsApp(c.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={13} />
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
                className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
          )}
        </div>
      </div>
    );
  };

  // ── Sortable wrapper ───────────────────────────────────────────────────────

  const CustomerCard = ({ c }: { c: any }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.35 : 1,
      zIndex: isDragging ? 10 : undefined,
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <CardContent c={c} />
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

    return (
      <div className="fixed inset-0 z-50 flex" onClick={() => setDetailCustomer(null)}>
        <div className="flex-1 bg-neutral-900/40 backdrop-blur-sm" />
        <div
          className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
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
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-6">
            {/* Stats */}
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

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contato</p>
              <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                {c.phone && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-neutral-800 flex-1">{c.phone}</span>
                    <a
                      href={`https://wa.me/${toWhatsApp(c.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-green-600 hover:underline"
                    >
                      WhatsApp
                    </a>
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
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Observações</p>
                  <p className="text-sm text-neutral-700">{c.notes}</p>
                </div>
              )}
            </div>

            {/* Purchase history */}
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
                            <span className="bg-neutral-100 px-2 py-0.5 rounded-full font-medium">
                              {s.payment_method}
                            </span>
                          )}
                          {s.product_condition && (
                            <span className="bg-neutral-100 px-2 py-0.5 rounded-full font-medium">
                              {s.product_condition}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="sticky bottom-0 bg-white border-t border-neutral-100 px-6 py-4 flex gap-3">
            {c.phone && (
              <a
                href={`https://wa.me/${toWhatsApp(c.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors"
              >
                <MessageCircle size={16} />
                WhatsApp
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
      </div>
    );
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-32 bg-neutral-100 rounded-xl animate-pulse" />
            <div className="h-4 w-48 bg-neutral-100 rounded-xl animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}
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
      {/* Detail panel */}
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

      {/* Stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-neutral-900 leading-none">{customers.length}</p>
                <p className="text-xs text-neutral-400">{activeCustomers} com compras</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Faturamento</p>
                <p className="text-2xl font-black text-neutral-900 leading-none">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-neutral-400">gerado pelos clientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShoppingBag size={18} className="text-primary-700" />
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ticket médio</p>
                <p className="text-2xl font-black text-neutral-900 leading-none">{formatCurrency(avgPerCustomer)}</p>
                <p className="text-xs text-neutral-400">por cliente</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone, e-mail ou CPF..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
        />
      </div>

      {/* Cards grid with drag-and-drop */}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map(c => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => <CustomerCard key={c.id} c={c} />)}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
            {activeId ? (
              <CardContent c={filtered.find(c => c.id === activeId)!} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
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
    </div>
  );
};

export default Clientes;
