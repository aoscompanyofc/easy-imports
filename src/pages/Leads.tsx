import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Phone, Mail, Calendar, Trash2, X,
  CheckCircle2, TrendingUp, Users, Zap, ArrowRight,
  MapPin, MessageSquare, Tag, Clock,
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

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

function toWhatsApp(phone: string) {
  return phone.replace(/\D/g, '').replace(/^0/, '').replace(/^(\d{2})/, '55$1');
}
function getInitials(name: string) {
  return (name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const AVATAR_COLORS = [
  'bg-neutral-900','bg-neutral-700','bg-neutral-600','bg-neutral-500',
  'bg-neutral-800','bg-primary','bg-neutral-400','bg-neutral-300',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[((name || '').charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

const TAG_PALETTE = [
  'bg-neutral-200 text-neutral-700', 'bg-primary/20 text-neutral-900',
  'bg-neutral-100 text-neutral-600', 'bg-neutral-900 text-white',
  'bg-primary/10 text-neutral-800', 'bg-neutral-700 text-white',
];
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % TAG_PALETTE.length;
  return TAG_PALETTE[Math.abs(h)];
}

const SOURCES = [
  'Instagram', 'WhatsApp Easy Imports', 'WhatsApp João',
  'Indicação', 'Facebook', 'TikTok', 'Google', 'Loja Física', 'Outro',
];

// ─── Stages ───────────────────────────────────────────────────────────────────
const STAGES = [
  { id: 'new',         label: 'Novo Lead',   accent: '#525252' },
  { id: 'interested',  label: 'Interessado', accent: '#EAB308' },
  { id: 'proposal',    label: 'Follow Up',   accent: '#737373' },
  { id: 'negotiating', label: 'Negociando',  accent: '#171717' },
  { id: 'closed',      label: 'Cliente',     accent: '#10B981' },
] as const;

type StageId = typeof STAGES[number]['id'];
function getStage(id: string) { return STAGES.find(s => s.id === id) ?? STAGES[0]; }

// ─── Lead Card ────────────────────────────────────────────────────────────────
const CardContent = ({
  lead, isDragging = false, onDelete, onDetail,
}: {
  lead: any; isDragging?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
  onDetail?: () => void;
}) => {
  const stage = getStage(lead.status);

  return (
    <div
      onClick={!isDragging ? onDetail : undefined}
      className={cn(
        'bg-white rounded-xl overflow-hidden select-none transition-all duration-150 group',
        isDragging
          ? 'shadow-2xl scale-[1.04] rotate-1 opacity-95'
          : 'shadow-sm hover:shadow-md cursor-pointer border border-neutral-100 hover:border-neutral-200',
      )}
      style={{ borderLeft: `3px solid ${stage.accent}` }}
    >
      <div className="p-3 space-y-2">
        {/* Avatar + name */}
        <div className="flex items-start gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5',
            avatarColor(lead.name),
          )}>
            {getInitials(lead.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 text-[13px] leading-tight truncate">{lead.name}</p>
            {lead.source && (
              <p className="text-[10px] text-neutral-400 truncate">{lead.source}</p>
            )}
          </div>
          {!isDragging && onDelete && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(e); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-300 hover:text-red-400 transition-all rounded flex-shrink-0"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Notes */}
        {lead.notes && (
          <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-2 pl-0.5">
            {lead.notes}
          </p>
        )}

        {/* Tags */}
        {Array.isArray(lead.tags) && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pl-0.5">
            {lead.tags.map((tag: string) => (
              <span key={tag} className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full', tagColor(tag))}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Follow-up date */}
        {lead.follow_up_date && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-bold pl-0.5',
            new Date(lead.follow_up_date + 'T00:00:00') <= new Date() ? 'text-red-500' : 'text-neutral-600'
          )}>
            <Clock size={9} />
            Follow-up: {new Date(lead.follow_up_date + 'T00:00:00').toLocaleDateString('pt-BR')}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {lead.phone ? (
            <span className="flex items-center gap-1 text-[10px] text-neutral-400 truncate">
              <Phone size={9} className="flex-shrink-0" />
              {lead.phone}
            </span>
          ) : <div />}
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.status === 'closed' && (
              <span className="flex items-center gap-0.5 text-[9px] font-black text-neutral-900 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                <CheckCircle2 size={8} /> Cliente
              </span>
            )}
            {lead.created_at && (
              <span className="text-[10px] text-neutral-300 whitespace-nowrap">{fmtDate(lead.created_at)}</span>
            )}
          </div>
        </div>

        {/* Contact button — always visible when phone exists */}
        {!isDragging && lead.phone && (
          <a
            href={`https://wa.me/${toWhatsApp(lead.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold bg-neutral-100 hover:bg-primary text-neutral-600 hover:text-neutral-900 transition-all"
          >
            <Phone size={11} />
            Contatar
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Draggable ────────────────────────────────────────────────────────────────
const DraggableCard = ({ lead, onDelete, onDetail }: {
  lead: any;
  onDelete: (e: React.MouseEvent) => void;
  onDetail: () => void;
}) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{ opacity: isDragging ? 0.15 : 1, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <CardContent lead={lead} onDelete={onDelete} onDetail={onDetail} />
    </div>
  );
};

// ─── Kanban Column Card ───────────────────────────────────────────────────────
const KanbanColumn = ({ stage, leads, activeId, onDelete, onDetail }: {
  stage: typeof STAGES[number];
  leads: any[];
  activeId: string | null;
  onDelete: (id: string, name: string) => void;
  onDetail: (lead: any) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden min-h-[560px]">
      {/* Column header */}
      <div
        className="px-4 py-3.5 flex items-center justify-between flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${stage.accent}14 0%, ${stage.accent}08 100%)`,
          borderBottom: `1.5px solid ${stage.accent}28`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.accent }} />
          <span className="text-[11px] font-black uppercase tracking-[0.09em] text-neutral-600">
            {stage.label}
          </span>
        </div>
        <span
          className="text-xs font-black tabular-nums min-w-[22px] h-[22px] flex items-center justify-center rounded-full"
          style={{ backgroundColor: stage.accent + '20', color: stage.accent }}
        >
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2.5 transition-all duration-150',
          isOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : 'bg-transparent',
        )}
      >
        {leads.map(lead => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            onDelete={e => { e.stopPropagation(); onDelete(lead.id, lead.name); }}
            onDetail={() => onDetail(lead)}
          />
        ))}

        {leads.length === 0 && !activeId && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-10 opacity-35">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: stage.accent + '20' }}
            >
              <Plus size={18} style={{ color: stage.accent }} />
            </div>
            <p className="text-xs text-neutral-400 font-medium text-center leading-relaxed">
              Arraste um lead<br />para esta etapa
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Detail modal (centered) ──────────────────────────────────────────────────
const LeadDetail = ({ lead, onClose, onMove, onDelete, onUpdate }: {
  lead: any;
  onClose: () => void;
  onMove: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onUpdate: (id: string, data: any) => void;
}) => {
  const stage = getStage(lead.status);
  const initials = getInitials(lead.name);
  const color = avatarColor(lead.name);
  const [tagInput, setTagInput] = useState('');
  const [localTags, setLocalTags] = useState<string[]>(Array.isArray(lead.tags) ? lead.tags : []);
  const [followUpDate, setFollowUpDate] = useState<string>(lead.follow_up_date || '');

  const saveTags = (tags: string[]) => {
    setLocalTags(tags);
    onUpdate(lead.id, { tags });
  };
  const addTag = () => {
    const t = tagInput.trim();
    if (!t || localTags.includes(t)) { setTagInput(''); return; }
    saveTags([...localTags, t]);
    setTagInput('');
  };
  const removeTag = (tag: string) => saveTags(localTags.filter(t => t !== tag));
  const saveFollowUp = () => onUpdate(lead.id, { follow_up_date: followUpDate || null });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: stage.accent }} />

        {/* Header */}
        <div className="px-6 py-5 flex items-center gap-4 border-b border-neutral-100 flex-shrink-0">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0', color)}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-xl text-neutral-900 truncate">{lead.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.accent }} />
              <span className="text-sm font-semibold" style={{ color: stage.accent }}>{stage.label}</span>
              {lead.created_at && (
                <span className="text-xs text-neutral-400 ml-1">
                  · {new Date(lead.created_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-neutral-50 rounded-2xl divide-y divide-neutral-100 overflow-hidden">
            {lead.phone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-800 flex-1 truncate">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-800 truncate">{lead.email}</span>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-600">Origem: <strong>{lead.source}</strong></span>
              </div>
            )}
            {lead.birthday && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-600">Nascimento: <strong>{new Date(lead.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
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
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={13} className="text-neutral-500" />
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Interesse / Notas</p>
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag size={13} className="text-neutral-400" />
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Etiquetas</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {localTags.map(tag => (
                <span key={tag} className={cn('flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full', tagColor(tag))}>
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:opacity-60 transition-opacity">
                    <X size={9} />
                  </button>
                </span>
              ))}
              {localTags.length === 0 && <span className="text-xs text-neutral-300 italic">Nenhuma etiqueta</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Nova etiqueta..."
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
              <button onClick={addTag}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-bold transition-colors">
                Adicionar
              </button>
            </div>
          </div>

          {/* Follow-up date */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={13} className="text-neutral-400" />
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Data de Follow-up</p>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
              <button onClick={saveFollowUp}
                className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-bold transition-colors">
                Salvar
              </button>
              {followUpDate && (
                <button onClick={() => { setFollowUpDate(''); onUpdate(lead.id, { follow_up_date: null }); }}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Mover etapa</p>
            <div className="space-y-1.5">
              {STAGES.filter(s => s.id !== lead.status).map(s => (
                <button
                  key={s.id}
                  onClick={() => { onMove(lead.id, s.id); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-left transition-colors group"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.accent }} />
                  <span className="text-sm font-semibold text-neutral-700 flex-1">{s.label}</span>
                  <ArrowRight size={13} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-6 py-4 flex gap-2.5 flex-shrink-0">
          {lead.phone && (
            <a
              href={`https://wa.me/${toWhatsApp(lead.phone)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors"
            >
              <Phone size={15} />
              Contatar
            </a>
          )}
          <button
            onClick={() => { onDelete(lead.id, lead.name); onClose(); }}
            className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 font-bold text-sm transition-colors"
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
  const [leads, setLeads]           = useState<any[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'Instagram', notes: '', status: 'new' as StageId, birthday: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const [data, customers] = await Promise.all([
        dataService.getLeads(),
        dataService.getCustomers(),
      ]);
      const existingLeads: any[] = data || [];

      const toCreate = (customers || []).filter((c: any) =>
        !existingLeads.some((l: any) =>
          l.status === 'closed' && (
            (c.phone && l.phone && l.phone === c.phone) ||
            l.name?.toLowerCase() === c.name?.toLowerCase()
          )
        )
      );

      if (toCreate.length > 0) {
        await Promise.all(
          toCreate.map((c: any) =>
            dataService.addLead({
              name: c.name, phone: c.phone || '', email: c.email || '',
              source: 'Clientes', notes: c.notes || '', status: 'closed',
            }).catch(() => null)
          )
        );
        const updated = await dataService.getLeads();
        setLeads(updated || []);
      } else {
        setLeads(existingLeads);
      }
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

  const syncCreateCustomer = useCallback(async (lead: any) => {
    try {
      await dataService.addCustomer({
        name: lead.name, phone: lead.phone || '', email: lead.email || '',
        cpf: '', city: '', notes: lead.notes || '',
      });
    } catch { /* ignore */ }
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

  const handleUpdateLead = useCallback(async (id: string, data: any) => {
    try {
      await dataService.updateLead(id, data);
      fetchLeads();
    } catch (e: any) {
      toast.error('Erro ao atualizar lead: ' + e.message);
    }
  }, [fetchLeads]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome.'); return; }
    try {
      setIsSaving(true);
      await dataService.addLead({ ...form });
      if (form.status === 'closed') await syncCreateCustomer(form);
      toast.success('Lead adicionado!');
      setIsAddOpen(false);
      setForm({ name: '', phone: '', email: '', source: 'Instagram', notes: '', status: 'new', birthday: '' });
      fetchLeads();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

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

  const totalOpen   = leads.filter(l => l.status !== 'closed').length;
  const totalClosed = leads.filter(l => l.status === 'closed').length;
  const convRate    = leads.length > 0 ? Math.round((totalClosed / leads.length) * 100) : 0;
  const thisMonth   = leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-5 pb-10">
        <div className="h-8 w-52 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-5 gap-3 min-w-[680px]">
            {[1,2,3,4,5].map(i => <div key={i} className="h-[560px] bg-neutral-100 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {detailLead && (
        <LeadDetail
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onMove={moveLead}
          onDelete={handleDelete}
          onUpdate={handleUpdateLead}
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
          { icon: Users,        label: 'Em aberto', value: totalOpen,      color: '#3B82F6' },
          { icon: CheckCircle2, label: 'Clientes',  value: totalClosed,    color: '#10B981' },
          { icon: TrendingUp,   label: 'Conversão', value: `${convRate}%`, color: '#8B5CF6' },
          { icon: Zap,          label: 'Este mês',  value: thisMonth,      color: '#F59E0B' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: item.color + '18' }}>
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-2xl font-black text-neutral-900 leading-none mt-0.5 tabular-nums">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone, origem..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-neutral-200 rounded-2xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Kanban — grid, sem scroll lateral */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-5 gap-3 min-w-[680px]">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={getByStage(stage.id)}
                activeId={activeId}
                onDelete={handleDelete}
                onDetail={setDetailLead}
              />
            ))}
          </div>
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
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Etapa inicial</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value as StageId })}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <Input label="Interesse / Notas" placeholder="Ex: Interessado no iPhone 16 Pro 256GB"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} autoComplete="off" />
          <Input label="Data de Nascimento" type="date"
            value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
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
