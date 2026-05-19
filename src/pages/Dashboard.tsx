import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { ChannelChart } from '../components/dashboard/ChannelChart';
import { AlertsList } from '../components/dashboard/AlertsList';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Plus, ShoppingCart, Package, DollarSign, UserPlus,
  Calendar, TrendingUp, ArrowRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Period types ─────────────────────────────────────────────────────────────
type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today',      label: 'Hoje'          },
  { id: 'yesterday',  label: 'Ontem'         },
  { id: 'this_week',  label: 'Esta Semana'   },
  { id: 'last_week',  label: 'Sem. Passada'  },
  { id: 'this_month', label: 'Este Mês'      },
  { id: 'last_month', label: 'Mês Anterior'  },
  { id: 'custom',     label: 'Personalizado' },
];

function getDateRange(period: Period, from: string, to: string): [Date, Date] {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms    = 86_400_000;

  if (period === 'today')
    return [today, new Date(today.getTime() + ms)];

  if (period === 'yesterday') {
    const y = new Date(today.getTime() - ms);
    return [y, today];
  }

  if (period === 'this_week') {
    const dow     = today.getDay();
    const monday  = new Date(today.getTime() - (dow === 0 ? 6 : dow - 1) * ms);
    return [monday, new Date(today.getTime() + ms)];
  }

  if (period === 'last_week') {
    const dow        = today.getDay();
    const thisMonday = new Date(today.getTime() - (dow === 0 ? 6 : dow - 1) * ms);
    const lastMonday = new Date(thisMonday.getTime() - 7 * ms);
    return [lastMonday, thisMonday];
  }

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start, new Date(today.getTime() + ms)];
  }

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start, end];
  }

  // custom
  const start = from ? new Date(from + 'T00:00:00') : new Date(0);
  const end   = to   ? new Date(to   + 'T23:59:59') : new Date(today.getTime() + ms);
  return [start, end];
}

function getPeriodLabel(period: Period, from: string, to: string): string {
  if (period === 'custom') {
    if (from && to) return `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`;
    if (from)       return `A partir de ${from.split('-').reverse().join('/')}`;
    return 'Período personalizado';
  }
  return PERIODS.find(p => p.id === period)?.label ?? '';
}

