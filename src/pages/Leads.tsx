import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Phone, Calendar, Trash2, X,
  CheckCircle2, TrendingUp, Users, Zap, ArrowRight, GripVertical,
} from 'lucide-react';
import {
  DndContext, DragOverlay,
  PointerSensor, TouchSensor,
  useSensor, useSensors,
  rectIntersection,
  useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toWhatsApp(phone: string) {
  return phone.replace(/\D/g, '').replace(/^0/, '').replace(/^(\d{2})/, '55$1');
}
function getInitials(name: string) {
  return (name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

const AVATAR_COLORS = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-rose-500',
  'bg-amber-500','bg-cyan-500','bg-fuchsia-500','bg-teal-500',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[((name||'').charCodeAt(0)||0) % AVATAR_COLORS.length];
}

const SOURCES = ['Instagram','WhatsApp','Google','Indicação','Facebook','TikTok','Loja Física','Outro'];

// ─── Stages ───────────────────────────────────────────────────────────────────
const STAGES = [
  { id:'new',         label:'Novo Lead',        accent:'#3B82F6', bar:'bg-blue-500',    count:'bg-blue-100 text-blue-700',    col:'bg-blue-50/40'    },
  { id:'contacting',  label:'Primeiro Contato', accent:'#F97316', bar:'bg-orange-500',  count:'bg-orange-100 text-orange-700',col:'bg-orange-50/40'  },
  { id:'interested',  label:'Interessado',      accent:'#EAB308', bar:'bg-yellow-400',  count:'bg-yellow-100 text-yellow-800',col:'bg-yellow-50/40'  },
  { id:'proposal',    label:'Proposta',         accent:'#8B5CF6', bar:'bg-violet-500',  count:'bg-violet-100 text-violet-700',col:'bg-violet-50/40'  },
  { id:'negotiating', label:'Negociando',       accent:'#EC4899', bar:'bg-pink-500',    count:'bg-pink-100 text-pink-700',    col:'bg-pink-50/40'    },
  { id:'closed',      label:'Cliente',          accent:'#10B981', bar:'bg-emerald-500', count:'bg-emerald-100 text-emerald-700', col:'bg-emerald-50/40'},
] as const;

type StageId = typeof STAGES[number]['id'];
function getStage(id: string) { return STAGES.find(s => s.id === id) ?? STAGES[0]; }

// ─── Card visual ──────────────────────────────────────────────────────────────
const CardContent = ({
  lead, isDragging = false, onDelete, onDetail,
}: {
  lead: any; isDragging?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
  onDetail?: () => void;
}) => {
  const stage = getStage(lead.status);
  const isClient = lead.status === 'closed';

  return (
    <div
      onClick={!isDragging ? onDetail : undefined}
      className={cn(
        'bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all duration-150 group select-none',
        isDragging
          ? 'shadow-2xl border-primary rotate-1 scale-[1.03] opacity-95'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md',
        isClient && !isDragging && 'border-l-4 border-l-emerald-400',
      )}
    >
      {/* Colored accent line at top */}
      <div className="h-[3px] w-full" style={{ backgroundColor: stage.accent }} />

      <div className="p-3.5">
        {/* Avatar + name + grip */}
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0',
            avatarColor(lead.name),
          )}>
            {getInitials(lead.name)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 text-sm leading-tight truncate">{lead.name}</p>
            {lead.source && (
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">{lead.source}</span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isDragging && onDelete && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onDelete(e); }}
                className="p-1 opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-400 transition-all rounded"
              >
                <Trash2 size={12} />
              </button>
            )}
            <div className="p-1 text-neutral-200 group-hover:text-neutral-400 transition-colors">
              <GripVertical size={13} />
            </div>
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <p className="mt-2.5 text-[11px] text-neutral-500 bg-neutral-50 rounded-xl px-2.5 py-2 line-clamp-2 leading-relaxed">
            {lead.notes}
          </p>
        )}

        {/* Footer */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {lead.phone ? (
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 min-w-0 truncate">
              <Phone size={11} className="text-neutral-400 flex-shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          ) : <div />}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {lead.created_at && (
              <span className="text-[10px] text-neutral-400 font-medium">{fmtDate(lead.created_at)}</span>
            )}
            {isClient && (
              <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                <CheckCircle2 size={9} />
                Cliente
              </span>
            )}
          </div>
        </div>

        {/* Contact button — system identity, not WhatsApp green */}
        {!isDragging && lead.phone && (
          <a
            href={`https://wa.me/${toWhatsApp(lead.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-[11px] font-bold text-neutral-600 bg-neutral-100 hover:bg-primary hover:text-neutral-900 transition-all"
          >
            <Phone size={11} />
            Contatar
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Draggable card ────────────────────────────────────────────────────────────
const DraggableCard = ({ lead, onDelete, onDetail }: {
  lead: any;
  onDelete: (e: React.MouseEvent) => void;
  onDetail: () => void;
}) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={{ opacity: isDragging ? 0.25 : 1, cursor: 'grab' }}>
      <CardContent lead={lead} onDelete={onDelete} onDetail={onDetail} />
    </div>
  );
};

// ─── Column ───────────────────────────────────────────────────────────────────
const KanbanColumn = ({ stage, leads, activeId, onDelete, onDetail }: {
  stage: typeof STAGES[number];
  leads: any[];
  activeId: string | null;
  onDelete: (id: string, name: string) => void;
  onDetail: (lead: any) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex-shrink-0 w-[268px] flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center gap-2 px-0.5">
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', stage.bar)} />
        <p className="text-xs font-black text-neutral-700 uppercase tracking-wider flex-1 truncate">
          {stage.label}
        </p>
        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums', stage.count)}>
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2.5 rounded-2xl p-2 min-h-[500px] border-2 transition-all duration-150',
          isOver
            ? 'border-primary border-dashed bg-primary/5'
            : 'border-transparent bg-neutral-100/60',
        )}
      >
        {leads.map(lead => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            onDelete={(e) => { e.stopPropagation(); onDelete(lead.id, lead.name); }}
            onDetail={() => onDetail(lead)}
          />
        ))}
        {leads.length === 0 && !activeId && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-10">
            <div className="w-8 h-8 rounded-xl bg-neutral-200 flex items-center justify-center">
              <Plus size={14} className="text-neutral-400" />
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">Arraste para cá</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Detail panel ─────────────────────────────────────────────────────────────
const LeadDetail = ({ lead, onClose, onMove, onDelete }: {
  lead: any;
  onClose: () => void;
  onMove: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
}) => {
  const stage = getStage(lead.status);
  const initials = getInitials(lead.name);
  const color = avatarColor(lead.name);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-neutral-900/40 backdrop-blur-sm" />
      <div
        className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: stage.accent }} />

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-100">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0', color)}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-neutral-900 truncate">{lead.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn('w-2 h-2 rounded-full', stage.bar)} />
              <span className="text-xs font-bold text-neutral-500">{stage.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Info */}
          <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            {lead.phone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-800 flex-1 truncate">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-neutral-400 flex-shrink-0">Email</span>
                <span className="text-sm font-medium text-neutral-800 truncate">{lead.email}</span>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Zap size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-600">Origem: <strong>{lead.source}</strong></span>
              </div>
            )}
            {lead.created_at && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-500">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                </span>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Interesse / Notas</p>
              <p className="text-sm text-neutral-700 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {/* Move stage */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Mover para etapa</p>
            {STAGES.filter(s => s.id !== lead.status).map(s => (
              <button
                key={s.id}
                onClick={() => { onMove(lead.id, s.id); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-left transition-colors group"
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', s.bar)} />
                <span className="text-sm font-bold text-neutral-700 flex-1">{s.label}</span>
                <ArrowRight size={14} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 p-4 flex gap-2.5">
          {lead.phone && (
            <a
              href={`https://wa.me/${toWhatsApp(lead.phone)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors"
            >
              <Phone size={16} />
              Contatar
            </a>
          )}
          <button
            onClick={() => { onDelete(lead.id, lead.name); onClose(); }}
            className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 font-bold text-sm transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<any | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'Instagram', notes: '', status: 'new' as StageId,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getLeads();
      setLeads(data || []);
    } catch (e: any) {
      toast.error('Erro ao carregar leads: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const getByStage = (stageId: string) => {
    const q = searchTerm.toLowerCase();
    return leads.filter(l => {
      if (l.status !== stageId) return false;
      if (!q) return true;
      return (
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(searchTerm) ||
        l.email?.toLowerCase().includes(q) ||
        l.source?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q)
      );
    });
  };

  // ── Sync helpers ────────────────────────────────────────────────────────────

  const syncCreateCustomer = useCallback(async (lead: { name: string; phone?: string; email?: string; notes?: string }) => {
    try {
      await dataService.addCustomer({
        name: lead.name,
        phone: lead.phone || '',
        email: lead.email || '',
        cpf: '',
        city: '',
        notes: lead.notes || '',
      });
    } catch { /* ignore duplicates or schema errors */ }
  }, []);

  const syncDeleteCustomer = useCallback(async (lead: any) => {
    if (lead.status !== 'closed') return;
    try {
      const customers = await dataService.getCustomers();
      const match = customers.find((c: any) =>
        (lead.phone && c.phone && c.phone === lead.phone) ||
        c.name?.toLowerCase() === lead.name?.toLowerCase()
      );
      if (match) await dataService.deleteCustomer(match.id);
    } catch { /* ignore */ }
  }, []);

  // ── Move lead ───────────────────────────────────────────────────────────────

  const moveLead = useCallback(async (id: string, newStatus: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.status === newStatus) return;

    if (newStatus === 'closed') {
      await syncCreateCustomer(lead);
      toast.success(`${lead.name} virou cliente! 🎉`, { duration: 3000 });
    }

    try {
      await dataService.updateLead(id, { status: newStatus });
      fetchLeads();
    } catch (e: any) {
      toast.error('Erro ao mover lead: ' + e.message);
    }
  }, [leads, fetchLeads, syncCreateCustomer]);

  // ── Delete lead ─────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"?`)) return;
    const lead = leads.find(l => l.id === id);
    try {
      await dataService.deleteLead(id);
      if (lead) await syncDeleteCustomer(lead);
      toast.success('Lead removido!');
      fetchLeads();
    } catch (e: any) {
      toast.error('Erro ao remover: ' + e.message);
    }
  }, [leads, fetchLeads, syncDeleteCustomer]);

  // ── Add lead ────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome.'); return; }
    try {
      setIsSaving(true);
      await dataService.addLead({ ...form });
      // If created directly as "Cliente", sync to Clientes
      if (form.status === 'closed') {
        await syncCreateCustomer(form);
      }
      toast.success('Lead adicionado!');
      setIsAddOpen(false);
      setForm({ name: '', phone: '', email: '', source: 'Instagram', notes: '', status: 'new' });
      fetchLeads();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Drag ────────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const targetStageId = String(over.id);
    if (STAGES.some(s => s.id === targetStageId)) {
      moveLead(String(active.id), targetStageId);
    }
  }, [moveLead]);

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  // Stats
  const totalOpen   = leads.filter(l => l.status !== 'closed').length;
  const totalClosed = leads.filter(l => l.status === 'closed').length;
  const convRate    = leads.length > 0 ? Math.round((totalClosed / leads.length) * 100) : 0;
  const thisMonth   = leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-5 pb-10">
        <div className="h-8 w-48 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="flex gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="flex-shrink-0 w-[268px] h-96 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-10">
      {detailLead && (
        <LeadDetail
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onMove={moveLead}
          onDelete={handleDelete}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">CRM de Leads</h2>
          <p className="text-sm text-neutral-400">Arraste os cards entre etapas para avançar no funil</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsAddOpen(true)}>
          Novo Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users,       label: 'Em aberto',  value: totalOpen,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { icon: CheckCircle2,label: 'Clientes',    value: totalClosed,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: TrendingUp,  label: 'Conversão',  value: `${convRate}%`,   color: 'text-violet-600',  bg: 'bg-violet-50'  },
          { icon: Zap,         label: 'Este mês',   value: thisMonth,        color: 'text-primary-700', bg: 'bg-primary/10' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', item.bg)}>
              <item.icon size={16} className={item.color} />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-xl font-black text-neutral-900 leading-none mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone, origem..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-neutral-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }}>
          {STAGES.map(stage => (
            <div key={stage.id} style={{ scrollSnapAlign: 'start' }}>
              <KanbanColumn
                stage={stage}
                leads={getByStage(stage.id)}
                activeId={activeId}
                onDelete={handleDelete}
                onDetail={setDetailLead}
              />
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeLead ? <CardContent lead={activeLead} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Add modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Novo Lead" maxWidth="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nome Completo *" placeholder="Ex: João da Silva" required
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoComplete="off" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="WhatsApp" placeholder="(11) 99999-9999"
              value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} autoComplete="off" />
            <Input label="Email" type="email" placeholder="email@..."
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Origem</label>
              <select className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Etapa inicial</label>
              <select className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={form.status} onChange={e => setForm({...form, status: e.target.value as StageId})}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <Input label="Interesse / Notas" placeholder="Ex: Interessado no iPhone 16 Pro 256GB"
            value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} autoComplete="off" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit">Criar Lead</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
