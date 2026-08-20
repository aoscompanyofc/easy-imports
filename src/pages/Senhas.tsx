import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyRound, Plus, Search, Eye, EyeOff, Copy, Star, Pencil, Trash2,
  AlertCircle, Download, Wand2, Instagram, Facebook, ShoppingBag,
  MessageCircle, Mail, Landmark, Server, Truck, Link2, LucideIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PasswordEntry {
  id: string;
  title: string;
  category: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  favorite: boolean;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface Category { id: string; label: string; icon: LucideIcon; color: string }

const CATEGORIES: Category[] = [
  { id: 'instagram', label: 'Instagram',          icon: Instagram,     color: '#E1306C' },
  { id: 'facebook',  label: 'Facebook',            icon: Facebook,      color: '#1877F2' },
  { id: 'olx',       label: 'OLX',                 icon: ShoppingBag,   color: '#7C1FD1' },
  { id: 'whatsapp',  label: 'WhatsApp',             icon: MessageCircle, color: '#25D366' },
  { id: 'email',     label: 'E-mail',               icon: Mail,          color: '#EA4335' },
  { id: 'banco',     label: 'Banco / Financeiro',   icon: Landmark,      color: '#10B981' },
  { id: 'sistema',   label: 'Sistema Interno',      icon: Server,        color: '#6366F1' },
  { id: 'fornecedor',label: 'Fornecedor',           icon: Truck,         color: '#F59E0B' },
  { id: 'outro',     label: 'Outro',                icon: KeyRound,      color: '#64748B' },
];
const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const PASSWORDS_SQL = `-- Execute no Supabase Dashboard → SQL Editor

create or replace function public.effective_owner_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select owner_id from public.team_members where email = auth.email() limit 1),
    auth.uid()
  );
$$;

create table if not exists public.passwords (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.effective_owner_id() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'outro',
  username text default '',
  password text not null,
  url text default '',
  notes text default '',
  favorite boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_by_name text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.passwords enable row level security;

drop policy if exists "passwords_all" on public.passwords;
create policy "passwords_all" on public.passwords
  using (owner_id = public.effective_owner_id())
  with check (owner_id = public.effective_owner_id());`;

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I) — evita senha gerada difícil
// de digitar corretamente em outro lugar (ex: teclado de TV, POS de cartão).
const CHARSETS = {
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lower: 'abcdefghijkmnpqrstuvwxyz',
  numbers: '23456789',
  symbols: '!@#$%^&*()-_=+[]{}',
};

interface GenOptions { length: number; upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }

function generateStrongPassword(opts: GenOptions): string {
  let chars = '';
  if (opts.upper) chars += CHARSETS.upper;
  if (opts.lower) chars += CHARSETS.lower;
  if (opts.numbers) chars += CHARSETS.numbers;
  if (opts.symbols) chars += CHARSETS.symbols;
  if (!chars) chars = CHARSETS.lower + CHARSETS.numbers; // nunca gera vazio
  const randomValues = new Uint32Array(opts.length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (n) => chars[n % chars.length]).join('');
}

const STRENGTH_LEVELS = [
  { label: 'Muito fraca', color: '#EF4444' },
  { label: 'Fraca',       color: '#F97316' },
  { label: 'Razoável',    color: '#F59E0B' },
  { label: 'Boa',         color: '#84CC16' },
  { label: 'Forte',       color: '#22C55E' },
  { label: 'Muito forte', color: '#10B981' },
];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: -1, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const idx = Math.min(score, STRENGTH_LEVELS.length - 1);
  return { score: idx, ...STRENGTH_LEVELS[idx] };
}

const emptyForm = () => ({
  title: '',
  category: 'outro',
  username: '',
  password: '',
  url: '',
  notes: '',
  favorite: false,
});

const emptyGenOptions = (): GenOptions => ({ length: 16, upper: true, lower: true, numbers: true, symbols: true });

