import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DndContext, DragOverlay,
  PointerSensor, TouchSensor,
  useSensor, useSensors,
  rectIntersection,
  useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  Plus, Trash2, Calendar, Flag, Archive, ArchiveRestore,
  Trello, AlertTriangle, Zap, Megaphone, Instagram, PackageSearch,
  Wallet, PhoneCall, Cake, ClipboardCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';
import { safeUUID } from '../lib/storage';
import { addNotification } from '../lib/notificationHelpers';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Types ──────────────────────────────────────────────────────────────────
type TaskStatus = 'todo' | 'doing' | 'done';
type TaskPriority = 'baixa' | 'media' | 'alta';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string; // '' quando não definida
  archived: boolean;
  created_at: string;
  updated_at: string;
}

const COLUMNS: { id: TaskStatus; label: string; accent: string }[] = [
  { id: 'todo',  label: 'A Fazer',       accent: '#737373' },
  { id: 'doing', label: 'Em Andamento',  accent: '#EAB308' },
  { id: 'done',  label: 'Concluído',     accent: '#10B981' },
];

const PRIORITIES: { id: TaskPriority; label: string; color: string; bg: string }[] = [
  { id: 'alta',  label: 'Alta',  color: '#DC2626', bg: '#FEE2E2' },
  { id: 'media', label: 'Média', color: '#B45309', bg: '#FEF3C7' },
  { id: 'baixa', label: 'Baixa', color: '#166534', bg: '#DCFCE7' },
];
function getPriority(id: string) { return PRIORITIES.find(p => p.id === id) ?? PRIORITIES[1]; }

// ─── Modelos de tarefa do dia a dia — clique e já cria, sem precisar digitar ──
const TASK_TEMPLATES: { title: string; description: string; priority: TaskPriority; icon: React.ElementType }[] = [
  { title: 'Anunciar aparelho no OLX', description: 'Publicar com fotos atualizadas e descrição completa.', priority: 'media', icon: Megaphone },
  { title: 'Postar Stories/Feed no Instagram', description: '', priority: 'media', icon: Instagram },
  { title: 'Enviar lista de Seminovos no grupo do WhatsApp', description: '', priority: 'media', icon: Zap },
  { title: 'Conferir aparelhos parados no Estoque', description: 'Ver o que está há mais de 45 dias sem vender.', priority: 'media', icon: PackageSearch },
  { title: 'Cobrar parcelas atrasadas', description: '', priority: 'alta', icon: Wallet },
  { title: 'Enviar follow-up de 7 dias pros clientes', description: '', priority: 'media', icon: PhoneCall },
  { title: 'Enviar mensagem de aniversário', description: '', priority: 'baixa', icon: Cake },
  { title: 'Fazer fechamento de caixa do dia', description: '', priority: 'alta', icon: ClipboardCheck },
];

function emptyTaskForm() {
  return { title: '', description: '', priority: 'media' as TaskPriority, due_date: '', status: 'todo' as TaskStatus };
}

function formatDueDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function isOverdue(d: string, status: TaskStatus) {
  if (!d || status === 'done') return false;
  const [y, m, day] = d.split('-').map(Number);
  const due = new Date(y, m - 1, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return due < today;
}

// ─── Card ───────────────────────────────────────────────────────────────────
const CardContent = ({ task, isDragging = false, onClick }: { task: Task; isDragging?: boolean; onClick?: () => void }) => {
  const col = COLUMNS.find(c => c.id === task.status) ?? COLUMNS[0];
  const pr = getPriority(task.priority);
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      onClick={!isDragging ? onClick : undefined}
      className={cn(
        'bg-white rounded-xl overflow-hidden select-none transition-all duration-150 group',
        isDragging
          ? 'shadow-2xl scale-[1.04] rotate-1 opacity-95'
          : 'shadow-sm hover:shadow-md cursor-pointer border border-neutral-100 hover:border-neutral-200',
      )}
      style={{ borderLeft: `3px solid ${col.accent}` }}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <p className="flex-1 min-w-0 font-bold text-neutral-900 text-[13px] leading-snug">{task.title}</p>
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
            style={{ color: pr.color, backgroundColor: pr.bg }}
          >
            {pr.label}
          </span>
        </div>

        {task.description && (
          <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-2">{task.description}</p>
        )}

        {task.due_date && (
          <div className={cn(
            'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            overdue ? 'bg-danger/10 text-danger' : 'bg-neutral-100 text-neutral-500',
          )}>
            {overdue ? <AlertTriangle size={10} /> : <Calendar size={10} />}
            {formatDueDate(task.due_date)}
          </div>
        )}
      </div>
    </div>
  );
};

const DraggableCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{ opacity: isDragging ? 0.15 : 1, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <CardContent task={task} onClick={onClick} />
    </div>
  );
};

// ─── Column ─────────────────────────────────────────────────────────────────
const KanbanColumn = ({ column, tasks, activeId, onCardClick, onAdd }: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  activeId: string | null;
  onCardClick: (t: Task) => void;
  onAdd: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden min-h-[560px]">
      <div
        className="px-4 py-3.5 flex items-center justify-between flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${column.accent}14 0%, ${column.accent}08 100%)`,
          borderBottom: `1.5px solid ${column.accent}28`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: column.accent }} />
          <span className="text-[11px] font-black uppercase tracking-[0.09em] text-neutral-600">
            {column.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-black tabular-nums min-w-[22px] h-[22px] flex items-center justify-center rounded-full"
            style={{ backgroundColor: column.accent + '20', color: column.accent }}
          >
            {tasks.length}
          </span>
          <button
            onClick={onAdd}
            title={`Nova tarefa em ${column.label}`}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-900/5 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2.5 transition-all duration-150',
          isOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : 'bg-transparent',
        )}
      >
        {tasks.map(task => (
          <DraggableCard key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}

        {tasks.length === 0 && !activeId && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-10 opacity-35">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: column.accent + '20' }}>
              <Plus size={18} style={{ color: column.accent }} />
            </div>
            <p className="text-xs text-neutral-400 font-medium text-center leading-relaxed">
              Arraste uma tarefa<br />para cá
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────
export const Tarefas: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTaskForm());
  const [isSaving, setIsSaving] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // ── Load ──
  useEffect(() => {
    (async () => {
      try {
        const saved = await dataService.getTasksBoard();
        if (saved && Array.isArray(saved)) setTasks(saved as Task[]);
      } catch { /* usa quadro vazio */ }
      setLoaded(true);
      setIsLoading(false);
    })();
  }, []);

  // ── Persist (só depois que carregou, nunca sobrescreve com estado inicial vazio) ──
  const persist = useCallback((next: Task[]) => {
    setTasks(next);
    if (!loaded) return;
    dataService.saveTasksBoard(next).catch(() => { /* silencioso — já salvou local */ });
  }, [loaded]);

  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => t.archived), [tasks]);
  const getByStatus = (status: TaskStatus) => activeTasks.filter(t => t.status === status);

  // ── CRUD ──
  const openCreate = (status: TaskStatus = 'todo') => {
    setEditingId(null);
    setForm({ ...emptyTaskForm(), status });
    setIsFormOpen(true);
  };
  const handleUseTemplate = (tpl: typeof TASK_TEMPLATES[number]) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: safeUUID(), title: tpl.title, description: tpl.description,
      priority: tpl.priority, due_date: '', status: 'todo', archived: false,
      created_at: now, updated_at: now,
    };
    persist([...tasks, newTask]);
    addNotification({ type: 'tarefa_nova', title: 'Nova tarefa criada', message: newTask.title, link: '/tarefas' }).catch(() => {});
    setShowTemplates(false);
    toast.success('Tarefa criada!');
  };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({ title: task.title, description: task.description, priority: task.priority, due_date: task.due_date, status: task.status });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Informe o título da tarefa.'); return; }
    setIsSaving(true);
    const now = new Date().toISOString();
    if (editingId) {
      const next = tasks.map(t => t.id === editingId
        ? { ...t, title: form.title.trim(), description: form.description.trim(), priority: form.priority, due_date: form.due_date, status: form.status, updated_at: now }
        : t);
      persist(next);
      toast.success('Tarefa atualizada!');
    } else {
      const newTask: Task = {
        id: safeUUID(),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        due_date: form.due_date,
        status: form.status,
        archived: false,
        created_at: now,
        updated_at: now,
      };
      persist([...tasks, newTask]);
      addNotification({ type: 'tarefa_nova', title: 'Nova tarefa criada', message: newTask.title, link: '/tarefas' }).catch(() => {});
      toast.success('Tarefa criada!');
    }
    setIsSaving(false);
    setIsFormOpen(false);
  };

  const handleArchiveToggle = (id: string) => {
    const next = tasks.map(t => t.id === id ? { ...t, archived: !t.archived, updated_at: new Date().toISOString() } : t);
    persist(next);
    setIsFormOpen(false);
    const wasArchived = tasks.find(t => t.id === id)?.archived;
    toast.success(wasArchived ? 'Tarefa restaurada!' : 'Tarefa ocultada.');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Excluir esta tarefa permanentemente? Não dá pra desfazer.')) return;
    persist(tasks.filter(t => t.id !== id));
    setIsFormOpen(false);
    toast.success('Tarefa excluída.');
  };

  // ── Drag & drop ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const targetStatus = String(over.id) as TaskStatus;
    if (!COLUMNS.some(c => c.id === targetStatus)) return;
    const task = tasks.find(t => t.id === String(active.id));
    if (!task || task.status === targetStatus) return;
    const next = tasks.map(t => t.id === task.id ? { ...t, status: targetStatus, updated_at: new Date().toISOString() } : t);
    persist(next);
    if (targetStatus === 'done') toast.success(`"${task.title}" concluída! 🎉`, { duration: 2500 });
  }, [tasks, persist]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) ?? null : null;

  const doneCount = getByStatus('done').length;
  const totalActive = activeTasks.length;

  if (isLoading) {
    return (
      <div className="space-y-5 pb-10">
        <div className="h-8 w-52 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-96 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Trello size={22} className="text-primary" /> Tarefas
          </h2>
          <p className="text-neutral-500">
            <strong>{totalActive}</strong> tarefa{totalActive !== 1 ? 's' : ''} ativa{totalActive !== 1 ? 's' : ''}
            {doneCount > 0 && <span className="text-neutral-400"> · {doneCount} concluída{doneCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          {archivedTasks.length > 0 && (
            <Button variant="secondary" leftIcon={<Archive size={16} />} onClick={() => setShowArchived(true)}>
              Ocultas ({archivedTasks.length})
            </Button>
          )}
          <Button variant="secondary" leftIcon={<Zap size={16} />} onClick={() => setShowTemplates(true)}>
            Tarefas Rápidas
          </Button>
          <Button leftIcon={<Plus size={16} />} onClick={() => openCreate('todo')}>
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getByStatus(col.id)}
              activeId={activeId}
              onCardClick={openEdit}
              onAdd={() => openCreate(col.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeTask ? <CardContent task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* MODAL CRIAR/EDITAR */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingId ? 'Editar Tarefa' : 'Nova Tarefa'} maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título *"
            placeholder="Ex: Ligar pro fornecedor sobre o pedido"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
            autoComplete="off"
          />
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Descrição</label>
            <textarea
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
              rows={3}
              placeholder="Detalhes da tarefa (opcional)..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Coluna</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-1">
                <Flag size={12} /> Prioridade
              </label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <Input
              label="Prazo"
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            {editingId && (
              <>
                <button
                  type="button"
                  onClick={() => handleDelete(editingId)}
                  className="w-12 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex-shrink-0"
                  title="Excluir permanentemente"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleArchiveToggle(editingId)}
                  className="w-12 flex items-center justify-center rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors flex-shrink-0"
                  title="Ocultar tarefa"
                >
                  <Archive size={16} />
                </button>
              </>
            )}
            <Button variant="secondary" fullWidth onClick={() => setIsFormOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit">{editingId ? 'Salvar' : 'Criar Tarefa'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL TAREFAS RÁPIDAS (modelos) */}
      <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="Tarefas Rápidas" maxWidth="sm">
        <p className="text-xs text-neutral-400 -mt-2 mb-3">Clique numa tarefa do dia a dia pra criar na hora, direto em "A Fazer".</p>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {TASK_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            const pr = getPriority(tpl.priority);
            return (
              <button
                key={tpl.title}
                onClick={() => handleUseTemplate(tpl)}
                className="w-full flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 rounded-xl transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-shrink-0 text-neutral-500">
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-800 truncate">{tpl.title}</p>
                  {tpl.description && <p className="text-[11px] text-neutral-400 truncate">{tpl.description}</p>}
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: pr.color, backgroundColor: pr.bg }}>
                  {pr.label}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* MODAL TAREFAS OCULTAS */}
      <Modal isOpen={showArchived} onClose={() => setShowArchived(false)} title="Tarefas Ocultas" maxWidth="md">
        {archivedTasks.length === 0 ? (
          <div className="py-10 text-center text-neutral-400">
            <Archive size={32} className="mx-auto mb-2 text-neutral-300" />
            <p className="text-sm">Nenhuma tarefa oculta.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {archivedTasks.map(task => {
              const col = COLUMNS.find(c => c.id === task.status) ?? COLUMNS[0];
              const pr = getPriority(task.priority);
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.accent }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-700 truncate">{task.title}</p>
                    <p className="text-[11px] text-neutral-400">{col.label} · <span style={{ color: pr.color }}>{pr.label}</span></p>
                  </div>
                  <button
                    onClick={() => handleArchiveToggle(task.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                    title="Restaurar"
                  >
                    <ArchiveRestore size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Tarefas;
