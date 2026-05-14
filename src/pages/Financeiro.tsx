import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Search, ArrowUpCircle, ArrowDownCircle, TrendingUp, Filter, Calendar, PieChart as PieChartIcon, Trash2 } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);

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
    try {
      setIsSaving(true);
      await dataService.addTransaction({
        ...formData,
        amount: Number(formData.amount)
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

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const columns = [
    { header: 'Descrição', accessor: (t: any) => <span className="font-medium text-neutral-900">{t.description}</span> },
    { header: 'Categoria', accessor: 'category' },
    { header: 'Data', accessor: (t: any) => formatDate(t.date) },
    { header: 'Valor', accessor: (t: any) => (
      <span className={t.type === 'income' ? 'text-success font-bold' : 'text-danger font-bold'}>
        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
      </span>
    )},
    { header: 'Status', accessor: (t: any) => (
      <Badge variant={t.status === 'confirmed' ? 'success' : 'warning'}>
        {t.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
      </Badge>
    )},
    { header: 'Ações', accessor: (t: any) => (
      <Button variant="danger" size="sm" iconOnly onClick={() => handleDeleteTransaction(t.id, t.description)}>
        <Trash2 size={14} />
      </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-success-light text-success rounded-xl">
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Entradas</p>
            <p className="text-xl font-bold text-neutral-900">{formatCurrency(totalIncome)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-danger-light text-danger rounded-xl">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Saídas</p>
            <p className="text-xl font-bold text-neutral-900">{formatCurrency(totalExpense)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-primary-50 text-primary-900 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Lucro Líquido</p>
            <p className={cn('text-xl font-bold', netProfit >= 0 ? 'text-success' : 'text-danger')}>
              {formatCurrency(netProfit)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-2 border-primary-100 bg-primary-50/20">
          <div className="p-3 bg-primary text-black rounded-xl">
            <PieChartIcon size={24} />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Margem Média</p>
            <p className="text-xl font-bold text-neutral-900">{margin.toFixed(1)}%</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input placeholder="Buscar transação..." leftIcon={<Search size={20} />} />
        </div>
        <Button variant="secondary" leftIcon={<Filter size={20} />}>Filtros</Button>
        <Button variant="secondary" leftIcon={<Calendar size={20} />}>Período</Button>
      </div>

      <Table 
        columns={columns} 
        data={transactions} 
        isLoading={isLoading}
        emptyMessage="Nenhuma movimentação financeira encontrada."
      />

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
              step="0.01"
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
    </div>
  );
};

export default Financeiro;
