import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Download, FileText, TrendingUp, Users,
  ChevronLeft, ChevronRight, Package, ShoppingCart,
  DollarSign, RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { format, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function downloadCSV(filename: string, rows: string[][]) {
  const bom = '﻿';
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function inMonth(dateStr: string, month: Date) {
  const d = new Date(dateStr);
  return d >= startOfMonth(month) && d <= endOfMonth(month);
}

export const Relatorios: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [s, p, t, l] = await Promise.all([
          dataService.getSales(),
          dataService.getProducts(),
          dataService.getTransactions(),
          dataService.getLeads(),
        ]);
        setSales(s || []);
        setProducts(p || []);
        setTransactions(t || []);
        setLeads(l || []);
      } catch (e: any) {
        toast.error('Erro ao carregar dados: ' + e.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ─── Vendas do mês selecionado ──────────────────────────────────────────────
  const monthlySales = useMemo(
    () => sales.filter((s) => inMonth(s.created_at, selectedMonth)),
    [sales, selectedMonth]
  );

  const vendas = useMemo(() => {
    const total = monthlySales.reduce((a, s) => a + Number(s.total_amount || 0), 0);
    const count = monthlySales.length;
    const ticket = count > 0 ? total / count : 0;
    const byType: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    monthlySales.forEach((s) => {
      const t = s.sale_type || 'venda';
      byType[t] = (byType[t] || 0) + 1;
      const p = s.payment_method || 'Outro';
      byPayment[p] = (byPayment[p] || 0) + 1;
    });
    const topPayment = Object.entries(byPayment).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { total, count, ticket, byType, byPayment, topPayment };
  }, [monthlySales]);

  // ─── Estoque ────────────────────────────────────────────────────────────────
  const estoque = useMemo(() => {
    const inStock = products.filter((p) => p.stock_quantity > 0);
    const sold = products.filter((p) => p.stock_quantity <= 0);
    const valorVenda = inStock.reduce((a, p) => a + (p.sale_price > 0 ? Number(p.sale_price) : 0), 0);
    const valorCusto = inStock.reduce((a, p) => a + Number(p.purchase_price || 0), 0);
    const margemPotencial = valorVenda > 0 ? ((valorVenda - valorCusto) / valorVenda) * 100 : 0;
    return { inStock: inStock.length, sold: sold.length, valorVenda, valorCusto, margemPotencial, inStockList: inStock };
  }, [products]);

  // ─── Lucratividade do mês ────────────────────────────────────────────────────
  const lucro = useMemo(() => {
    const monthlyTx = transactions.filter((t) => inMonth(t.date || t.created_at, selectedMonth));
    const receita = monthlyTx.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0);
    // eslint-disable-next-line no-unused-vars
    const custoMerc = monthlyTx.filter((t) => t.type === 'expense' && t.category === 'stock').reduce((a, t) => a + Number(t.amount || 0), 0);
    const outrosCustos = monthlyTx.filter((t) => t.type === 'expense' && t.category !== 'stock').reduce((a, t) => a + Number(t.amount || 0), 0);
    const lucroBruto = receita - custoMerc;
    const lucroLiquido = receita - custoMerc - outrosCustos;
    const margem = receita > 0 ? (lucroLiquido / receita) * 100 : 0;
    return { receita, custoMerc, outrosCustos, lucroBruto, lucroLiquido, margem, monthlyTx };
  }, [transactions, selectedMonth]);

  // ─── Leads ──────────────────────────────────────────────────────────────────
  const leadsData = useMemo(() => {
    const total = leads.length;
    const convertidos = leads.filter((l) => l.status === 'converted' || l.status === 'convertido').length;
    const qualificados = leads.filter((l) => l.status === 'qualified' || l.status === 'qualificado').length;
    const taxa = total > 0 ? (convertidos / total) * 100 : 0;
    const bySource: Record<string, number> = {};
    leads.forEach((l) => {
      const s = l.source || 'Outro';
      bySource[s] = (bySource[s] || 0) + 1;
    });
    return { total, convertidos, qualificados, taxa, bySource };
  }, [leads]);

  // ─── Exports ─────────────────────────────────────────────────────────────────
  const exportVendas = () => {
    const header = ['Número', 'Tipo', 'Data', 'Cliente', 'Produto', 'IMEI', 'Valor (R$)', 'Pagamento', 'Parcelas', 'Assinado'];
    const rows = monthlySales.map((s) => [
      s.sale_number || s.id?.slice(0, 8),
      s.sale_type || 'venda',
      s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '',
      s.customer_name || '',
      s.product_name || '',
      s.product_imei || '',
      String(Number(s.total_amount || 0).toFixed(2)),
      s.payment_method || '',
      String(s.installments || 1),
      s.signature_client ? 'Sim' : 'Não',
    ]);
    downloadCSV(`vendas_${format(selectedMonth, 'yyyy-MM')}.csv`, [header, ...rows]);
    toast.success('Relatório de Vendas exportado!');
  };

  const exportEstoque = () => {
    const header = ['Nome', 'Categoria', 'IMEI', 'Capacidade', 'Cor', 'Estado', 'Custo (R$)', 'Preço Venda (R$)', 'Qtd em Estoque', 'Status'];
    const rows = products.map((p) => [
      p.name || '',
      p.category || '',
      p.imei || '',
      p.product_capacity || '',
      p.product_color || '',
      p.product_condition || '',
      String(Number(p.purchase_price || 0).toFixed(2)),
      String(Number(p.sale_price || 0).toFixed(2)),
      String(p.stock_quantity || 0),
      p.stock_quantity > 0 ? 'Em estoque' : 'Vendido',
    ]);
    downloadCSV(`estoque_${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...rows]);
    toast.success('Relatório de Estoque exportado!');
  };

  const exportLucro = () => {
    const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)'];
    const rows = lucro.monthlyTx.map((t) => [
      t.date || t.created_at?.slice(0, 10) || '',
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category || '',
      t.description || '',
      String(Number(t.amount || 0).toFixed(2)),
    ]);
    downloadCSV(`lucratividade_${format(selectedMonth, 'yyyy-MM')}.csv`, [header, ...rows]);
    toast.success('Relatório de Lucratividade exportado!');
  };

  const exportLeads = () => {
    const header = ['Nome', 'Telefone', 'E-mail', 'Fonte', 'Status', 'Observações', 'Data'];
    const rows = leads.map((l) => [
      l.name || '',
      l.phone || '',
      l.email || '',
      l.source || '',
      l.status || '',
      l.notes || '',
      l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '',
    ]);
    downloadCSV(`leads_${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...rows]);
    toast.success('Relatório de Leads exportado!');
  };

  const Stat = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-neutral-50 rounded-xl p-4">
      <p className="text-xs text-neutral-400 font-medium mb-1">{label}</p>
      <p className={cn('text-xl font-black', color || 'text-neutral-900')}>{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );

  const Section = ({
    title, icon: Icon, iconColor, children, onExport, exportLabel,
  }: {
    title: string; icon: any; iconColor: string;
    children: React.ReactNode; onExport: () => void; exportLabel: string;
  }) => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl', iconColor)}>
            <Icon size={20} />
          </div>
          <h3 className="font-bold text-neutral-900 text-lg">{title}</h3>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Download size={15} />} onClick={onExport}>
          {exportLabel}
        </Button>
      </div>
      {children}
    </Card>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Relatórios</h2>
          <p className="text-neutral-500">Dados reais do seu negócio — exportáveis em CSV</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw size={16} className="animate-spin text-neutral-400" />}
          {/* Month selector */}
          <div className="flex items-center bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <button className="p-2.5 hover:bg-neutral-50 text-neutral-500 transition-colors"
              onClick={() => setSelectedMonth((m) => subMonths(m, 1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 text-sm font-bold text-neutral-700 capitalize min-w-[150px] text-center">
              {monthLabel}
            </span>
            <button
              className={cn('p-2.5 transition-colors', isCurrentMonth ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-neutral-50 text-neutral-500')}
              onClick={() => !isCurrentMonth && setSelectedMonth((m) => addMonths(m, 1))}
              disabled={isCurrentMonth}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── VENDAS MENSAIS ───────────────────────────────────────────── */}
          <Section
            title="Vendas Mensais"
            icon={ShoppingCart}
            iconColor="bg-green-100 text-green-700"
            onExport={exportVendas}
            exportLabel="Exportar CSV"
          >
            {monthlySales.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Nenhuma venda em {monthLabel}.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Faturamento" value={formatCurrency(vendas.total)} color="text-green-700" />
                <Stat label="Operações" value={String(vendas.count)} sub={`Ticket médio ${formatCurrency(vendas.ticket)}`} />
                <Stat label="Forma mais usada" value={vendas.topPayment} />
                <Stat
                  label="Tipos"
                  value={`${vendas.byType['venda'] || 0}V · ${vendas.byType['troca'] || 0}T`}
                  sub="Vendas · Trocas"
                />
              </div>
            )}
            {/* Payment breakdown */}
            {Object.keys(vendas.byPayment).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(vendas.byPayment).sort((a, b) => b[1] - a[1]).map(([method, count]) => (
                  <span key={method} className="px-3 py-1 bg-neutral-100 rounded-full text-xs font-bold text-neutral-600">
                    {method}: {count}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* ── ESTOQUE & CUSTO ──────────────────────────────────────────── */}
          <Section
            title="Estoque & Custo"
            icon={Package}
            iconColor="bg-blue-100 text-blue-700"
            onExport={exportEstoque}
            exportLabel="Exportar CSV"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Aparelhos em estoque" value={String(estoque.inStock)} sub={`${estoque.sold} vendidos`} />
              <Stat label="Valor de venda" value={formatCurrency(estoque.valorVenda)} color="text-blue-700" />
              <Stat label="Custo total" value={formatCurrency(estoque.valorCusto)} />
              <Stat
                label="Margem potencial"
                value={`${estoque.margemPotencial.toFixed(1)}%`}
                sub="Se vender tudo pelo preço de venda"
                color={estoque.margemPotencial > 20 ? 'text-green-700' : 'text-amber-600'}
              />
            </div>
            {estoque.inStockList.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-neutral-100">
                {estoque.inStockList.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm border-b border-neutral-50 last:border-0">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="flex-1 font-medium text-neutral-800 truncate">{p.name}</span>
                    {p.imei && <span className="text-xs text-neutral-400 font-mono hidden sm:block">{p.imei}</span>}
                    <span className="text-xs text-neutral-500">{formatCurrency(p.purchase_price)}</span>
                    <span className="font-bold text-neutral-800 flex-shrink-0">{p.sale_price > 0 ? formatCurrency(p.sale_price) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── LUCRATIVIDADE ────────────────────────────────────────────── */}
          <Section
            title="Lucratividade"
            icon={TrendingUp}
            iconColor="bg-purple-100 text-purple-700"
            onExport={exportLucro}
            exportLabel="Exportar CSV"
          >
            {lucro.receita === 0 && lucro.custoMerc === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Nenhuma transação em {monthLabel}.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Receita bruta" value={formatCurrency(lucro.receita)} color="text-purple-700" />
                <Stat label="Custo mercadoria" value={formatCurrency(lucro.custoMerc)} />
                <Stat label="Outros custos" value={formatCurrency(lucro.outrosCustos)} />
                <Stat
                  label="Lucro líquido"
                  value={formatCurrency(lucro.lucroLiquido)}
                  sub={`Margem ${lucro.margem.toFixed(1)}%`}
                  color={lucro.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-600'}
                />
              </div>
            )}
          </Section>

          {/* ── PERFORMANCE LEADS ────────────────────────────────────────── */}
          <Section
            title="Performance dos Leads"
            icon={Users}
            iconColor="bg-amber-100 text-amber-700"
            onExport={exportLeads}
            exportLabel="Exportar CSV"
          >
            {leadsData.total === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Nenhum lead cadastrado ainda.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Total de leads" value={String(leadsData.total)} />
                  <Stat label="Qualificados" value={String(leadsData.qualificados)} />
                  <Stat label="Convertidos" value={String(leadsData.convertidos)} color="text-green-700" />
                  <Stat
                    label="Taxa de conversão"
                    value={`${leadsData.taxa.toFixed(1)}%`}
                    color={leadsData.taxa >= 20 ? 'text-green-700' : 'text-amber-600'}
                  />
                </div>
                {Object.keys(leadsData.bySource).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Por fonte</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(leadsData.bySource).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                        <span key={src} className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700">
                          {src}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>

        </div>
      )}
    </div>
  );
};

export default Relatorios;
