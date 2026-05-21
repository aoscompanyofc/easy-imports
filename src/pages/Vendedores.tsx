import React, { useEffect, useState, useMemo } from 'react';
import {
  Users2, Plus, Pencil, Trash2, Target, Award,
  TrendingUp, TrendingDown, AlertCircle, BarChart3,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SELLER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EF4444', '#06B6D4', '#F97316', '#EC4899',
];

const SELLER_SQL = `-- Execute no Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Vendedor',
  monthly_goal NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sellers"
ON sellers FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_display_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_devices_json TEXT;`;

interface Seller {
  id: string;
  name: string;
  role: string;
  monthly_goal: number;
  color: string;
  active: boolean;
  created_at: string;
}

const emptySellerForm = () => ({
  name: '',
  role: 'Vendedor',
  monthly_goal: '',
  color: SELLER_COLORS[0],
});

export const Vendedores: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSeller, setEditSeller] = useState<Seller | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Seller | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [form, setForm] = useState(emptySellerForm());

  const setF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const now = new Date();
  const currentMonthKey = format(now, 'yyyy-MM');
  const lastMonthKey = format(subMonths(now, 1), 'yyyy-MM');
  const currentMonthLabel = format(now, 'MMMM yyyy', { locale: ptBR });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [sellersData, salesData] = await Promise.all([
        dataService.getSellers(),
        dataService.getSales(),
      ]);
      setSellers(sellersData || []);
      setSales(salesData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar vendas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const sellerStats = useMemo(() => {
    return sellers.map((seller) => {
      const monthSales = sales.filter((s) => {
        if (!s.seller_id || s.seller_id !== seller.id) return false;
        const sKey = s.created_at ? format(new Date(s.created_at), 'yyyy-MM') : '';
        return sKey === currentMonthKey;
      });
      const lastMonthSales = sales.filter((s) => {
        if (!s.seller_id || s.seller_id !== seller.id) return false;
        const sKey = s.created_at ? format(new Date(s.created_at), 'yyyy-MM') : '';
        return sKey === lastMonthKey;
      });

      const revenue = monthSales.reduce((a, s) => a + Number(s.total_amount || 0), 0);
      const lastRevenue = lastMonthSales.reduce((a, s) => a + Number(s.total_amount || 0), 0);
      const count = monthSales.length;
      const lastCount = lastMonthSales.length;
      const goal = Number(seller.monthly_goal) || 0;
      const pct = goal > 0 ? (revenue / goal) * 100 : 0;
      const trend = lastRevenue > 0 ? ((revenue - lastRevenue) / lastRevenue) * 100 : null;

      return { seller, revenue, lastRevenue, count, lastCount, goal, pct, trend };
    });
  }, [sellers, sales, currentMonthKey, lastMonthKey]);

  const maxRevenue = useMemo(
    () => Math.max(...sellerStats.map((s) => s.revenue), 1),
    [sellerStats]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome do vendedor.'); return; }
    try {
      setIsSaving(true);
      const payload = {
        name: form.name.trim(),
        role: form.role.trim() || 'Vendedor',
        monthly_goal: Number(form.monthly_goal) || 0,
        color: form.color,
      };
      if (editSeller) {
        await dataService.updateSeller(editSeller.id, payload);
        toast.success('Vendedor atualizado!');
      } else {
        await dataService.addSeller(payload);
        toast.success('Vendedor adicionado!');
      }
      setIsModalOpen(false);
      setEditSeller(null);
      setForm(emptySellerForm());
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
      await dataService.deleteSeller(confirmDelete.id);
      toast.success('Vendedor removido.');
      setConfirmDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (seller: Seller) => {
    setEditSeller(seller);
    setForm({
      name: seller.name,
      role: seller.role || 'Vendedor',
      monthly_goal: seller.monthly_goal ? String(seller.monthly_goal) : '',
      color: seller.color || SELLER_COLORS[0],
    });
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditSeller(null);
    setForm({ ...emptySellerForm(), color: SELLER_COLORS[sellers.length % SELLER_COLORS.length] });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditSeller(null);
    setForm(emptySellerForm());
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Vendedores</h2>
          <p className="text-neutral-500 capitalize">
            Desempenho de <strong>{currentMonthLabel}</strong> — atualizado automaticamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="text-xs text-neutral-400 hover:text-neutral-700 underline"
          >
            SQL necessário
          </button>
          <Button leftIcon={<Plus size={20} />} onClick={openAdd}>
            Adicionar Vendedor
          </Button>
        </div>
      </div>

      {/* SQL hint */}
      {showSQL && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-bold text-neutral-700 mb-2">
            Execute no Supabase → SQL Editor para habilitar vendedores:
          </p>
          <pre className="text-xs bg-neutral-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {SELLER_SQL}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => { navigator.clipboard.writeText(SELLER_SQL); toast.success('SQL copiado!'); }}
          >
            Copiar SQL
          </Button>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="space-y-4">
          {/* Setup hint — shown automatically since table may not exist yet */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Configure a tabela no Supabase primeiro</p>
                <p className="text-xs text-amber-700 mt-1">
                  Execute o script abaixo no Supabase → SQL Editor para criar a tabela de vendedores.
                  Depois volte aqui e adicione o primeiro vendedor.
                </p>
              </div>
            </div>
            <pre className="text-xs bg-neutral-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap mb-3">
              {SELLER_SQL}
            </pre>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(SELLER_SQL); toast.success('SQL copiado! Cole no Supabase → SQL Editor e execute.'); }}
            >
              Copiar SQL
            </Button>
          </div>

          <Card className="py-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <Users2 size={28} className="text-neutral-300" />
            </div>
            <div>
              <p className="font-bold text-neutral-700">Nenhum vendedor cadastrado</p>
              <p className="text-sm text-neutral-400 mt-1">
                Após executar o SQL acima, adicione o primeiro vendedor.
              </p>
            </div>
            <Button leftIcon={<Plus size={16} />} size="sm" onClick={openAdd}>
              Adicionar Vendedor
            </Button>
          </Card>
        </div>
      ) : (
        <>
          {/* Performance cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sellerStats.map(({ seller, revenue, count, lastCount, goal, pct, trend }) => (
              <div
                key={seller.id}
                className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-xl flex-shrink-0"
                      style={{ backgroundColor: seller.color || '#3B82F6' }}
                    >
                      {seller.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 leading-tight">{seller.name}</p>
                      <p className="text-xs text-neutral-400">{seller.role || 'Vendedor'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(seller)}
                      className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(seller)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-400 font-medium mb-0.5">Receita</p>
                    <p className="text-base font-black text-neutral-900">{formatCurrency(revenue)}</p>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-400 font-medium mb-0.5">Vendas</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-base font-black text-neutral-900">{count}</p>
                      {lastCount > 0 && (
                        <p className="text-[10px] text-neutral-400">vs {lastCount}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Goal progress */}
                {goal > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Target size={12} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500">
                          Meta {formatCurrency(goal)}
                        </span>
                      </div>
                      <span className={cn(
                        'text-xs font-black',
                        pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-500' : 'text-neutral-500'
                      )}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: pct >= 100 ? '#10B981' : pct >= 70 ? '#F59E0B' : seller.color || '#3B82F6',
                        }}
                      />
                    </div>
                    {pct >= 100 ? (
                      <p className="text-xs text-green-600 font-bold mt-1.5 flex items-center gap-1">
                        <Award size={11} /> Meta atingida!
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-400 mt-1.5">
                        Faltam {formatCurrency(goal - revenue)} para a meta
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-300 italic">Sem meta definida — edite para adicionar</p>
                )}

                {/* Trend */}
                {trend !== null && (
                  <div className={cn(
                    'flex items-center gap-1.5 mt-3 pt-3 border-t border-neutral-100 text-xs font-bold',
                    trend >= 0 ? 'text-green-600' : 'text-red-500'
                  )}>
                    {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {trend >= 0 ? '+' : ''}{Math.round(trend)}% vs mês anterior
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparative chart */}
          {sellerStats.length > 1 && (
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={18} className="text-neutral-400" />
                <p className="text-sm font-bold text-neutral-700 capitalize">
                  Comparativo — {currentMonthLabel}
                </p>
              </div>
              <div className="space-y-4">
                {sellerStats
                  .slice()
                  .sort((a, b) => b.revenue - a.revenue)
                  .map(({ seller, revenue, count }, rank) => (
                    <div key={seller.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0',
                            rank === 0 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                          )}>
                            {rank + 1}
                          </span>
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: seller.color || '#3B82F6' }}
                          />
                          <span className="text-sm font-medium text-neutral-700">{seller.name}</span>
                          <span className="text-xs text-neutral-400">
                            {count} venda{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-black text-neutral-900">
                          {formatCurrency(revenue)}
                        </span>
                      </div>
                      <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(revenue / maxRevenue) * 100}%`,
                            backgroundColor: seller.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Ex: Arthur"
            value={form.name}
            onChange={setF('name')}
            autoComplete="off"
            required
          />
          <Input
            label="Cargo / Função"
            placeholder="Ex: Vendedor, Gerente, Consultor..."
            value={form.role}
            onChange={setF('role')}
            autoComplete="off"
          />
          <Input
            label="Meta Mensal de Receita (R$)"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="Ex: 30000"
            value={form.monthly_goal}
            onChange={setF('monthly_goal')}
          />
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">
              Cor de Identificação
            </label>
            <div className="flex gap-2 flex-wrap">
              {SELLER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    'w-9 h-9 rounded-full border-2 transition-all flex-shrink-0',
                    form.color === color
                      ? 'border-neutral-900 scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? 'Salvando...' : editSeller ? 'Salvar Alterações' : 'Adicionar Vendedor'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remover Vendedor"
        maxWidth="sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Remover <strong>{confirmDelete.name}</strong>?{' '}
                As vendas já registradas não serão afetadas — apenas o cadastro será deletado.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
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
