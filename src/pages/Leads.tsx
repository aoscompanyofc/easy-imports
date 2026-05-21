import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, MessageCircle, Calendar, Trash2, X,
  CheckCircle2, Phone, StickyNote, TrendingUp, Users, Zap, Star,
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

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-teal-500',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[((name || '').charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

const SOURCES = ['Instagram', 'WhatsApp', 'Google', 'Indicação', 'Facebook', 'TikTok', 'Loja Física', 'Outro'];

// ─── Stages ──────────────────────────────────────────────────────────────────

const STAGES = [
  {
    id: 'new',
    label: 'Novo Lead',
    emoji: '🔥',
    pill: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-400',
    bar: 'bg-blue-500',
    colBg: 'bg-blue-50/60',
    dot: 'bg-blue-500',
  },
  {
    id: 'contacting',
    label: 'Primeiro Contato',
    emoji: '💬',
    pill: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-400',
    bar: 'bg-orange-500',
    colBg: 'bg-orange-50/60',
    dot: 'bg-orange-500',
  },
  {
    id: 'interested',
    label: 'Interessado',
    emoji: '👀',
    pill: 'bg-yellow-100 text-yellow-800',
    ring: 'ring-yellow-400',
    bar: 'bg-yellow-400',
    colBg: 'bg-yellow-50/60',
    dot: 'bg-yellow-400',
  },
  {
    id: 'proposal',
    label: 'Proposta',
    emoji: '📋',
    pill: 'bg-violet-100 text-violet-700',
    ring: 'ring-violet-400',
    bar: 'bg-violet-500',
    colBg: 'bg-violet-50/60',
    dot: 'bg-violet-500',
  },
  {
    id: 'negotiating',
    label: 'Negociando',
    emoji: '🤝',
    pill: 'bg-pink-100 text-pink-700',
    ring: 'ring-pink-400',
    bar: 'bg-pink-500',
    colBg: 'bg-pink-50/60',
    dot: 'bg-pink-500',
  },
  {
    id: 'closed',
    label: 'Cliente',
    emoji: '⭐',
    pill: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-400',
    bar: 'bg-emerald-500',
    colBg: 'bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
] as const;

type StageId = typeof STAGES[number]['id'];

function getStage(id: string) {
  return STAGES.find(s => s.id === id) ?? STAGES[0];
}

// ─── Card content (shared between board and DragOverlay) ──────────────────────

const CardContent = ({
  lead, isDragging = false, onDelete, onDetail,
}: {
  lead: any; isDragging?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
  onDetail?: () => void;
}) => {
  const initials = getInitials(lead.name);
  const color = avatarColor(lead.name);
  const stage = getStage(lead.status);
  const isClient = lead.status === 'closed';

  const dateStr = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';

  return (
    <div className={cn(
      'bg-white border rounded-2xl p-3.5 select-none',
      isDragging
        ? 'shadow-2xl border-primary rotate-1 scale-105 opacity-95'
        : 'border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-150',
      isClient && !isDragging && 'border-emerald-200 bg-emerald-50/30',
    )}>
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0',
          color,
          isClient && 'ring-2 ring-emerald-400 ring-offset-1',
        )}>
          {isClient ? <Star size={14} className="fill-white" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 text-sm truncate leading-tight">{lead.name}</p>
          <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full', stage.pill)}>
            {lead.source || 'Lead'}
          </span>
        </div>
        {!isDragging && onDelete && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="p-1 text-neutral-300 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-2.5 space-y-1">
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Phone size={11} className="flex-shrink-0 text-neutral-400" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.notes && (
          <div className="flex items-start gap-1.5 text-xs text-neutral-500">
            <StickyNote size={11} className="flex-shrink-0 text-neutral-400 mt-0.5" />
            <span className="truncate">{lead.notes}</span>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
          <Calendar size={10} />
          <span>{dateStr}</span>
        </div>
        {!isDragging && (
          <div className="flex items-center gap-1" onPointerDown={e => e.stopPropagation()}>
            {lead.phone && (
              <a
                href={`https://wa.me/${toWhatsApp(lead.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                title="Abrir WhatsApp"
              >
                <MessageCircle size={13} />
              </a>
            )}
            {isClient && (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} />
                Cliente
              </span>
            )}
          </div>
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
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: 'grab' }}
    >
      <CardContent lead={lead} onDelete={onDelete} onDetail={onDetail} />
    </div>
  );
};

// ─── Droppable column ─────────────────────────────────────────────────────────

const KanbanColumn = ({
  stage, leads, activeId, onDelete, onDetail,
}: {
  stage: typeof STAGES[number];
  leads: any[];
  activeId: string | null;
  onDelete: (id: string, name: string) => void;
  onDetail: (lead: any) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex-shrink-0 w-[272px] flex flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stage.dot)} />
        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex-1 truncate">
          {stage.emoji} {stage.label}
        </span>
        <span className={cn(
          'text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums',
          leads.length > 0 ? stage.pill : 'bg-neutral-100 text-neutral-400',
        )}>
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2.5 rounded-2xl p-2.5 min-h-[520px] transition-all duration-150 border-2',
          isOver
            ? cn('border-dashed border-primary bg-primary/5 scale-[1.01]', stage.ring + ' ring-2')
            : 'border-transparent bg-neutral-100/70',
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
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-neutral-400 text-center py-8">
              Arraste um card<br />para cá
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Lead detail panel ────────────────────────────────────────────────────────

const LeadDetail = ({ lead, stages, onClose, onMove, onDelete }: {
  lead: any; stages: typeof STAGES;
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
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-4 flex items-center gap-3 z-10">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0', color)}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-neutral-900 truncate">{lead.name}</h2>
            <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full', stage.pill)}>
              {stage.emoji} {stage.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Contact */}
          <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            {lead.phone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone size={14} className="text-neutral-400" />
                <span className="text-sm font-medium text-neutral-800 flex-1">{lead.phone}</span>
                <a href={`https://wa.me/${toWhatsApp(lead.phone)}`} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-black text-green-600 hover:underline">
                  WhatsApp
                </a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MessageCircle size={14} className="text-neutral-400" />
                <span className="text-sm font-medium text-neutral-800 truncate">{lead.email}</span>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Zap size={14} className="text-neutral-400" />
                <span className="text-sm text-neutral-600">Origem: <strong>{lead.source}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar size={14} className="text-neutral-400" />
              <span className="text-sm text-neutral-500">
                {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : '—'}
              </span>
            </div>
          </div>

          {lead.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-700 mb-1.5">Interesse / Notas</p>
              <p className="text-sm text-neutral-700 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {/* Move to stage */}
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Mover para etapa</p>
            <div className="space-y-1.5">
              {stages.filter(s => s.id !== lead.status).map(s => (
                <button
                  key={s.id}
                  onClick={() => { onMove(lead.id, s.id); onClose(); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors',
                    'bg-neutral-50 hover:bg-neutral-100 text-neutral-700',
                  )}
                >
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', s.dot)} />
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-neutral-100 p-4 flex gap-2">
          {lead.phone && (
            <a
              href={`https://wa.me/${toWhatsApp(lead.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          )}
          <button
            onClick={() => { onDelete(lead.id, lead.name); onClose(); }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

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
    } catch (error: any) {
      toast.error('Erro ao carregar leads: ' + error.message);
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

  const moveLead = useCallback(async (id: string, newStatus: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.status === newStatus) return;

    // Auto-create customer when moved to "closed"
    if (newStatus === 'closed' && lead) {
      try {
        await dataService.addCustomer({
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          cpf: '',
          city: '',
          notes: lead.notes || '',
        });
        toast.success(`${lead.name} virou cliente! 🎉`, { duration: 3000 });
      } catch {
        // Ignore duplicate / missing column errors — customer may already exist
      }
    }

    try {
      await dataService.updateLead(id, { status: newStatus });
      fetchLeads();
    } catch (error: any) {
      toast.error('Erro ao mover lead: ' + error.message);
    }
  }, [leads, fetchLeads]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"?`)) return;
    try {
      await dataService.deleteLead(id);
      toast.success('Lead removido!');
      fetchLeads();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  }, [fetchLeads]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome.'); return; }
    try {
      setIsSaving(true);
      await dataService.addLead({ ...form });
      toast.success('Lead adicionado!');
      setIsAddOpen(false);
      setForm({ name: '', phone: '', email: '', source: 'Instagram', notes: '', status: 'new' });
      fetchLeads();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Drag handlers
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const leadId = String(active.id);
    const targetStageId = String(over.id);
    // over.id is always a stage id (columns are the droppables)
    if (STAGES.some(s => s.id === targetStageId)) {
      moveLead(leadId, targetStageId);
    }
  }, [moveLead]);

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  // Stats
  const totalOpen = leads.filter(l => l.status !== 'closed').length;
  const totalClosed = leads.filter(l => l.status === 'closed').length;
  const conversionRate = leads.length > 0 ? Math.round((totalClosed / leads.length) * 100) : 0;
  const thisMonth = leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-5 pb-10">
      {/* Detail panel */}
      {detailLead && (
        <LeadDetail
          lead={detailLead}
          stages={STAGES}
          onClose={() => setDetailLead(null)}
          onMove={moveLead}
          onDelete={handleDelete}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">CRM de Leads</h2>
          <p className="text-neutral-500 text-sm">Funil de vendas — arraste os cards entre etapas</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsAddOpen(true)}>
          Novo Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Em aberto', value: totalOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: CheckCircle2, label: 'Clientes', value: totalClosed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: TrendingUp, label: 'Conversão', value: `${conversionRate}%`, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: Zap, label: 'Este mês', value: thisMonth, color: 'text-primary-700', bg: 'bg-primary/10' },
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
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="off" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="WhatsApp" placeholder="(11) 99999-9999"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} autoComplete="off" />
            <Input label="Email" type="email" placeholder="email@..."
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="off" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Origem</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Etapa inicial</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as StageId })}
              >
                {STAGES.filter(s => s.id !== 'closed').map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Input label="Interesse / Notas" placeholder="Ex: Interessado no iPhone 16 Pro 256GB"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} autoComplete="off" />

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
