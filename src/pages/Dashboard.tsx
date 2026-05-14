import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { ChannelChart } from '../components/dashboard/ChannelChart';
import { AlertsList } from '../components/dashboard/AlertsList';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Plus, ShoppingCart, Package, DollarSign, UserPlus,
  ChevronLeft, ChevronRight, Calendar, TrendingUp, ArrowRight,
} from 'lucide-react';
import { FiveAkonLogo } from '../components/ui/FiveAkonLogo';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { format, getDaysInMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
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
      .filter((t) => t.type === 'income' && (t.date || t.created_at)?.slice(0, 10) === dayStr)
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

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function getPaymentLabel(method: string) {
  const map: Record<string, string> = {
    pix: 'PIX', credit_card: 'Crédito', debit_card: 'Débito',
    cash: 'Dinheiro', boleto: 'Boleto', transfer: 'Transferência',
  };
  return map[method] || method || 'Outro';
}

const PAYMENT_COLORS: Record<string, string> = {
  pix: 'bg-emerald-100 text-emerald-700',
  credit_card: 'bg-blue-100 text-blue-700',
  debit_card: 'bg-indigo-100 text-indigo-700',
  cash: 'bg-green-100 text-green-700',
  boleto: 'bg-orange-100 text-orange-700',
  transfer: 'bg-purple-100 text-purple-700',
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sales, , transactions] = await Promise.all([
        dataService.getSales(),
        dataService.getProducts(),
        dataService.getTransactions(),
      ]);

      setAllTransactions(transactions || []);
      setAllSales(sales || []);

      const totalRevenue = sales?.reduce((acc, s) => acc + Number(s.total_amount || 0), 0) || 0;
      const totalIncome = transactions?.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;
      const totalExpense = transactions?.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;
      const netProfit = totalIncome - totalExpense;
      const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setStats({ revenue: totalRevenue, salesCount: sales?.length || 0, profit: netProfit, cash: totalIncome - totalExpense, margin });
      setRecentSales((sales || []).slice(0, 5));
      setTopProducts(buildTopProducts(sales || []));
      setChannelData(buildChannelData(sales || []));
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    setChartData(buildMonthChartData(allTransactions, selectedMonth));
  }, [allTransactions, selectedMonth]);

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const monthRevenue = allTransactions
    .filter((t) => {
      const d = (t.date || t.created_at)?.slice(0, 7);
      return t.type === 'income' && d === format(selectedMonth, 'yyyy-MM');
    })
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const maxTopProduct = topProducts[0]?.salesCount || 1;

  const Skeleton = () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-neutral-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 h-72 bg-neutral-100 rounded-2xl" />
        <div className="h-72 bg-neutral-100 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-neutral-100 rounded-2xl" />
        <div className="h-80 bg-neutral-100 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <FiveAkonLogo size="md" className="mb-1" />
          <p className="text-neutral-500 font-medium">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm font-bold text-primary-900 flex items-center gap-2">
            <Calendar size={16} />
            <span>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          {/* Month selector */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            <button
              className="p-2 hover:bg-neutral-50 transition-colors text-neutral-500 hover:text-neutral-900"
              onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-semibold text-neutral-700 capitalize min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              className={cn('p-2 transition-colors', isCurrentMonth ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900')}
              onClick={() => !isCurrentMonth && setSelectedMonth((m) => addMonths(m, 1))}
              disabled={isCurrentMonth}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? <Skeleton /> : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Faturamento Bruto"
              value={formatCurrency(stats.revenue)}
              change={stats.revenue > 0 ? 12.4 : undefined}
              icon="DollarSign"
            />
            <MetricCard
              title="Lucro Líquido"
              value={formatCurrency(stats.profit)}
              subtitle={`${stats.margin.toFixed(1)}% de margem`}
              change={stats.profit !== 0 ? 8.2 : undefined}
              icon="TrendingUp"
              iconBgColor="bg-success-light"
            />
            <MetricCard
              title="Vendas Realizadas"
              value={`${stats.salesCount} vendas`}
              subtitle={`Ticket médio ${formatCurrency(stats.salesCount > 0 ? stats.revenue / stats.salesCount : 0)}`}
              change={stats.salesCount > 0 ? 5.1 : undefined}
              icon="ShoppingBag"
              iconBgColor="bg-info-light"
            />
            <MetricCard
              title="Saldo em Caixa"
              value={formatCurrency(stats.cash)}
              subtitle="Receitas − Despesas"
              icon="Wallet"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <p className="text-sm text-neutral-500">Receitas − Custo das mercadorias</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Bottom row: Recent Sales + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Sales — always shown */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Últimas Vendas</h3>
                    <p className="text-sm text-neutral-400">As 5 vendas mais recentes</p>
                  </div>
                  <button
                    onClick={() => navigate('/vendas')}
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    Ver todas <ArrowRight size={14} />
                  </button>
                </div>

                {recentSales.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-14 space-y-4 text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
                      <ShoppingCart size={28} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-600">Nenhuma venda ainda</p>
                      <p className="text-sm text-neutral-400 mt-1">Registre sua primeira venda para ver aqui.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/vendas')} leftIcon={<Plus size={16} />}>
                      Registrar Venda
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="space-y-1">
                      {recentSales.map((sale) => {
                        const customerName = sale.customer_name || sale.customers?.name || 'Cliente';
                        const productName = sale.product_name || 'Produto';
                        const value = Number(sale.total_amount || 0);
                        const dateStr = sale.created_at
                          ? new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                          : '—';
                        const payMethod = sale.payment_method || '';
                        const payColor = PAYMENT_COLORS[payMethod] || 'bg-neutral-100 text-neutral-600';

                        return (
                          <div
                            key={sale.id}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary-900 flex-shrink-0">
                              {getInitials(customerName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-neutral-900 truncate">{customerName}</p>
                              <p className="text-xs text-neutral-400 truncate">{productName}</p>
                            </div>
                            {payMethod && (
                              <span className={cn('hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full', payColor)}>
                                {getPaymentLabel(payMethod)}
                              </span>
                            )}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-neutral-900">{formatCurrency(value)}</p>
                              <p className="text-[10px] text-neutral-400">{dateStr}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Alerts */}
            <div>
              <AlertsList />
            </div>
          </div>

          {/* Top Products — always shown */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Top 5 Produtos do Mês</h3>
                <p className="text-sm text-neutral-400">Produtos mais vendidos</p>
              </div>
              <button
                onClick={() => navigate('/estoque')}
                className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
              >
                Ver estoque <ArrowRight size={14} />
              </button>
            </div>

            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
                  <Package size={24} className="text-neutral-300" />
                </div>
                <p className="text-sm font-semibold text-neutral-600">Nenhuma venda registrada ainda</p>
                <p className="text-xs text-neutral-400">Os produtos mais vendidos aparecerão aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {topProducts.map((product, index) => {
                  const pct = Math.round((product.salesCount / maxTopProduct) * 100);
                  return (
                    <div key={product.id} className="flex flex-col gap-3 p-4 rounded-xl bg-neutral-50 hover:bg-primary/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-xs font-black text-neutral-900">
                          #{index + 1}
                        </div>
                        <span className="text-xs font-bold text-neutral-500">{product.salesCount} venda{product.salesCount !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm font-bold text-neutral-800 leading-tight line-clamp-2">{product.name}</p>
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium">{pct}% do top</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Month summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Faturamento do mês', value: formatCurrency(monthRevenue), icon: TrendingUp, color: 'text-primary' },
              { label: 'Vendas totais', value: `${stats.salesCount} vendas`, icon: ShoppingCart, color: 'text-blue-600' },
              { label: 'Ticket médio', value: formatCurrency(stats.salesCount > 0 ? stats.revenue / stats.salesCount : 0), icon: DollarSign, color: 'text-emerald-600' },
              { label: 'Margem de lucro', value: `${stats.margin.toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-600' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-100 shadow-sm">
                <div className={cn('p-2 bg-neutral-50 rounded-lg', item.color)}>
                  <item.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-neutral-400 font-medium truncate">{item.label}</p>
                  <p className="text-sm font-black text-neutral-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-6 lg:bottom-10 lg:right-10 z-50">
        <div className="relative">
          <div className={cn(
            'absolute bottom-full right-0 mb-4 flex flex-col gap-3 transition-all duration-300 transform',
            isFABOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none translate-y-4'
          )}>
            {[
              { icon: ShoppingCart, label: 'Nova Venda', action: '/vendas' },
              { icon: Package, label: 'Novo Produto', action: '/estoque' },
              { icon: DollarSign, label: 'Nova Despesa', action: '/financeiro' },
              { icon: UserPlus, label: 'Novo Lead', action: '/leads' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => { navigate(item.action); setIsFABOpen(false); }}
                className="flex items-center gap-3 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl hover:bg-neutral-800 transition-all whitespace-nowrap group"
              >
                <div className="p-1.5 bg-neutral-800 rounded-lg group-hover:bg-primary group-hover:text-black transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsFABOpen(!isFABOpen)}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center text-black shadow-2xl shadow-primary/30 transition-all duration-300 active:scale-90',
              isFABOpen ? 'bg-neutral-900 text-white rotate-45' : 'bg-primary hover:bg-primary-600'
            )}
          >
            <Plus size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};
