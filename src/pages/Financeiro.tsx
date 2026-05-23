import React, { useEffect, useState, useMemo } from 'react';
import {
  DollarSign, Plus, Search, ArrowUpCircle, ArrowDownCircle, TrendingUp,
  Filter, Calendar, PieChart as PieChartIcon, Trash2, X, Pencil, BarChart3,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function fmtMonthKey(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const Financeiro: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTransaction, setEditTransaction] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', type: 'expense', category: 'rent', date: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Month navigator
  const todayKey = new Date().toISOString().slice(0, 7);
  const [viewMonth, setViewMonth] = useState(todayKey);
  const [effectingKey, setEffectingKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'rent',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [txData, salesData] = await Promise.all([
        dataService.getTransactions(),
        dataService.getSales(),
      ]);
      setTransactions(txData || []);
      setSales(salesData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Projected prazo installments grouped by month
  const projectedByMonth = useMemo(() => {
    const map: Record<string, { sale: any; inst: any; index: number }[]> = {};
    for (const sale of sales) {
      if (sale.sale_type !== 'prazo' || !sale.installments_json) continue;
      let insts: any[] = [];
      try { insts = JSON.parse(sale.installments_json); } catch { continue; }
      insts.forEach((inst: any, i: number) => {
        if (inst.paid_at) return;
        const mk = inst.due.slice(0, 7);
        if (!map[mk]) map[mk] = [];
        map[mk].push({ sale, inst, index: i });
      });
    }
    return map;
  }, [sales]);

  // Extended monthly flow: past (real) + future (projected)
  const extendedFlow = useMemo(() => {
    const realMap: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      const key = (t.date || '').slice(0, 7);
      if (!key) continue;
      if (!realMap[key]) realMap[key] = { income: 0, expense: 0 };
      if (t.type === 'income') realMap[key].income += Number(t.amount || 0);
      else realMap[key].expense += Number(t.amount || 0);
    }
    const projMap: Record<string, number> = {};
    for (const [mk, items] of Object.entries(projectedByMonth)) {
      projMap[mk] = items.reduce((s, { inst }) => s + inst.amount, 0);
    }
    const allKeys = new Set([...Object.keys(realMap), ...Object.keys(projMap)]);
    return [...allKeys]
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        key,
        income: realMap[key]?.income || 0,
        expense: realMap[key]?.expense || 0,
        projected: projMap[key] || 0,
        profit: (realMap[key]?.income || 0) - (realMap[key]?.expense || 0),
      }));
  }, [transactions, projectedByMonth]);

  const handleEffetivar = async (sale: any, instIndex: number) => {
    const key = `${sale.id}-${instIndex}`;
    try {
      setEffectingKey(key);
      const insts: any[] = JSON.parse(sale.installments_json || '[]');
      const paid_at = new Date().toISOString().slice(0, 10);
      const updated = insts.map((inst: any, i: number) =>
        i === instIndex ? { ...inst, paid_at } : inst
      );
      await dataService.updateSale(sale.id, { installments_json: JSON.stringify(updated) });
      const inst = insts[instIndex];
      await dataService.addTransaction({
        description: `Receita ${sale.sale_number} — Parcela ${instIndex + 1}/${insts.length} (${sale.customer_name || ''})`,
        amount: inst.amount,
        type: 'income',
        category: 'sale',
        date: paid_at,
      });
      toast.success(`Parcela ${instIndex + 1} efetivada!`);
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setEffectingKey(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) { toast.error('Informe um valor maior que zero.'); return; }
    try {
      setIsSaving(true);
      await dataService.addTransaction({ ...formData, amount });
      toast.success('Transação registrada!');
      setIsModalOpen(false);
      setFormData({ description: '', amount: '', type: 'expense', category: 'rent', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string, description: string) => {
    if (confirm(`Deseja remover o lançamento "${description}"?`)) {
      try {
        await dataService.deleteTransaction(id);
        toast.success('Lançamento removido!');
        fetchData();
      } catch (error: any) {
        toast.error('Erro ao remover: ' + error.message);
      }
    }
  };

  const handleOpenEdit = (t: any) => {
    setEditTransaction(t);
    setEditForm({
      description: t.description || '',
      amount: String(t.amount || ''),
      type: t.type || 'expense',
      category: t.category || 'other',
      date: t.date || new Date().toISOString().split('T')[0],
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTransaction) return;
    const amount = Number(editForm.amount);
    if (!amount || amount <= 0) { toast.error('Informe um valor maior que zero.'); return; }
    try {
      setIsSavingEdit(true);
      await dataService.updateTransaction(editTransaction.id, {
        description: editForm.description,
        amount,
        type: editForm.type,
        category: editForm.category,
        date: editForm.date,
      });
      toast.success('Lançamento atualizado!');
      setEditTransaction(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const cycleFilterType = () => {
    const next = filterType === 'all' ? 'income' : filterType === 'income' ? 'expense' : 'all';
    setFilterType(next);
    const labels = { all: 'Todos', income: 'Receitas', expense: 'Despesas' };
    toast.success(`Filtro: ${labels[next]}`);
  };

  const handleApplyPeriod = () => {
    setIsPeriodModalOpen(false);
    toast.success('Período aplicado!');
  };

  const clearFilters = () => {
    setFilterType('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterType !== 'all' || dateFrom || dateTo || searchTerm;

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesFrom = !dateFrom || new Date(t.date) >= new Date(dateFrom);
      const matchesTo = !dateTo || new Date(t.date) <= new Date(dateTo + 'T23:59:59');
      return matchesSearch && matchesType && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  const summaryBase = hasActiveFilters ? filteredTransactions : transactions;
  const totalIncome = summaryBase.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalExpense = summaryBase.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const filterTypeLabels = { all: 'Filtros', income: 'Receitas', expense: 'Despesas' };

  // Month view data
  const viewMonthTx = useMemo(
    () => transactions
      .filter(t => (t.date || '').slice(0, 7) === viewMonth)
      .sort((a, b) => {
        const d = (b.date || '').localeCompare(a.date || '');
        if (d !== 0) return d;
        return (b.created_at || '').localeCompare(a.created_at || '');
      }),
    [transactions, viewMonth]
  );
  const viewMonthProjected = projectedByMonth[viewMonth] || [];
  const viewMonthRealIncome = viewMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const viewMonthRealExpense = viewMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const viewMonthProjectedTotal = viewMonthProjected.reduce((s, { inst }) => s + inst.amount, 0);

  const thisMonthKey = todayKey;
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const thisMonthData = extendedFlow.find(m => m.key === thisMonthKey);
  const projectedIncome = thisMonthData && dayOfMonth < daysInMonth
    ? Math.round((thisMonthData.income / dayOfMonth) * daysInMonth)
    : null;

  const CATEGORY_LABELS: Record<string, string> = {
    sale: 'Venda', stock: 'Custo estoque', trade: 'Troca — Aparelho Recebido',
    rent: 'Aluguel', salaries: 'Salários', marketing: 'Marketing',
    taxes: 'Impostos', utilities: 'Serviços', other: 'Outros',
  };

  const isAutoTx = (t: any) =>
    /^(Receita|Custo|Venda) #/.test(t.description || '') ||
    t.description?.startsWith('Custo Mercadoria #');

  const columns = [
    { header: 'Descrição', accessor: (t: any) => (
      <div className="flex items-center gap-3 py-0.5">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black',
          t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
        )}>
          {t.type === 'income' ? '↑' : '↓'}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-neutral-900 leading-snug">{t.description}</span>
          {isAutoTx(t) && (
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Automático · gerado pela venda</span>
          )}
        </div>
      </div>
    )},
    { header: 'Categoria', accessor: (t: any) => (
      <span className={cn(
        'text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap',
        t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      )}>
        {CATEGORY_LABELS[t.category] || t.category || '—'}
      </span>
    )},
    { header: 'Data', accessor: (t: any) => (
      <span className="text-sm text-neutral-500 whitespace-nowrap">{formatDate(t.date)}</span>
    )},
    { header: 'Valor', accessor: (t: any) => (
      <span className={cn('font-black text-sm whitespace-nowrap', t.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
        {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
      </span>
    )},
    { header: 'Ações', accessor: (t: any) => (
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" iconOnly onClick={() => handleOpenEdit(t)} title="Editar">
          <Pencil size={14} />
        </Button>
        <Button variant="danger" size="sm" iconOnly onClick={() => handleDeleteTransaction(t.id, t.description)} title="Remover">
          <Trash2 size={14} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Financeiro</h2>
          <p className="text-neutral-500">Controle de caixa, lucros e despesas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setFormData({...formData, type: 'expense'}); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 h-11 rounded-lg border-2 border-red-200 bg-red-50 text-red-700 font-semibold text-base hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nova</span> Despesa
          </button>
          <Button leftIcon={<Plus size={20} />} onClick={() => { setFormData({...formData, type: 'income'}); setIsModalOpen(true); }}>
            <span className="hidden sm:inline">Nova</span> Receita
          </Button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/8 border border-primary/20 rounded-xl text-sm font-medium text-primary-900">
          <Calendar size={15} />
          <span>
            Resumo do período filtrado
            {dateFrom && dateTo ? ` — ${dateFrom.split('-').reverse().join('/')} a ${dateTo.split('-').reverse().join('/')}` : ''}
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="flex items-center gap-2 sm:gap-4 !p-3 sm:!p-5">
          <div className="p-2 sm:p-3 bg-success-light text-success rounded-xl flex-shrink-0">
            <ArrowUpCircle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">Entradas</p>
            <p className="text-base sm:text-xl font-bold text-neutral-900">{formatCurrency(totalIncome)}</p>
            {!hasActiveFilters && <p className="text-[10px] sm:text-xs text-neutral-400">Histórico total</p>}
          </div>
        </Card>
        <Card className="flex items-center gap-2 sm:gap-4 !p-3 sm:!p-5">
          <div className="p-2 sm:p-3 bg-danger-light text-danger rounded-xl flex-shrink-0">
            <ArrowDownCircle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">Saídas</p>
            <p className="text-base sm:text-xl font-bold text-neutral-900">{formatCurrency(totalExpense)}</p>
            {!hasActiveFilters && <p className="text-[10px] sm:text-xs text-neutral-400">Histórico total</p>}
          </div>
        </Card>
        <Card className="flex items-center gap-2 sm:gap-4 !p-3 sm:!p-5">
          <div className="p-2 sm:p-3 bg-primary-50 text-primary-900 rounded-xl flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">Lucro Líquido</p>
            <p className={cn('text-base sm:text-xl font-bold', netProfit >= 0 ? 'text-success' : 'text-danger')}>
              {formatCurrency(netProfit)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 sm:gap-4 !p-3 sm:!p-5 border-2 border-primary-100 bg-primary-50/20">
          <div className="p-2 sm:p-3 bg-primary text-black rounded-xl flex-shrink-0">
            <PieChartIcon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">Margem</p>
            <p className={cn('text-base sm:text-xl font-bold', margin >= 0 ? 'text-neutral-900' : 'text-danger')}>{margin.toFixed(1)}%</p>
          </div>
        </Card>
      </div>

      {/* ── Navegador de Meses ── */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Month selector header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-neutral-400" />
            <p className="font-black text-sm text-neutral-700 uppercase tracking-widest">Visão do Mês</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setViewMonth(todayKey)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-bold capitalize border transition-colors',
                viewMonth === todayKey
                  ? 'bg-primary border-primary/40 text-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-primary/40'
              )}
            >
              {fmtMonthKey(viewMonth)}
              {viewMonth > todayKey && <span className="ml-1.5 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-black">Previsto</span>}
              {viewMonth === todayKey && <span className="ml-1.5 text-[9px] bg-primary/10 text-primary-900 px-1.5 py-0.5 rounded-full font-black">Atual</span>}
            </button>
            <button
              onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month summary bar */}
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100">
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Receitas reais</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(viewMonthRealIncome)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Saídas reais</p>
            <p className="text-lg font-black text-red-500">{formatCurrency(viewMonthRealExpense)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
              <Clock size={10} /> Previsto a prazo
            </p>
            <p className="text-lg font-black text-orange-600">{formatCurrency(viewMonthProjectedTotal)}</p>
          </div>
        </div>

        {/* Projected installments for this month */}
        {viewMonthProjected.length > 0 && (
          <div className="border-b border-orange-100">
            <div className="px-5 py-2 bg-orange-50 border-b border-orange-100">
              <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Parcelas a Prazo — Aguardando Pagamento</p>
            </div>
            <div className="divide-y divide-orange-50">
              {viewMonthProjected.map(({ sale, inst, index }) => {
                const key = `${sale.id}-${index}`;
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue = inst.due < today;
                return (
                  <div key={key} className={cn(
                    'flex items-center gap-3 px-5 py-3',
                    isOverdue ? 'bg-red-50/50' : 'bg-white'
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">
                        {sale.customer_name} — {sale.product_name || '—'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {sale.sale_number} · Parcela {inst.n} · vence {inst.due.split('-').reverse().join('/')}
                        {isOverdue && <span className="ml-1.5 text-red-600 font-bold">ATRASADA</span>}
                      </p>
                    </div>
                    <span className={cn('text-sm font-black', isOverdue ? 'text-red-600' : 'text-orange-700')}>
                      {formatCurrency(inst.amount)}
                    </span>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full hidden sm:block">
                      Previsto
                    </span>
                    <button
                      onClick={() => handleEffetivar(sale, index)}
                      disabled={effectingKey === key}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors flex-shrink-0',
                        isOverdue
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200',
                        effectingKey === key && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {effectingKey === key ? (
                        <span className="animate-spin">↻</span>
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      Efetivar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Real transactions for this month */}
        {viewMonthTx.length > 0 ? (
          <div>
            <div className="px-5 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Lançamentos do Mês</p>
              <span className="text-[10px] font-bold text-neutral-400">{viewMonthTx.length} lançamento{viewMonthTx.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {viewMonthTx.map(t => (
                <div key={t.id} className="flex items-center gap-0 hover:bg-neutral-50 transition-colors">
                  {/* Colored left stripe */}
                  <div className={cn('w-1 self-stretch flex-shrink-0 rounded-r', t.type === 'income' ? 'bg-emerald-400' : 'bg-red-400')} />
                  <div className="flex items-center gap-3 flex-1 px-4 py-3.5 min-w-0">
                    {/* Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black',
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    )}>
                      {t.type === 'income' ? '↑' : '↓'}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 leading-snug truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{formatDate(t.date)}</span>
                        <span className="text-neutral-200 text-xs">·</span>
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        )}>
                          {CATEGORY_LABELS[t.category] || t.category || '—'}
                        </span>
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      <span className={cn('text-sm font-black', t.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                        {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteTransaction(t.id, t.description)}
                      className="ml-2 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Remover lançamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : viewMonthProjected.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-neutral-400">
            Nenhum lançamento em {fmtMonthKey(viewMonth)}.
          </div>
        )}
      </div>

      {/* Fluxo de Caixa Mensal */}
      {extendedFlow.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <BarChart3 size={16} className="text-neutral-400" />
            <p className="font-black text-sm text-neutral-700 uppercase tracking-widest">Fluxo de Caixa Mensal</p>
            {projectedIncome !== null && (
              <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                Projeção mês atual: {formatCurrency(projectedIncome)}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left px-3 sm:px-5 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Mês</th>
                  <th className="text-right px-2 sm:px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Entr.</th>
                  <th className="text-right px-2 sm:px-4 py-2.5 text-[10px] font-black text-orange-400 uppercase tracking-widest">Previsto</th>
                  <th className="text-right px-2 sm:px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Saíd.</th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {extendedFlow.map(m => {
                  const isFuture = m.key > thisMonthKey;
                  const isCurrent = m.key === thisMonthKey;
                  return (
                    <tr
                      key={m.key}
                      onClick={() => setViewMonth(m.key)}
                      className={cn(
                        'hover:bg-neutral-50 transition-colors cursor-pointer',
                        isCurrent && 'bg-primary/5',
                        viewMonth === m.key && 'ring-1 ring-inset ring-primary/30',
                      )}
                    >
                      <td className="px-3 sm:px-5 py-3 font-semibold text-neutral-800 capitalize text-xs sm:text-sm">
                        {fmtMonthKey(m.key)}
                        {isCurrent && <span className="ml-1.5 text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Atual</span>}
                        {isFuture && m.projected > 0 && <span className="ml-1.5 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">Previsto</span>}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-right font-bold text-emerald-600 text-xs sm:text-sm">{m.income > 0 ? formatCurrency(m.income) : '—'}</td>
                      <td className="px-2 sm:px-4 py-3 text-right font-bold text-orange-500 text-xs sm:text-sm">{m.projected > 0 ? formatCurrency(m.projected) : '—'}</td>
                      <td className="px-2 sm:px-4 py-3 text-right font-bold text-red-500 text-xs sm:text-sm">{m.expense > 0 ? formatCurrency(m.expense) : '—'}</td>
                      <td className={cn('px-3 sm:px-5 py-3 text-right font-black text-xs sm:text-sm',
                        isFuture && m.income === 0 ? 'text-orange-500' : m.profit >= 0 ? 'text-neutral-900' : 'text-red-600'
                      )}>
                        {isFuture && m.income === 0 && m.projected > 0
                          ? `+${formatCurrency(m.projected)}`
                          : m.profit !== 0 ? `${m.profit >= 0 ? '+' : ''}${formatCurrency(m.profit)}` : '—'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction filters + table */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <Input
          placeholder="Buscar transação..."
          leftIcon={<Search size={20} />}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={filterType !== 'all' ? 'primary' : 'secondary'}
            leftIcon={<Filter size={18} />}
            onClick={cycleFilterType}
          >
            {filterTypeLabels[filterType]}
          </Button>
          <Button
            className="flex-1"
            variant={dateFrom || dateTo ? 'primary' : 'secondary'}
            leftIcon={<Calendar size={18} />}
            onClick={() => setIsPeriodModalOpen(true)}
          >
            {dateFrom || dateTo ? 'Período ativo' : 'Período'}
          </Button>
          {hasActiveFilters && (
            <Button variant="secondary" iconOnly onClick={clearFilters}>
              <X size={18} />
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <p className="text-sm text-neutral-500">
          Mostrando {filteredTransactions.length} de {transactions.length} transações
        </p>
      )}

      <Table
        columns={columns}
        data={filteredTransactions}
        isLoading={isLoading}
        emptyMessage="Nenhuma movimentação financeira encontrada."
      />

      {/* Period modal */}
      <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Filtrar por Período">
        <div className="space-y-4">
          <Input label="Data inicial" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input label="Data final" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => { setDateFrom(''); setDateTo(''); setIsPeriodModalOpen(false); }}>
              Limpar
            </Button>
            <Button fullWidth onClick={handleApplyPeriod}>
              Aplicar Filtro
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add transaction modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Lançamento"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'income'})}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
                formData.type === 'income'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              <ArrowUpCircle size={16} className={formData.type === 'income' ? 'text-emerald-500' : ''} />
              Receita
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'expense'})}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
                formData.type === 'expense'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              <ArrowDownCircle size={16} className={formData.type === 'expense' ? 'text-red-500' : ''} />
              Despesa
            </button>
          </div>

          <Input
            label="Descrição"
            placeholder={formData.type === 'income' ? 'Ex: Venda de iPhone 15' : 'Ex: Aluguel da Loja'}
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
            <Input
              label="Data"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Categoria</label>
            <select
              className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="sale">Venda de Produto</option>
              <option value="trade">Troca — Aparelho Recebido</option>
              <option value="rent">Aluguel</option>
              <option value="salaries">Salários / Pro-labore</option>
              <option value="marketing">Marketing (Ads)</option>
              <option value="stock">Compra de Estoque</option>
              <option value="taxes">Impostos</option>
              <option value="utilities">Água/Luz/Internet</option>
              <option value="other">Outros</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-50',
                formData.type === 'income'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              )}
            >
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : (formData.type === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />)}
              {formData.type === 'income' ? 'Registrar Receita' : 'Registrar Despesa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit transaction modal */}
      <Modal isOpen={!!editTransaction} onClose={() => setEditTransaction(null)} title="Editar Lançamento">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Descrição"
            required
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="any"
              inputMode="decimal"
              required
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
            />
            <Input
              label="Data"
              type="date"
              required
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'income', label: 'Entrada' }, { value: 'expense', label: 'Saída' }].map((opt) => (
                <label key={opt.value} className={cn(
                  'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  editForm.type === opt.value
                    ? opt.value === 'income' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                )}>
                  <input type="radio" className="hidden" value={opt.value} checked={editForm.type === opt.value}
                    onChange={() => setEditForm({ ...editForm, type: opt.value })} />
                  <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex-shrink-0',
                    editForm.type === opt.value
                      ? opt.value === 'income' ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500'
                      : 'border-neutral-300'
                  )} />
                  <span className="text-sm font-bold text-neutral-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            >
              <option value="sale">Venda de Produto</option>
              <option value="trade">Troca — Aparelho Recebido</option>
              <option value="rent">Aluguel</option>
              <option value="salaries">Salários / Pro-labore</option>
              <option value="marketing">Marketing (Ads)</option>
              <option value="stock">Compra de Estoque</option>
              <option value="taxes">Impostos</option>
              <option value="utilities">Água/Luz/Internet</option>
              <option value="other">Outros</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setEditTransaction(null)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingEdit} type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
