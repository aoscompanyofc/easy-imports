import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, Plus, Search, ArrowUpCircle, ArrowDownCircle, TrendingUp, Filter, Calendar, PieChart as PieChartIcon, Trash2, X, Pencil, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
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

export const Financeiro: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
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

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'rent',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar transações: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) { toast.error('Informe um valor maior que zero.'); return; }
    try {
      setIsSaving(true);
      await dataService.addTransaction({
        ...formData,
        amount,
      });
      toast.success('Transação registrada!');
      setIsModalOpen(false);
      setFormData({ description: '', amount: '', type: 'expense', category: 'rent', date: new Date().toISOString().split('T')[0] });
      fetchTransactions();
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
        fetchTransactions();
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
      fetchTransactions();
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

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesFrom = !dateFrom || new Date(t.date) >= new Date(dateFrom);
    const matchesTo = !dateTo || new Date(t.date) <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesType && matchesFrom && matchesTo;
  });

  // Cards always reflect the currently filtered view (when no filters, = all-time)
  const summaryBase = hasActiveFilters ? filteredTransactions : transactions;
  const totalIncome = summaryBase.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalExpense = summaryBase.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const filterTypeLabels = { all: 'Filtros', income: 'Receitas', expense: 'Despesas' };

  const monthlyFlow = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      const key = (t.date || '').slice(0, 7);
      if (!key) continue;
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (t.type === 'income') map[key].income += Number(t.amount || 0);
      else map[key].expense += Number(t.amount || 0);
    }
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, v]) => ({ key, ...v, profit: v.income - v.expense }));
  }, [transactions]);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const thisMonthData = monthlyFlow.find(m => m.key === thisMonthKey);
  const projectedIncome = thisMonthData && dayOfMonth < daysInMonth
    ? Math.round((thisMonthData.income / dayOfMonth) * daysInMonth)
    : null;

  function fmtMonth(key: string) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  const CATEGORY_LABELS: Record<string, string> = {
    sale: 'Venda', stock: 'Custo estoque', trade: 'Troca — Aparelho Recebido',
    rent: 'Aluguel', salaries: 'Salários', marketing: 'Marketing',
    taxes: 'Impostos', utilities: 'Serviços', other: 'Outros',
  };

  // Transações auto-geradas pelo sistema têm descrição começando em Receita/Custo + nº operação
  const isAutoTx = (t: any) =>
    /^(Receita|Custo|Venda) #/.test(t.description || '') ||
    t.description?.startsWith('Custo Mercadoria #');

  const columns = [
    { header: 'Descrição', accessor: (t: any) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-neutral-900">{t.description}</span>
        {isAutoTx(t) && (
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Automático · gerado pela venda</span>
        )}
      </div>
    )},
    { header: 'Categoria', accessor: (t: any) => (
      <span className="text-sm text-neutral-600">{CATEGORY_LABELS[t.category] || t.category || '—'}</span>
    )},
    { header: 'Data', accessor: (t: any) => formatDate(t.date) },
    { header: 'Valor', accessor: (t: any) => (
      <span className={t.type === 'income' ? 'text-success font-bold' : 'text-danger font-bold'}>
        {t.type === 'income' ? '+' : '−'} {formatCurrency(t.amount)}
      </span>
    )},
    { header: 'Tipo', accessor: (t: any) => (
      <Badge variant={t.type === 'income' ? 'success' : 'danger'}>
        {t.type === 'income' ? 'Entrada' : 'Saída'}
      </Badge>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Financeiro</h2>
          <p className="text-neutral-500">Controle de caixa, lucros e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" leftIcon={<Plus size={20} />} onClick={() => { setFormData({...formData, type: 'expense'}); setIsModalOpen(true); }}>
            Nova Despesa
          </Button>
          <Button leftIcon={<Plus size={20} />} onClick={() => { setFormData({...formData, type: 'income'}); setIsModalOpen(true); }}>
            Nova Receita
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

      {/* Fluxo de Caixa Mensal */}
      {monthlyFlow.length > 0 && (
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left px-5 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Mês</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Entradas</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Saídas</th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {monthlyFlow.slice(0, 6).map(m => (
                  <tr key={m.key} className={cn('hover:bg-neutral-50 transition-colors', m.key === thisMonthKey && 'bg-primary/5')}>
                    <td className="px-5 py-3 font-semibold text-neutral-800 capitalize">
                      {fmtMonth(m.key)}
                      {m.key === thisMonthKey && <span className="ml-2 text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Atual</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(m.income)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">{formatCurrency(m.expense)}</td>
                    <td className={cn('px-5 py-3 text-right font-black', m.profit >= 0 ? 'text-neutral-900' : 'text-red-600')}>
                      {m.profit >= 0 ? '+' : ''}{formatCurrency(m.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar transação..."
            leftIcon={<Search size={20} />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant={filterType !== 'all' ? 'primary' : 'secondary'}
          leftIcon={<Filter size={20} />}
          onClick={cycleFilterType}
        >
          {filterTypeLabels[filterType]}
        </Button>
        <Button
          variant={dateFrom || dateTo ? 'primary' : 'secondary'}
          leftIcon={<Calendar size={20} />}
          onClick={() => setIsPeriodModalOpen(true)}
        >
          {dateFrom || dateTo ? 'Período ativo' : 'Período'}
        </Button>
        {hasActiveFilters && (
          <Button variant="secondary" iconOnly onClick={clearFilters}>
            <X size={20} />
          </Button>
        )}
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

      <Modal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        title="Filtrar por Período"
      >
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.type === 'income' ? 'Registrar Receita' : 'Registrar Despesa'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Aluguel da Loja, Venda de iPhone"
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="any"
              inputMode="decimal"
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
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
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

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSaving} type="submit">
              Confirmar Lançamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        isOpen={!!editTransaction}
        onClose={() => setEditTransaction(null)}
        title="Editar Lançamento"
      >
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
            <Button variant="secondary" fullWidth onClick={() => setEditTransaction(null)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSavingEdit} type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Financeiro;