export const Senhas: React.FC = () => {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSQL, setShowSQL] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [showFormPw, setShowFormPw] = useState(false);
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [genOptions, setGenOptions] = useState<GenOptions>(emptyGenOptions());

  const [confirmDelete, setConfirmDelete] = useState<PasswordEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getPasswords();
      setEntries(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar o cofre: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copiado!`))
      .catch(() => toast.error('Não foi possível copiar.'));
  };

  const handleToggleFavorite = async (entry: PasswordEntry) => {
    const next = !entry.favorite;
    setEntries((prev) => prev.map((p) => (p.id === entry.id ? { ...p, favorite: next } : p)));
    try {
      await dataService.updatePassword(entry.id, { favorite: next });
    } catch (error: any) {
      setEntries((prev) => prev.map((p) => (p.id === entry.id ? { ...p, favorite: !next } : p)));
      toast.error('Erro ao favoritar: ' + error.message);
    }
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm(emptyForm());
    setShowFormPw(false);
    setShowGenOptions(false);
    setGenOptions(emptyGenOptions());
    setIsModalOpen(true);
  };

  const openEdit = (entry: PasswordEntry) => {
    setEditEntry(entry);
    setForm({
      title: entry.title,
      category: entry.category || 'outro',
      username: entry.username || '',
      password: entry.password,
      url: entry.url || '',
      notes: entry.notes || '',
      favorite: entry.favorite,
    });
    setShowFormPw(false);
    setShowGenOptions(false);
    setGenOptions(emptyGenOptions());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditEntry(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Informe o nome do site/serviço.'); return; }
    if (!form.password) { toast.error('Informe ou gere uma senha.'); return; }
    try {
      setIsSaving(true);
      const payload = {
        title: form.title.trim(),
        category: form.category,
        username: form.username.trim(),
        password: form.password,
        url: form.url.trim(),
        notes: form.notes.trim(),
        favorite: form.favorite,
      };
      if (editEntry) {
        await dataService.updatePassword(editEntry.id, payload);
        toast.success('Senha atualizada!');
      } else {
        await dataService.addPassword({ ...payload, created_by_name: user?.name || user?.email || '' });
        toast.success('Senha salva no cofre!');
      }
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await dataService.deletePassword(confirmDelete.id);
      toast.success('Senha removida do cofre.');
      setConfirmDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportCSV = () => {
    if (entries.length === 0) { toast.error('Não há senhas para exportar.'); return; }
    const ok = confirm(
      'Isso baixa um arquivo com todas as senhas em TEXTO PURO (sem criptografia). ' +
      'Guarde em um local seguro e apague o arquivo depois de usar. Continuar?'
    );
    if (!ok) return;
    const header = ['Título', 'Categoria', 'Usuário/E-mail', 'Senha', 'URL', 'Observações', 'Adicionado por', 'Criado em'];
    const rows = entries.map((p) => [
      p.title,
      CATEGORY_MAP[p.category]?.label || p.category,
      p.username || '',
      p.password,
      p.url || '',
      p.notes || '',
      p.created_by_name || '',
      p.created_at ? formatDate(p.created_at) : '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `senhas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado! Guarde o arquivo em local seguro.');
  };

  const filtered = useMemo(() => {
    return entries
      .filter((p) => {
        const q = search.trim().toLowerCase();
        const matchSearch = !q ||
          p.title.toLowerCase().includes(q) ||
          (p.username || '').toLowerCase().includes(q) ||
          (p.url || '').toLowerCase().includes(q);
        const matchCategory =
          filterCategory === 'todas' ? true :
          filterCategory === 'favoritas' ? p.favorite :
          p.category === filterCategory;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => (Number(b.favorite) - Number(a.favorite)) || a.title.localeCompare(b.title));
  }, [entries, search, filterCategory]);

  const favoriteCount = entries.filter((p) => p.favorite).length;
  const strength = passwordStrength(form.password);

  const PasswordCard = ({ entry }: { entry: PasswordEntry }) => {
    const cat = CATEGORY_MAP[entry.category] || CATEGORY_MAP.outro;
    const Icon = cat.icon;
    const isRevealed = revealed.has(entry.id);
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${cat.color}1A`, color: cat.color }}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{entry.title}</p>
              <p className="text-[11px] text-neutral-400">{cat.label}</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleFavorite(entry)}
            className="p-1 flex-shrink-0"
            title={entry.favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
          >
            <Star size={16} className={entry.favorite ? 'fill-primary text-primary' : 'text-neutral-300 hover:text-neutral-400'} />
          </button>
        </div>

        {entry.username && (
          <div className="flex items-center justify-between gap-2 bg-neutral-50 rounded-xl px-3 py-2">
            <p className="text-xs text-neutral-600 truncate font-medium">{entry.username}</p>
            <button
              onClick={() => copyToClipboard(entry.username, 'Usuário')}
              className="p-1 text-neutral-400 hover:text-neutral-700 flex-shrink-0"
              title="Copiar usuário"
            >
              <Copy size={13} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 bg-neutral-50 rounded-xl px-3 py-2">
          <p className="text-xs text-neutral-800 truncate font-mono tracking-wide">
            {isRevealed ? entry.password : '•'.repeat(Math.max(entry.password.length, 8))}
          </p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => toggleReveal(entry.id)}
              className="p-1 text-neutral-400 hover:text-neutral-700"
              title={isRevealed ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              onClick={() => copyToClipboard(entry.password, 'Senha')}
              className="p-1 text-neutral-400 hover:text-neutral-700"
              title="Copiar senha"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        {entry.url && (
          <a
            href={/^https?:\/\//.test(entry.url) ? entry.url : `https://${entry.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-primary truncate"
          >
            <Link2 size={11} className="flex-shrink-0" /> <span className="truncate">{entry.url}</span>
          </a>
        )}

        {entry.notes && (
          <p className="text-[11px] text-neutral-400 line-clamp-2">{entry.notes}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-300 truncate">
            {entry.created_by_name ? `Adicionado por ${entry.created_by_name}` : 'Adicionado'}
            {entry.created_at ? ` · ${formatDate(entry.created_at)}` : ''}
          </p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => openEdit(entry)} className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
              <Pencil size={13} />
            </button>
            <button onClick={() => setConfirmDelete(entry)} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <KeyRound size={22} className="text-primary" /> Senhas
          </h2>
          <p className="text-neutral-500">
            <strong>{entries.length}</strong> senha{entries.length !== 1 ? 's' : ''} salva{entries.length !== 1 ? 's' : ''}
            {favoriteCount > 0 && <> · <span className="text-neutral-400">{favoriteCount} favorita{favoriteCount !== 1 ? 's' : ''}</span></>}
            {' '}· compartilhado com a equipe
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSQL((v) => !v)}
            className="text-xs text-neutral-400 hover:text-neutral-700 underline flex-shrink-0"
          >
            SQL necessário
          </button>
          <Button variant="secondary" leftIcon={<Download size={18} />} onClick={exportCSV}>
            Exportar
          </Button>
          <Button leftIcon={<Plus size={20} />} onClick={openAdd}>
            Nova Senha
          </Button>
        </div>
      </div>

      {/* SQL hint */}
      {showSQL && (
        <Card className="border-neutral-200 bg-neutral-50">
          <p className="text-sm font-bold text-neutral-700 mb-2">
            Execute no Supabase → SQL Editor para habilitar o cofre de senhas:
          </p>
          <pre className="text-xs bg-neutral-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {PASSWORDS_SQL}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => { navigator.clipboard.writeText(PASSWORDS_SQL); toast.success('SQL copiado!'); }}
          >
            Copiar SQL
          </Button>
        </Card>
      )}

      {/* Busca + filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por site, usuário ou link..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('todas')}
            className={cn(
              'flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors',
              filterCategory === 'todas' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterCategory('favoritas')}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors',
              filterCategory === 'favoritas' ? 'bg-primary text-neutral-900' : 'bg-neutral-100 text-neutral-600'
            )}
          >
            <Star size={11} /> Favoritas
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = filterCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors',
                  active ? 'text-white' : 'bg-neutral-100 text-neutral-600'
                )}
                style={active ? { backgroundColor: cat.color } : undefined}
              >
                <Icon size={11} /> {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="space-y-4">
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle size={18} className="text-neutral-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-neutral-800">Configure a tabela no Supabase primeiro</p>
                <p className="text-xs text-neutral-700 mt-1">
                  Execute o script abaixo no Supabase → SQL Editor para criar o cofre de senhas.
                  Depois volte aqui e adicione a primeira senha.
                </p>
              </div>
            </div>
            <pre className="text-xs bg-neutral-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap mb-3">
              {PASSWORDS_SQL}
            </pre>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(PASSWORDS_SQL); toast.success('SQL copiado! Cole no Supabase → SQL Editor e execute.'); }}
            >
              Copiar SQL
            </Button>
          </div>

          <Card className="py-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <KeyRound size={28} className="text-neutral-300" />
            </div>
            <div>
              <p className="font-bold text-neutral-700">Nenhuma senha salva ainda</p>
              <p className="text-sm text-neutral-400 mt-1">
                Depois de executar o SQL acima, adicione a primeira senha do cofre.
              </p>
            </div>
            <Button leftIcon={<Plus size={16} />} size="sm" onClick={openAdd}>
              Nova Senha
            </Button>
          </Card>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 flex flex-col items-center text-center space-y-2">
          <Search size={24} className="text-neutral-300" />
          <p className="font-bold text-neutral-700">Nenhuma senha encontrada</p>
          <p className="text-sm text-neutral-400">Ajuste a busca ou o filtro de categoria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <PasswordCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editEntry ? 'Editar Senha' : 'Nova Senha'} maxWidth="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Site / Serviço *"
            placeholder="Ex: Instagram @easyimports.bh"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoComplete="off"
            required
            autoFocus
          />

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = form.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors',
                      active ? 'text-white border-transparent' : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    )}
                    style={active ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon size={13} /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Usuário / E-mail de login"
            placeholder="Ex: contato@easyimports.com"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            autoComplete="off"
          />

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Senha *</label>
            <div className="relative">
              <input
                type={showFormPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Digite ou gere uma senha forte"
                autoComplete="new-password"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-4 pr-20 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button type="button" onClick={() => setShowFormPw((v) => !v)} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg" title={showFormPw ? 'Ocultar' : 'Mostrar'}>
                  {showFormPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button type="button" onClick={() => copyToClipboard(form.password, 'Senha')} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg" title="Copiar">
                  <Copy size={15} />
                </button>
              </div>
            </div>

            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {STRENGTH_LEVELS.map((lvl, i) => (
                    <div
                      key={lvl.label}
                      className="h-1.5 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: i <= strength.score ? strength.color : '#e5e5e5' }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-bold mt-1" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Wand2 size={14} />}
                onClick={() => setForm((f) => ({ ...f, password: generateStrongPassword(genOptions) }))}
              >
                Gerar senha forte
              </Button>
              <button type="button" onClick={() => setShowGenOptions((v) => !v)} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
                opções do gerador
              </button>
            </div>

            {showGenOptions && (
              <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-600">
                  <span>Tamanho</span>
                  <span>{genOptions.length} caracteres</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={32}
                  value={genOptions.length}
                  onChange={(e) => setGenOptions((g) => ({ ...g, length: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={genOptions.upper} onChange={(e) => setGenOptions((g) => ({ ...g, upper: e.target.checked }))} /> Maiúsculas (A-Z)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={genOptions.lower} onChange={(e) => setGenOptions((g) => ({ ...g, lower: e.target.checked }))} /> Minúsculas (a-z)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={genOptions.numbers} onChange={(e) => setGenOptions((g) => ({ ...g, numbers: e.target.checked }))} /> Números (0-9)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={genOptions.symbols} onChange={(e) => setGenOptions((g) => ({ ...g, symbols: e.target.checked }))} /> Símbolos (!@#$)
                  </label>
                </div>
              </div>
            )}
          </div>

          <Input
            label="Link do site"
            placeholder="Ex: instagram.com/easyimports.bh"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            autoComplete="off"
          />

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Ex: pergunta secreta, e-mail de recuperação, PIN adicional..."
              rows={2}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, favorite: !f.favorite }))}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-colors w-full justify-center',
              form.favorite ? 'bg-primary/10 border-primary/30 text-neutral-900' : 'bg-neutral-50 border-neutral-200 text-neutral-500'
            )}
          >
            <Star size={15} className={form.favorite ? 'fill-primary text-primary' : ''} />
            {form.favorite ? 'Marcada como favorita' : 'Marcar como favorita'}
          </button>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? 'Salvando...' : editEntry ? 'Salvar Alterações' : 'Salvar no Cofre'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover Senha" maxWidth="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Remover <strong>{confirmDelete.title}</strong> do cofre? Essa ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting} className="flex-1">
                {isDeleting ? 'Removendo...' : 'Sim, Remover'}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Senhas;
