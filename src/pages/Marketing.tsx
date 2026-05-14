import React, { useEffect, useState } from 'react';
import {
  Megaphone, Plus, TrendingUp, DollarSign, Target, Users,
  Play, Pause, Trash2, Calendar, ChevronDown, Copy, Check,
  BarChart3, Loader2, FileText, Edit3,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLATFORMS = [
  'Instagram Ads', 'Facebook Ads', 'Google Ads', 'TikTok Ads',
  'YouTube Ads', 'WhatsApp', 'Pinterest Ads', 'LinkedIn Ads', 'Outros',
];

const OBJECTIVES = [
  'Geração de Leads', 'Conversão / Vendas', 'Reconhecimento de Marca',
  'Tráfego para Site', 'Engajamento', 'Retargeting',
];

const PLATFORM_COLORS: Record<string, string> = {
  'Instagram Ads': 'bg-pink-100 text-pink-700',
  'Facebook Ads': 'bg-blue-100 text-blue-700',
  'Google Ads': 'bg-red-100 text-red-700',
  'TikTok Ads': 'bg-neutral-900 text-white',
  'YouTube Ads': 'bg-red-100 text-red-700',
  'WhatsApp': 'bg-green-100 text-green-700',
  'Pinterest Ads': 'bg-rose-100 text-rose-700',
  'LinkedIn Ads': 'bg-sky-100 text-sky-700',
  'Outros': 'bg-neutral-100 text-neutral-600',
};

const EXTRA_COLUMNS_SQL = `-- Execute no Supabase Dashboard → SQL Editor
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS results_text TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;`;

const emptyForm = () => ({
  name: '',
  platform: 'Instagram Ads',
  objective: 'Geração de Leads',
  target_audience: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  budget: '',
  spent: '0',
  leads_count: '0',
  description: '',
  results_text: '',
  status: 'active',
});

export const Marketing: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getCampaigns();
      setCampaigns(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar campanhas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const openNew = () => {
    setEditingCampaign(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const openEdit = (campaign: any) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name || '',
      platform: campaign.platform || 'Instagram Ads',
      objective: campaign.objective || 'Geração de Leads',
      target_audience: campaign.target_audience || '',
      start_date: campaign.start_date || new Date().toISOString().split('T')[0],
      end_date: campaign.end_date || '',
      budget: String(campaign.budget || ''),
      spent: String(campaign.spent || '0'),
      leads_count: String(campaign.leads_count || '0'),
      description: campaign.description || '',
      results_text: campaign.results_text || '',
      status: campaign.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Nome da campanha é obrigatório.'); return; }
    if (!formData.budget) { toast.error('Investimento é obrigatório.'); return; }
    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        budget: Number(formData.budget),
        spent: Number(formData.spent) || 0,
        leads_count: Number(formData.leads_count) || 0,
        end_date: formData.end_date || null,
      };
      if (editingCampaign) {
        await dataService.updateCampaign(editingCampaign.id, payload);
        toast.success('Campanha atualizada!');
      } else {
        await dataService.addCampaign(payload);
        toast.success('Campanha criada com sucesso!');
      }
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await dataService.updateCampaign(id, { status: newStatus });
      toast.success(newStatus === 'active' ? 'Campanha ativada!' : 'Campanha pausada!');
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover a campanha "${name}"?`)) return;
    try {
      await dataService.deleteCampaign(id);
      toast.success('Campanha removida!');
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(EXTRA_COLUMNS_SQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  // KPIs
  const totalBudget = campaigns.reduce((a, c) => a + Number(c.budget || 0), 0);
  const totalSpent = campaigns.reduce((a, c) => a + Number(c.spent || 0), 0);
  const totalLeads = campaigns.reduce((a, c) => a + Number(c.leads_count || 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Marketing</h2>
          <p className="text-neutral-500">Gestão de campanhas e tráfego pago</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="text-xs text-neutral-400 hover:text-neutral-700 underline"
          >
            SQL extra campos
          </button>
          <Button leftIcon={<Plus size={20} />} onClick={openNew}>
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* SQL setup hint */}
      {showSQL && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-700 mb-2">
                Execute no Supabase Dashboard → SQL Editor para habilitar todos os campos:
              </p>
              <pre className="text-xs bg-neutral-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {EXTRA_COLUMNS_SQL}
              </pre>
            </div>
            <button
              onClick={copySQL}
              className="flex items-center gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              {copiedSQL ? <Check size={12} /> : <Copy size={12} />}
              {copiedSQL ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Orçamento Total', value: formatCurrency(totalBudget), icon: DollarSign, color: 'bg-primary/10 text-primary-900' },
          { label: 'Total Investido', value: formatCurrency(totalSpent), icon: TrendingUp, color: 'bg-blue-100 text-blue-700' },
          { label: 'Leads Gerados', value: `${totalLeads}`, icon: Users, color: 'bg-green-100 text-green-700' },
          { label: 'CPL Médio', value: formatCurrency(avgCpl), icon: Target, color: 'bg-purple-100 text-purple-700' },
        ].map((kpi) => (
          <Card key={kpi.label} className="flex items-center gap-4">
            <div className={cn('p-3 rounded-xl flex-shrink-0', kpi.color)}>
              <kpi.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider truncate">{kpi.label}</p>
              <p className="text-xl font-black text-neutral-900">{kpi.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Campaign Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="py-20 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Megaphone size={32} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-neutral-900 text-lg">Nenhuma campanha cadastrada</p>
            <p className="text-neutral-500 text-sm mt-1">Crie sua primeira campanha para acompanhar resultados.</p>
          </div>
          <Button leftIcon={<Plus size={18} />} onClick={openNew}>Criar Campanha</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {campaigns.map((campaign) => {
            const budget = Number(campaign.budget || 0);
            const spent = Number(campaign.spent || 0);
            const leads = Number(campaign.leads_count || 0);
            const cpl = leads > 0 ? spent / leads : 0;
            const spentPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const platformColor = PLATFORM_COLORS[campaign.platform] || PLATFORM_COLORS['Outros'];
            const isActive = campaign.status === 'active';

            return (
              <Card key={campaign.id} className="flex flex-col gap-4 hover:shadow-md transition-shadow">
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', platformColor)}>
                    {campaign.platform}
                  </span>
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold',
                    isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {isActive ? '● Ativa' : '⏸ Pausada'}
                  </span>
                </div>

                {/* Name + objective */}
                <div>
                  <h3 className="font-black text-neutral-900 text-lg leading-tight">{campaign.name}</h3>
                  {campaign.objective && (
                    <p className="text-xs text-primary-700 font-bold mt-0.5">{campaign.objective}</p>
                  )}
                  {campaign.target_audience && (
                    <p className="text-xs text-neutral-400 mt-0.5">🎯 {campaign.target_audience}</p>
                  )}
                </div>

                {/* Description */}
                {campaign.description && (
                  <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2 border-l-2 border-primary pl-3">
                    {campaign.description}
                  </p>
                )}

                {/* Budget progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Gasto: <strong className="text-neutral-900">{formatCurrency(spent)}</strong></span>
                    <span>Orçamento: <strong className="text-neutral-900">{formatCurrency(budget)}</strong></span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', spentPct >= 90 ? 'bg-danger' : spentPct >= 70 ? 'bg-warning' : 'bg-primary')}
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 text-right">{spentPct.toFixed(0)}% utilizado</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-neutral-100">
                  {[
                    { label: 'Leads', value: leads },
                    { label: 'CPL', value: formatCurrency(cpl) },
                    { label: 'Retorno', value: budget > 0 && spent > 0 ? `${(budget / spent).toFixed(1)}x` : '—' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-sm font-black text-neutral-900">{stat.value}</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wide">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Dates */}
                {(campaign.start_date || campaign.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Calendar size={12} />
                    <span>
                      {campaign.start_date ? new Date(campaign.start_date + 'T00:00:00').toLocaleDateString('pt-BR') : '?'}
                      {campaign.end_date ? ` → ${new Date(campaign.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ' → em aberto'}
                    </span>
                  </div>
                )}

                {/* Results */}
                {campaign.results_text && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">📊 Resultados</p>
                    <p className="text-sm text-green-800 leading-relaxed">{campaign.results_text}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => openEdit(campaign)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => toggleStatus(campaign.id, campaign.status)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                    title={isActive ? 'Pausar' : 'Ativar'}
                  >
                    {isActive ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id, campaign.name)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Nova / Editar Campanha */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Seção 1: Identificação */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Identificação</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nome da Campanha *"
                  placeholder="Ex: Lançamento iPhone 15 — Verão 2025"
                  value={formData.name}
                  onChange={set('name')}
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Plataforma *</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  value={formData.platform}
                  onChange={set('platform')}
                >
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Objetivo</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  value={formData.objective}
                  onChange={set('objective')}
                >
                  {OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Status</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  value={formData.status}
                  onChange={set('status')}
                >
                  <option value="active">Ativa</option>
                  <option value="paused">Pausada</option>
                  <option value="finished">Encerrada</option>
                </select>
              </div>
              <Input
                label="Público-alvo"
                placeholder="Ex: Homens 25-45, SP, interessados em tecnologia"
                value={formData.target_audience}
                onChange={set('target_audience')}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Seção 2: Datas */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Período</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data de Início *" type="date" value={formData.start_date} onChange={set('start_date')} required />
              <Input label="Data de Término" type="date" value={formData.end_date} onChange={set('end_date')} />
            </div>
          </div>

          {/* Seção 3: Financeiro */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Financeiro</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Orçamento Total (R$) *"
                type="number"
                placeholder="0,00"
                value={formData.budget}
                onChange={set('budget')}
                required
              />
              <Input
                label="Gasto Atual (R$)"
                type="number"
                placeholder="0,00"
                value={formData.spent}
                onChange={set('spent')}
              />
              <Input
                label="Leads Gerados"
                type="number"
                placeholder="0"
                value={formData.leads_count}
                onChange={set('leads_count')}
              />
            </div>
          </div>

          {/* Seção 4: Descrição e Resultados */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Descrição & Resultados</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Descrição / Estratégia</label>
                <textarea
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all resize-none"
                  rows={3}
                  placeholder="Descreva a estratégia, criativos usados, abordagem de copy, etc."
                  value={formData.description}
                  onChange={set('description')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Resultados Obtidos</label>
                <textarea
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all resize-none"
                  rows={3}
                  placeholder="Documente os resultados: conversões, ROI, aprendizados, o que funcionou..."
                  value={formData.results_text}
                  onChange={set('results_text')}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSaving} type="submit">
              {editingCampaign ? 'Salvar Alterações' : 'Criar Campanha'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Marketing;
