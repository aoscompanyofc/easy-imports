import React, { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { ChannelChart } from '../components/dashboard/ChannelChart';
import { TopProducts } from '../components/dashboard/TopProducts';
import { AlertsList } from '../components/dashboard/AlertsList';
import { RecentSales } from '../components/dashboard/RecentSales';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, ShoppingCart, Package, DollarSign, UserPlus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function buildMonthChartData(transactions: any[], monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(monthDate);
  const today = new Date();

  const result: { date: string; value: number }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (d > today) break;
    const dayStr = format(d, 'yyyy-MM-dd');
    const label = format(d, 'dd/MM');
    const income = transactions
      .filter(t => t.type === 'income' && (t.date || t.created_at)?.slice(0, 10) === dayStr)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    result.push({ date: label, value: income });
  }
  return result;
}

const CHANNEL_COLORS = ['#FFC107', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'];

function buildTopProducts(sales: any[]) {
  const counts: Record<string, number> = {};
  for (const s of sales) {
    const name = s.product_name || s.products?.name || 'Produto';
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, salesCount], i) => ({ id: String(i), name, salesCount }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);
}

function buildChannelData(sales: any[]) {
  const counts: Record<string, number> = {};
  for (const s of sales) {
    const method = s.payment_method || 'Outros';
    counts[method] = (counts[method] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value], i) => ({ name, value, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

export const Dashboard: React.FC = () => {
  const [isFABOpen, setIsFABOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);

  const [stats, setStats] = useState({ revenue: 0, salesCount: 0, profit: 0, cash: 0, margin: 0 });
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<{ id: string; name: string; salesCount: number }[]>([]);
  const [channelData, setChannelData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sales, products, transactions] = await Promise.all([
        dataService.getSales(),
        dataService.getProducts(),
        dataService.getTransactions(),
      ]);

      setAllTransactions(transactions || []);
      setAllSales(sales || []);

      const totalRevenue = sales?.reduce((acc, s) => acc + Number(s.total_amount || 0), 0) || 0;
      const totalIncome = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;
      const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;
      const netProfit = totalIncome - totalExpense;
      const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const dataExists = (sales?.length || 0) > 0 || (products?.length || 0) > 0 || (transactions?.length || 0) > 0;
      setHasData(dataExists);
      setStats({ revenue: totalRevenue, salesCount: sales?.length || 0, profit: netProfit, cash: totalIncome - totalExpense, margin });
      setRecentSales((sales || []).slice(0, 10));
      setTopProducts(buildTopProducts(sales || []));
      setChannelData(buildChannelData(sales || []));
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    setChartData(buildMonthChartData(allTransactions, selectedMonth));
  }, [allTransactions, selectedMonth]);

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const monthRevenue = allTransactions
    .filter(t => {
      const d = (t.date || t.created_at)?.slice(0, 7);
      return t.type === 'income' && d === format(selectedMonth, 'yyyy-MM');
    })
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight">Dashboard</h2>
          <p className="text-neutral-500 font-medium">
            {hasData ? 'Visão geral em tempo real.' : 'Sistema zerado. Comece adicionando dados.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm font-bold text-primary-900 flex items-center gap-2">
            <Calendar size={16} />
            <span>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          {/* Seletor de mês */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            <button
              className="p-2 hover:bg-neutral-50 transition-colors text-neutral-500 hover:text-neutral-900"
              onClick={() => setSelectedMonth(m => subMonths(m, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-semibold text-neutral-700 capitalize min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              className={cn('p-2 transition-colors', isCurrentMonth ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900')}
              onClick={() => !isCurrentMonth && setSelectedMonth(m => addMonths(m, 1))}
              disabled={isCurrentMonth}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Faturamento Bruto" value={formatCurrency(stats.revenue)} change={stats.revenue > 0 ? 12.4 : 0} icon="DollarSign" />
        <MetricCard title="Lucro Líquido" value={formatCurrency(stats.profit)} subtitle={`${stats.margin.toFixed(1)}% de margem`} change={stats.profit !== 0 ? 8.2 : 0} icon="TrendingUp" iconBgColor="bg-success-light" />
        <MetricCard title="Vendas Realizadas" value={`${stats.salesCount} vendas`} subtitle={`Ticket médio ${formatCurrency(stats.salesCount > 0 ? stats.revenue / stats.salesCount : 0)}`} change={stats.salesCount > 0 ? 5.1 : 0} icon="ShoppingBag" iconBgColor="bg-info-light" />
        <MetricCard title="Saldo em Caixa" value={formatCurrency(stats.cash)} subtitle="Receitas - Despesas" icon="Wallet" />
      </div>

      {/* Zero State */}
      {!hasData && !isLoading ? (
        <Card className="py-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <Package size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Sistema zerado e pronto</h3>
            <p className="text-neutral-500 max-w-md mx-auto mt-1">
              Comece cadastrando produtos no estoque e registrando suas vendas para ver as métricas aqui.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button onClick={() => window.location.href = '/estoque'} leftIcon={<Package size={18} />}>Adicionar Estoque</Button>
            <Button variant="secondary" onClick={() => window.location.href = '/clientes'} leftIcon={<UserPlus size={18} />}>Cadastrar Clientes</Button>
            <Button variant="secondary" onClick={() => window.location.href = '/leads'} leftIcon={<UserPlus size={18} />}>Cadastrar Leads</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-2">
              <RevenueChart
                data={chartData}
                title={`Faturamento — ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`}
                subtitle={isCurrentMonth ? 'Vendas brutas por dia (mês atual)' : 'Vendas brutas por dia'}
              />
            </div>
            <div>
              {channelData.length > 0 ? (
                <ChannelChart data={channelData} />
              ) : (
                <Card className="flex flex-col justify-center items-center p-8 text-center space-y-4 h-full">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f5f5f5" strokeWidth="12" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#FFC107" strokeWidth="12"
                        strokeDasharray={`${Math.min(Math.max(stats.margin, 0), 100) * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black">{stats.margin.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900">Margem de Lucro</h4>
                    <p className="text-sm text-neutral-500">Receitas - Custo das mercadorias</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RecentSales sales={recentSales} />
              {topProducts.length > 0 && <TopProducts products={topProducts} />}
            </div>
            <div>
              <AlertsList />
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-6 lg:bottom-10 lg:right-10 z-50">
        <div className="relative">
          <div className={cn('absolute bottom-full right-0 mb-4 flex flex-col gap-3 transition-all duration-300 transform', isFABOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none translate-y-4')}>
            {[
              { icon: ShoppingCart, label: 'Nova Venda', action: '/vendas' },
              { icon: Package, label: 'Novo Produto', action: '/estoque' },
              { icon: DollarSign, label: 'Nova Despesa', action: '/financeiro' },
              { icon: UserPlus, label: 'Novo Lead', action: '/leads' },
            ].map((item, idx) => (
              <button key={idx} onClick={() => { window.location.href = item.action; }} className="flex items-center gap-3 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl hover:bg-neutral-800 transition-all whitespace-nowrap group">
                <div className="p-1.5 bg-neutral-800 rounded-lg group-hover:bg-primary group-hover:text-black transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setIsFABOpen(!isFABOpen)} className={cn('w-14 h-14 rounded-full flex items-center justify-center text-black shadow-2xl shadow-primary/30 transition-all duration-300 active:scale-90', isFABOpen ? 'bg-neutral-900 text-white rotate-45' : 'bg-primary hover:bg-primary-600')}>
            <Plus size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};
