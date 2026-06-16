import React, { useState, useMemo } from 'react';
import {
  MessageSquare, Plus, Copy, Trash2, X, Check, Search, Tag,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { safeUUID } from '../lib/storage';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  message: string;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'easy_imports_message_templates';

export const CATEGORIES = [
  'Follow-up', 'Aniversário', 'Pós-venda', 'Promoção',
  'Recuperação', 'Boas-vindas', 'Cobrança', 'Geral',
];

const CAT_STYLE: Record<string, { text: string; bg: string; border: string; pill: string }> = {
  'Follow-up':   { text: 'text-neutral-700',  bg: 'bg-neutral-50',   border: 'border-neutral-200',  pill: 'bg-neutral-200 text-neutral-700' },
  'Aniversário': { text: 'text-neutral-900',  bg: 'bg-primary/5',    border: 'border-primary/20',   pill: 'bg-primary text-neutral-900' },
  'Pós-venda':   { text: 'text-neutral-700',  bg: 'bg-neutral-50',   border: 'border-neutral-200',  pill: 'bg-neutral-100 text-neutral-700' },
  'Promoção':    { text: 'text-neutral-900',  bg: 'bg-primary/10',   border: 'border-primary/20',   pill: 'bg-primary/20 text-neutral-900' },
  'Recuperação': { text: 'text-red-700',      bg: 'bg-red-50',       border: 'border-red-200',      pill: 'bg-red-100 text-red-700' },
  'Boas-vindas': { text: 'text-neutral-700',  bg: 'bg-neutral-50',   border: 'border-neutral-200',  pill: 'bg-neutral-200 text-neutral-700' },
  'Cobrança':    { text: 'text-neutral-900',  bg: 'bg-neutral-900',  border: 'border-neutral-900',  pill: 'bg-neutral-900 text-white' },
  'Geral':       { text: 'text-neutral-600',  bg: 'bg-neutral-50',   border: 'border-neutral-200',  pill: 'bg-neutral-100 text-neutral-600' },
};

function catStyle(cat: string) {
  return CAT_STYLE[cat] ?? CAT_STYLE['Geral'];
}

const TEMPLATE_VARS = ['{nome}', '{produto}', '{valor}', '{empresa}'];

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'd1', category: 'Follow-up',
    title: 'Follow-up — Pós-contato inicial',
    message: 'Olá {nome}! 👋 Aqui é da Easy Imports. Você chegou a analisar as opções que enviamos? Qualquer dúvida é só chamar, estamos aqui pra ajudar! 😊',
    createdAt: '',
  },
  {
    id: 'd2', category: 'Follow-up',
    title: 'Follow-up — Sem retorno',
    message: 'Oi {nome}! Tudo bem? 😊 Passando rapidinho pra saber se ficou com alguma dúvida sobre os produtos. Estamos à disposição!',
    createdAt: '',
  },
  {
    id: 'd3', category: 'Follow-up',
    title: 'Produto disponível — avise quando chegar',
    message: 'Olá {nome}! 📦 Boa notícia! O {produto} que você pediu pra avisar chegou ao nosso estoque. Entre em contato agora pra garantir o seu antes que acabe!',
    createdAt: '',
  },
  {
    id: 'd4', category: 'Aniversário',
    title: 'Feliz aniversário',
    message: '🎂 Feliz aniversário, {nome}! Aqui é a equipe da Easy Imports desejando um dia muito especial pra você! 🥳 Aproveite muito o seu dia!',
    createdAt: '',
  },
  {
    id: 'd5', category: 'Pós-venda',
    title: 'Pós-venda — Como está sendo?',
    message: 'Olá {nome}! 😊 Como está sendo a experiência com o seu novo {produto}? Qualquer dúvida ou problema é só chamar, tô aqui!',
    createdAt: '',
  },
  {
    id: 'd6', category: 'Pós-venda',
    title: 'Pós-venda — Pedido de avaliação',
    message: 'Oi {nome}! 🌟 Passando pra saber se ficou satisfeito(a) com sua compra na Easy Imports. Sua opinião é muito importante pra gente continuar melhorando!',
    createdAt: '',
  },
  {
    id: 'd7', category: 'Pós-venda',
    title: 'Lembrete de garantia',
    message: 'Olá {nome}! 🛡️ Passando pra lembrar que seu {produto} ainda está dentro do período de garantia conosco. Qualquer problema é só chamar!',
    createdAt: '',
  },
  {
    id: 'd8', category: 'Promoção',
    title: 'Promoção especial do dia',
    message: 'Oi {nome}! 🔥 Temos uma oferta incrível hoje aqui na Easy Imports! Condições especiais em aparelhos selecionados. Quer saber mais? Chama aqui! 📱',
    createdAt: '',
  },
  {
    id: 'd9', category: 'Promoção',
    title: 'Nova linha de produtos chegou',
    message: 'Olá {nome}! 🆕 Acabamos de receber os novos modelos aqui na Easy Imports! Quer conferir as novidades e condições especiais de lançamento? É só chamar! 📱',
    createdAt: '',
  },
  {
    id: 'd10', category: 'Promoção',
    title: 'Indicação premiada',
    message: 'Oi {nome}! 😊 Sabia que você pode ganhar desconto especial na próxima compra indicando um amigo pra gente? É simples: indica, ele compra, você ganha! Quer saber mais?',
    createdAt: '',
  },
  {
    id: 'd11', category: 'Recuperação',
    title: 'Cliente inativo — reativar',
    message: 'Olá {nome}! Faz um tempinho que não nos falamos. 😊 Temos várias novidades incríveis aqui na Easy Imports! Que tal dar uma conferida nas nossas opções?',
    createdAt: '',
  },
  {
    id: 'd12', category: 'Boas-vindas',
    title: 'Boas-vindas — Novo cliente',
    message: 'Olá {nome}! 🎉 Seja muito bem-vindo(a) à Easy Imports! Estamos aqui pra ajudar você a encontrar o melhor aparelho com o melhor custo-benefício. Qualquer dúvida é só chamar!',
    createdAt: '',
  },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

function loadTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MessageTemplate[];
  } catch {}
  return DEFAULT_TEMPLATES.map(t => ({ ...t, createdAt: new Date().toISOString() }));
}

function saveTemplates(templates: MessageTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ─── MessageCard ─────────────────────────────────────────────────────────────

function MessageCard({
  template,
  onDelete,
}: {
  template: MessageTemplate;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = catStyle(template.category);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template.message);
    setCopied(true);
    toast.success('Mensagem copiada!', { duration: 1500 });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={cn(
      'flex flex-col bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-shadow overflow-hidden',
      s.border
    )}>
      {/* Category stripe */}
      <div className={cn('px-4 pt-4 pb-3', s.bg)}>
        <div className="flex items-start justify-between gap-2">
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', s.pill)}>
            <Tag size={9} />
            {template.category}
          </span>
          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                className="text-[10px] font-black text-red-600 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-lg transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-bold text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title="Excluir mensagem"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <h3 className={cn('font-black text-sm mt-2', s.text)}>{template.title}</h3>
      </div>

      {/* Message body */}
      <div className="px-4 py-3 flex-1">
        <p className={cn(
          'text-sm text-neutral-600 leading-relaxed whitespace-pre-line',
          !expanded && 'line-clamp-4'
        )}>
          {template.message}
        </p>
        {template.message.split('\n').join('').length > 140 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 mt-1 transition-colors"
          >
            {expanded ? 'Ver menos ↑' : 'Ver mais ↓'}
          </button>
        )}
      </div>

      {/* Copy button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleCopy}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all duration-200',
            copied
              ? 'bg-green-500 text-white shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-95'
          )}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copiado!' : 'Copiar mensagem'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const MensagensProntas: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>(loadTemplates);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Follow-up');
  const [newMessage, setNewMessage] = useState('');
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const persist = (next: MessageTemplate[]) => {
    setTemplates(next);
    saveTemplates(next);
  };

  const handleDelete = (id: string) => {
    persist(templates.filter(t => t.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      toast.error('Preencha o título e a mensagem.');
      return;
    }
    const next: MessageTemplate = {
      id: safeUUID(),
      title: newTitle.trim(),
      category: newCategory,
      message: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([next, ...templates]);
    toast.success('Mensagem criada!');
    setIsAddOpen(false);
    setNewTitle('');
    setNewMessage('');
    setNewCategory('Follow-up');
    setActiveCategory('Todas');
  };

  const insertVar = (variable: string) => {
    if (!textareaRef) {
      setNewMessage(m => m + variable);
      return;
    }
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const next = newMessage.slice(0, start) + variable + newMessage.slice(end);
    setNewMessage(next);
    setTimeout(() => {
      textareaRef.focus();
      textareaRef.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const usedCategories = useMemo(() =>
    CATEGORIES.filter(cat => templates.some(t => t.category === cat)),
    [templates]
  );

  const filtered = useMemo(() =>
    templates.filter(t => {
      const catOk = activeCategory === 'Todas' || t.category === activeCategory;
      const searchOk = !searchTerm ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.message.toLowerCase().includes(searchTerm.toLowerCase());
      return catOk && searchOk;
    }),
    [templates, activeCategory, searchTerm]
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Mensagens Prontas</h2>
          <p className="text-neutral-500 text-sm mt-0.5">
            {templates.length} mensagem{templates.length !== 1 ? 's' : ''} — clique em copiar e cole direto no WhatsApp
          </p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsAddOpen(true)}>
          Nova Mensagem
        </Button>
      </div>

      {/* Search + Category filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar mensagem..."
            className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {['Todas', ...usedCategories].map(cat => {
            const active = cat === activeCategory;
            const s = cat !== 'Todas' ? catStyle(cat) : null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all',
                  active
                    ? s
                      ? cn(s.pill, s.border, 'border-current')
                      : 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300'
                )}
              >
                {cat}
                {cat !== 'Todas' && (
                  <span className="ml-1.5 opacity-60">
                    {templates.filter(t => t.category === cat).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
            <MessageSquare size={28} className="text-neutral-300" />
          </div>
          <div>
            <p className="font-bold text-neutral-600">
              {searchTerm ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem nesta categoria'}
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              {searchTerm ? 'Tente outros termos.' : 'Crie uma nova mensagem para começar.'}
            </p>
          </div>
          <Button leftIcon={<Plus size={16} />} size="sm" onClick={() => setIsAddOpen(true)}>
            Nova Mensagem
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <MessageCard
              key={t.id}
              template={t}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      {/* Modal — Nova Mensagem */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Mensagem Pronta" maxWidth="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Título *"
            placeholder="Ex: Follow-up pós-visita"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoComplete="off"
            autoFocus
            required
          />

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-neutral-700">Mensagem *</label>
              <span className="text-[10px] text-neutral-400">{newMessage.length} caracteres</span>
            </div>
            <textarea
              ref={el => setTextareaRef(el)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
              rows={5}
              placeholder="Digite a mensagem aqui... Use as variáveis abaixo para personalizar."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              required
            />

            {/* Variable chips */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Inserir:</span>
              {TEMPLATE_VARS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVar(v)}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary-900 text-[11px] font-bold hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {newMessage && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Prévia</p>
              <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
                {newMessage
                  .replace(/\{nome\}/g, 'João')
                  .replace(/\{produto\}/g, 'iPhone 15 Pro')
                  .replace(/\{valor\}/g, 'R$ 8.500')
                  .replace(/\{empresa\}/g, 'Easy Imports')}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth type="button" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button fullWidth type="submit" leftIcon={<MessageSquare size={16} />}>
              Salvar Mensagem
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MensagensProntas;