function buildChartDataForRange(sales: any[], start: Date, end: Date): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  const cap   = new Date(); // don't go past today
  const cur   = new Date(start);

  while (cur < end && cur <= cap) {
    const dayStr = format(cur, 'yyyy-MM-dd');
    const label  = format(cur, 'dd/MM');
    const value  = sales
      .filter(s => (s.created_at || '').slice(0, 10) === dayStr)
      .reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    result.push({ date: label, value });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

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

const CHANNEL_COLORS = ['#FFC107', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'];
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

// ─── Component ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isFABOpen, setIsFABOpen] = useState(false);

  // Period filter state
  const today = new Date().toISOString().split('T')[0];
  const [period, setPeriod]       = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo]     = useState(today);
  const [showCustom, setShowCustom] = useState(false);

  // Raw data
  const [allSales, setAllSales]             = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [stockValue, setStockValue]         = useState(0);
  const [isLoading, setIsLoading]           = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sales, products, transactions] = await Promise.all([
        dataService.getSales(),
        dataService.getProducts(),
        dataService.getTransactions(),
      ]);
      setAllSales(sales || []);
      setAllTransactions(transactions || []);
      const sv = (products || [])
        .filter((p: any) => p.stock_quantity > 0)
        .reduce((acc: number, p: any) =>
          acc + (p.sale_price > 0 ? Number(p.sale_price) : Number(p.purchase_price || 0)), 0);
      setStockValue(sv);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // ─── Derived data filtered by period ─────────────────────────────────────
  const { filteredSales, revenue, salesCount, netProfit, chartData, channelData, topProducts } = useMemo(() => {
    const [start, end] = getDateRange(period, customFrom, customTo);
    const filtered = allSales.filter(s => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d >= start && d < end;
    });
    const rev   = filtered.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const count = filtered.length;

    // Cost map: sale id prefix → purchase cost (from auto-created expense transactions)
    const costMap: Record<string, number> = {};
    for (const t of allTransactions) {
      if (t.type === 'expense' && t.category === 'stock' && t.description?.startsWith('Custo Mercadoria #')) {
        const prefix = t.description.replace('Custo Mercadoria #', '').trim();
        costMap[prefix] = (costMap[prefix] || 0) + Number(t.amount || 0);
      }
    }
    const totalCost = filtered.reduce((acc, s) => acc + (costMap[s.id?.slice(0, 8)] || 0), 0);

    return {
      filteredSales: filtered,
      revenue:       rev,
      salesCount:    count,
      netProfit:     rev - totalCost,
      chartData:     buildChartDataForRange(filtered, start, end),
      channelData:   buildChannelData(filtered),
      topProducts:   buildTopProducts(filtered),
    };
  }, [allSales, allTransactions, period, customFrom, customTo]);

  const periodLabel = getPeriodLabel(period, customFrom, customTo);

  const handlePeriodClick = (p: Period) => {
    setPeriod(p);
    if (p === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
  };

  const Skeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-neutral-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-neutral-100 rounded-2xl" />
        <div className="h-72 bg-neutral-100 rounded-2xl" />
      </div>
      <div className="h-80 bg-neutral-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight">Dashboard</h2>
            <p className="text-neutral-500 font-medium text-sm">
              Exibindo dados de: <strong className="text-neutral-800">{periodLabel}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Calendar size={14} />
            <span>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Period pills */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodClick(p.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all border',
                period === p.id
                  ? 'bg-primary border-primary/60 text-neutral-900 shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary/40 hover:text-neutral-900'
              )}
            >
              {p.id === 'custom' && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {p.label}
                </span>
              )}
              {p.id !== 'custom' && p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600 whitespace-nowrap">De:</label>
              <input
                type="date"
                value={customFrom}
                max={customTo || today}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600 whitespace-nowrap">Até:</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            {customFrom && customTo && (
              <span className="text-xs font-bold text-neutral-500 bg-white border border-neutral-200 px-3 py-2 rounded-xl">
                {salesCount} venda{salesCount !== 1 ? 's' : ''} neste período
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? <Skeleton /> : (
        <>
          {/* ── Metric Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Faturamento */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Faturamento</p>
              <p className="text-2xl font-black text-neutral-900">{formatCurrency(revenue)}</p>
              <p className="text-xs text-neutral-400">{periodLabel}</p>
            </div>

            {/* Vendas */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Vendas</p>
              <p className="text-2xl font-black text-neutral-900">{salesCount}</p>
              <p className="text-xs text-neutral-400">{periodLabel}</p>
            </div>

            {/* Lucro Líquido */}
            <div className={cn(
              'rounded-2xl border shadow-sm p-5 flex flex-col gap-1',
              netProfit >= 0 ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-200',
            )}>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Lucro Líquido</p>
              <p className={cn('text-2xl font-black', netProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                {formatCurrency(netProfit)}
              </p>
              <p className="text-xs text-neutral-400">{periodLabel}</p>
            </div>

            {/* Estoque — sempre total */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Valor em Estoque</p>
              <p className="text-2xl font-black text-neutral-900">{formatCurrency(stockValue)}</p>
              <p className="text-xs text-neutral-400">Total disponível</p>
            </div>
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueChart
                data={chartData}
                title={`Faturamento — ${periodLabel}`}
                subtitle={
                  chartData.length === 1
                    ? 'Total do dia'
                    : `${chartData.length} dia${chartData.length !== 1 ? 's' : ''} no período`
                }
              />
            </div>
            <div>
              {channelData.length > 0 ? (
                <ChannelChart data={channelData} />
              ) : (
                <Card className="flex flex-col justify-center items-center p-8 text-center space-y-4 h-full min-h-[200px]">
                  <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
                    <ShoppingCart size={22} className="text-neutral-300" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-600 text-sm">Sem vendas no período</p>
                    <p className="text-xs text-neutral-400 mt-1">Pagamentos aparecerão aqui.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* ── Recent Sales ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Vendas do Período</h3>
                    <p className="text-sm text-neutral-400">
                      {filteredSales.length === 0
                        ? 'Nenhuma venda neste período'
                        : `${filteredSales.length} venda${filteredSales.length !== 1 ? 's' : ''} — ${periodLabel}`}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/vendas')}
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    Ver todas <ArrowRight size={14} />
                  </button>
                </div>

                {filteredSales.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3 text-center">
                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
                      <ShoppingCart size={24} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-600 text-sm">Sem vendas no período selecionado</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Escolha outro período ou registre uma venda.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/vendas')} leftIcon={<Plus size={14} />}>
                      Registrar Venda
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredSales.slice(0, 6).map((sale) => {
                      const customerName = sale.customer_name || sale.customers?.name || 'Cliente';
                      const productName  = sale.product_name || 'Produto';
                      const value        = Number(sale.total_amount || 0);
                      const dateStr      = sale.created_at
                        ? new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                        : '—';
                      const payMethod = sale.payment_method || '';
                      const payColor  = PAYMENT_COLORS[payMethod] || 'bg-neutral-100 text-neutral-600';

                      return (
                        <div
                          key={sale.id}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-neutral-50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary-900 flex-shrink-0">
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
                    {filteredSales.length > 6 && (
                      <button
                        onClick={() => navigate('/vendas')}
                        className="w-full text-center py-2.5 text-xs font-bold text-primary hover:underline"
                      >
                        + {filteredSales.length - 6} venda{filteredSales.length - 6 !== 1 ? 's' : ''} — Ver todas
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </div>

            <div>
              <AlertsList />
            </div>
          </div>

          {/* ── Top Products ── */}
          {topProducts.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Top Produtos</h3>
                  <p className="text-sm text-neutral-400">{periodLabel}</p>
                </div>
                <button
                  onClick={() => navigate('/estoque')}
                  className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  Ver estoque <ArrowRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {topProducts.map((product, index) => {
                  const pct = Math.round((product.salesCount / (topProducts[0]?.salesCount || 1)) * 100);
                  return (
                    <div key={product.id} className="flex flex-col gap-3 p-4 rounded-xl bg-neutral-50 hover:bg-primary/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-xs font-black text-neutral-900">
                          #{index + 1}
                        </div>
                        <span className="text-xs font-bold text-neutral-500">
                          {product.salesCount} venda{product.salesCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-800 leading-tight line-clamp-2">{product.name}</p>
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium">{pct}% do top</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Summary strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: `Faturamento — ${periodLabel}`, value: formatCurrency(revenue),   icon: TrendingUp,  color: 'text-primary'      },
              { label: 'Vendas no período',             value: `${salesCount} vendas`,    icon: ShoppingCart, color: 'text-blue-600'    },
              { label: 'Lucro líquido',                 value: formatCurrency(netProfit), icon: DollarSign,  color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-500' },
              { label: 'Valor em estoque',              value: formatCurrency(stockValue),icon: Package,     color: 'text-purple-600'   },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-100 shadow-sm">
                <div className={cn('p-2 bg-neutral-50 rounded-lg', item.color)}>
                  <item.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-400 font-medium truncate">{item.label}</p>
                  <p className="text-sm font-black text-neutral-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── FAB ── */}
      <div className="fixed bottom-20 right-6 lg:bottom-10 lg:right-10 z-50">
        <div className="relative">
          <div className={cn(
            'absolute bottom-full right-0 mb-4 flex flex-col gap-3 transition-all duration-300 transform',
            isFABOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none translate-y-4'
          )}>
            {[
              { icon: ShoppingCart, label: 'Nova Venda',  action: '/vendas'    },
              { icon: Package,      label: 'Novo Produto', action: '/estoque'  },
              { icon: DollarSign,   label: 'Nova Despesa', action: '/financeiro'},
              { icon: UserPlus,     label: 'Novo Lead',    action: '/leads'    },
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
