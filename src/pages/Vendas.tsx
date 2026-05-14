import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart, Plus, Search, Calendar, Package, CheckCircle2,
  Trash2, X, FileText, ChevronDown, ChevronRight, Download,
  RefreshCw, Eye,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { generatePDF, type CompanyInfo, type SalePDFData } from '../lib/pdfGenerator';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SALE_TYPES = [
  { value: 'compra', label: 'Compra de Produto Usado', desc: 'Easy Imports compra de um vendedor' },
  { value: 'venda', label: 'Venda ao Cliente', desc: 'Easy Imports vende para um cliente' },
  { value: 'troca', label: 'Troca', desc: 'Troca de aparelho com o cliente' },
];

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Boleto'];

const CONDITIONS = ['Novo', 'Seminovo', 'Usado — Bom Estado', 'Usado — Com Marcas', 'Para Retirada de Peças'];

const TYPE_COLORS: Record<string, string> = {
  compra: 'bg-blue-100 text-blue-700',
  venda: 'bg-green-100 text-green-700',
  troca: 'bg-purple-100 text-purple-700',
};

const TYPE_LABELS: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  troca: 'Troca',
};

const SALES_SQL = `-- Execute no Supabase Dashboard → SQL Editor
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_number TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'venda';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_rg TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_phone TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_email TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_capacity TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_color TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_condition TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_imei TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_accessories TEXT;`;

function getCompanyInfo(): CompanyInfo {
  return {
    name: localStorage.getItem('user_name') || 'Easy Imports',
    cnpj: localStorage.getItem('company_cnpj') || '[CNPJ NÃO INFORMADO]',
    phone: localStorage.getItem('user_telefone') || '[TELEFONE NÃO INFORMADO]',
    email: 'easyimportsbrstore@gmail.com',
  };
}

function generateSaleNumber(existingCount: number, type: string) {
  const prefix = type === 'compra' ? 'C' : type === 'troca' ? 'T' : 'V';
  return `#${prefix}${String(existingCount + 1).padStart(4, '0')}`;
}

const emptyForm = () => ({
  sale_type: 'compra',
  // Vendedor (para compra)
  seller_name: '', seller_cpf: '', seller_rg: '',
  seller_phone: '', seller_address: '', seller_email: '',
  // Cliente (para venda/troca)
  selectedCustomer: '', customer_phone: '', customer_cpf: '',
  // Produto
  selectedProduct: '',
  product_name_manual: '',
  product_capacity: '', product_color: '',
  product_condition: 'Seminovo', product_imei: '',
  product_accessories: '',
  quantity: 1,
  sale_price_manual: '',
  // Pagamento
  payment_method: 'PIX',
  sale_date: new Date().toISOString().slice(0, 16),
});

export const Vendas: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailSale, setDetailSale] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [showSQL, setShowSQL] = useState(false);

  const [form, setForm] = useState(emptyForm());

  const setF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [salesData, custData, prodData] = await Promise.all([
        dataService.getSales(),
        dataService.getCustomers(),
        dataService.getProducts(),
      ]);
      setSales(salesData || []);
      setCustomers(custData || []);
      setProducts((prodData || []).filter((p: any) => p.stock_quantity > 0));

      // Default: open current month
      const thisMonth = format(new Date(), 'yyyy-MM');
      setOpenMonths(new Set([thisMonth]));
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedProductData = products.find((p) => p.id === form.selectedProduct);
  const selectedCustomerData = customers.find((c) => c.id === form.selectedCustomer);

  const salePrice = form.sale_type === 'compra'
    ? (Number(form.sale_price_manual) || 0)
    : (selectedProductData ? selectedProductData.sale_price * form.quantity : Number(form.sale_price_manual) || 0);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.sale_type !== 'compra' && !form.selectedCustomer && !form.product_name_manual) {
      toast.error('Selecione um cliente e um produto.');
      return;
    }

    const product = form.selectedProduct ? selectedProductData : null;
    const productName = product?.name || form.product_name_manual;
    const customerName = selectedCustomerData?.name || form.seller_name || 'Avulso';
    const totalAmount = form.sale_type === 'compra'
      ? (Number(form.sale_price_manual) || 0)
      : (product ? product.sale_price * form.quantity : Number(form.sale_price_manual) || 0);

    if (totalAmount <= 0) { toast.error('Informe o valor da operação.'); return; }

    const saleNumber = generateSaleNumber(sales.length, form.sale_type);

    try {
      setIsSaving(true);
      await dataService.addSale(
        {
          customer_id: form.selectedCustomer || null,
          customer_name: form.sale_type === 'compra' ? form.seller_name : customerName,
          product_name: productName,
          total_amount: totalAmount,
          payment_method: form.payment_method,
          status: 'completed',
          created_at: new Date(form.sale_date).toISOString(),
          sale_number: saleNumber,
          sale_type: form.sale_type,
          seller_name: form.seller_name,
          seller_cpf: form.seller_cpf,
          seller_rg: form.seller_rg,
          seller_phone: form.seller_phone,
          seller_address: form.seller_address,
          seller_email: form.seller_email,
          customer_phone: form.customer_phone || selectedCustomerData?.phone,
          customer_cpf: form.customer_cpf,
          product_capacity: form.product_capacity,
          product_color: form.product_color,
          product_condition: form.product_condition,
          product_imei: form.product_imei,
          product_accessories: form.product_accessories,
        },
        product
          ? [{ product_id: form.selectedProduct, quantity: form.quantity, unit_price: product.sale_price }]
          : []
      );

      // Generate PDF immediately with form data (don't wait for refetch)
      const pdfData: SalePDFData = {
        sale_number: saleNumber,
        sale_type: form.sale_type,
        created_at: new Date(form.sale_date).toISOString(),
        seller_name: form.sale_type === 'compra' ? form.seller_name : (localStorage.getItem('user_name') || 'Easy Imports'),
        seller_cpf: form.sale_type === 'compra' ? form.seller_cpf : (localStorage.getItem('company_cnpj') || ''),
        seller_rg: form.sale_type === 'compra' ? form.seller_rg : '',
        seller_phone: form.sale_type === 'compra' ? form.seller_phone : (localStorage.getItem('user_telefone') || ''),
        seller_address: form.sale_type === 'compra' ? form.seller_address : '',
        seller_email: form.sale_type === 'compra' ? form.seller_email : 'easyimportsbrstore@gmail.com',
        customer_name: customerName,
        customer_phone: form.customer_phone || selectedCustomerData?.phone || '',
        customer_cpf: form.customer_cpf,
        product_name: productName || '',
        product_capacity: form.product_capacity,
        product_color: form.product_color,
        product_condition: form.product_condition,
        product_imei: form.product_imei,
        product_accessories: form.product_accessories,
        total_amount: totalAmount,
        payment_method: form.payment_method,
      };
      generatePDF(pdfData, getCompanyInfo());

      toast.success(`✅ ${TYPE_LABELS[form.sale_type]} ${saleNumber} registrada!`);
      setIsModalOpen(false);
      setForm(emptyForm());
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta venda? O estoque não será estornado automaticamente.')) return;
    try {
      await dataService.deleteSale(id);
      toast.success('Venda removida.');
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const handleGeneratePDF = (sale: any) => {
    const pdfData: SalePDFData = {
      sale_number: sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`,
      sale_type: sale.sale_type || 'venda',
      created_at: sale.created_at,
      seller_name: sale.seller_name || sale.customer_name,
      seller_cpf: sale.seller_cpf,
      seller_rg: sale.seller_rg,
      seller_phone: sale.seller_phone,
      seller_address: sale.seller_address,
      seller_email: sale.seller_email,
      customer_name: sale.customer_name || sale.customers?.name,
      customer_phone: sale.customer_phone,
      customer_cpf: sale.customer_cpf,
      product_name: sale.product_name,
      product_capacity: sale.product_capacity,
      product_color: sale.product_color,
      product_condition: sale.product_condition,
      product_imei: sale.product_imei,
      product_accessories: sale.product_accessories,
      total_amount: Number(sale.total_amount),
      payment_method: sale.payment_method,
    };
    generatePDF(pdfData, getCompanyInfo());
  };

  // Filters
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const nameMatch = !searchTerm ||
        (s.customer_name || s.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.sale_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.product_imei || '').includes(searchTerm);
      const fromMatch = !dateFrom || new Date(s.created_at) >= new Date(dateFrom);
      const toMatch = !dateTo || new Date(s.created_at) <= new Date(dateTo + 'T23:59:59');
      return nameMatch && fromMatch && toMatch;
    });
  }, [sales, searchTerm, dateFrom, dateTo]);

  // Group by month
  const salesByMonth = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredSales.forEach((s) => {
      const key = format(new Date(s.created_at), 'yyyy-MM');
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSales]);

  const toggleMonth = (key: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, 'MMMM yyyy', { locale: ptBR });
  };

  const totalRevenue = filteredSales.reduce((a, s) => a + Number(s.total_amount || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Vendas</h2>
          <p className="text-neutral-500">
            {sales.length} {sales.length === 1 ? 'operação' : 'operações'} —&nbsp;
            <strong>{formatCurrency(sales.reduce((a, s) => a + Number(s.total_amount || 0), 0))}</strong> total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSQL(!showSQL)} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
            SQL campos extras
          </button>
          <Button leftIcon={<Plus size={20} />} onClick={() => { setForm(emptyForm()); setIsModalOpen(true); }}>
            Nova Operação
          </Button>
        </div>
      </div>

      {/* SQL hint */}
      {showSQL && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-bold text-neutral-700 mb-2">Execute no Supabase → SQL Editor para habilitar todos os campos:</p>
          <pre className="text-xs bg-neutral-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{SALES_SQL}</pre>
          <Button variant="secondary" size="sm" className="mt-2"
            onClick={() => { navigator.clipboard.writeText(SALES_SQL); toast.success('SQL copiado!'); }}>
            Copiar SQL
          </Button>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, produto, IMEI, número..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25"
          title="De" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25"
          title="Até" />
        {(searchTerm || dateFrom || dateTo) && (
          <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
            className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-danger hover:border-danger transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Summary bar */}
      {(searchTerm || dateFrom || dateTo) && (
        <p className="text-sm text-neutral-500">
          {filteredSales.length} resultado{filteredSales.length !== 1 ? 's' : ''} — Total filtrado: <strong>{formatCurrency(totalRevenue)}</strong>
        </p>
      )}

      {/* Month-grouped sales */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredSales.length === 0 ? (
        <Card className="py-16 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
            <ShoppingCart size={28} className="text-neutral-300" />
          </div>
          <div>
            <p className="font-bold text-neutral-700">Nenhuma operação encontrada</p>
            <p className="text-sm text-neutral-400 mt-1">Registre sua primeira venda ou compra.</p>
          </div>
          <Button leftIcon={<Plus size={16} />} size="sm" onClick={() => setIsModalOpen(true)}>
            Nova Operação
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {salesByMonth.map(([monthKey, monthSales]) => {
            const isOpen = openMonths.has(monthKey);
            const monthTotal = monthSales.reduce((a, s) => a + Number(s.total_amount || 0), 0);

            return (
              <div key={monthKey} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown size={20} className="text-neutral-400" /> : <ChevronRight size={20} className="text-neutral-400" />}
                    <div>
                      <p className="font-bold text-neutral-900 capitalize">{monthLabel(monthKey)}</p>
                      <p className="text-xs text-neutral-400">{monthSales.length} operaç{monthSales.length === 1 ? 'ão' : 'ões'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-neutral-900">{formatCurrency(monthTotal)}</p>
                    <p className="text-xs text-neutral-400">total do mês</p>
                  </div>
                </button>

                {/* Sales rows */}
                {isOpen && (
                  <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                    {monthSales.map((sale) => {
                      const type = sale.sale_type || 'venda';
                      const num = sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`;
                      const name = sale.customer_name || sale.customers?.name || '—';

                      return (
                        <div key={sale.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                          {/* Number */}
                          <div className="w-20 flex-shrink-0">
                            <span className="text-xs font-mono font-bold text-neutral-600">{num}</span>
                          </div>

                          {/* Type badge */}
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0', TYPE_COLORS[type])}>
                            {TYPE_LABELS[type]}
                          </span>

                          {/* Name + product */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{name}</p>
                            <p className="text-xs text-neutral-400 truncate">
                              {sale.product_name}
                              {sale.product_imei ? ` · IMEI ${sale.product_imei}` : ''}
                            </p>
                          </div>

                          {/* Payment */}
                          <span className="hidden sm:block text-xs text-neutral-500 flex-shrink-0">
                            {sale.payment_method}
                          </span>

                          {/* Date */}
                          <span className="hidden md:block text-xs text-neutral-400 flex-shrink-0">
                            {formatDate(sale.created_at)}
                          </span>

                          {/* Value */}
                          <span className="font-black text-neutral-900 flex-shrink-0 text-sm">
                            {formatCurrency(Number(sale.total_amount))}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setDetailSale(sale)}
                              className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleGeneratePDF(sale)}
                              className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Baixar PDF"
                            >
                              <Download size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="p-1.5 text-neutral-400 hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── NOVA OPERAÇÃO MODAL ─── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Operação" maxWidth="2xl">
        <form onSubmit={handleCreateSale} className="space-y-6">

          {/* Tipo */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Tipo de Operação</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SALE_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    'flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    form.sale_type === t.value
                      ? 'border-primary bg-primary/10'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  <input type="radio" name="sale_type" value={t.value} checked={form.sale_type === t.value}
                    onChange={setF('sale_type')} className="hidden" />
                  <span className="font-bold text-sm text-neutral-900">{t.label}</span>
                  <span className="text-xs text-neutral-500">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dados do Vendedor (para compra) */}
          {form.sale_type === 'compra' && (
            <div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Dados do Vendedor</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input label="Nome Completo *" value={form.seller_name} onChange={setF('seller_name')} autoComplete="off" required />
                </div>
                <Input label="CPF" placeholder="000.000.000-00" value={form.seller_cpf} onChange={setF('seller_cpf')} autoComplete="off" />
                <Input label="RG" value={form.seller_rg} onChange={setF('seller_rg')} autoComplete="off" />
                <Input label="Telefone" placeholder="(11) 99999-9999" value={form.seller_phone} onChange={setF('seller_phone')} autoComplete="off" />
                <Input label="E-mail" type="email" value={form.seller_email} onChange={setF('seller_email')} autoComplete="off" />
                <div className="sm:col-span-2">
                  <Input label="Endereço Completo" value={form.seller_address} onChange={setF('seller_address')} autoComplete="off" />
                </div>
              </div>
            </div>
          )}

          {/* Dados do Cliente (para venda/troca) */}
          {(form.sale_type === 'venda' || form.sale_type === 'troca') && (
            <div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Dados do Comprador</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Cliente Cadastrado</label>
                  <select
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    value={form.selectedCustomer}
                    onChange={setF('selectedCustomer')}
                  >
                    <option value="">Selecione ou preencha abaixo...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ''}</option>
                    ))}
                  </select>
                </div>
                {!form.selectedCustomer && (
                  <>
                    <Input label="Nome (se não cadastrado)" value={form.seller_name} onChange={setF('seller_name')} autoComplete="off" />
                    <Input label="Telefone" value={form.customer_phone} onChange={setF('customer_phone')} autoComplete="off" />
                    <Input label="CPF" value={form.customer_cpf} onChange={setF('customer_cpf')} autoComplete="off" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Dados do Produto */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Dados do Produto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.sale_type !== 'compra' ? (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Produto do Estoque</label>
                  <select
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    value={form.selectedProduct}
                    onChange={setF('selectedProduct')}
                  >
                    <option value="">Selecione do estoque ou preencha manualmente...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.sale_price)} ({p.stock_quantity} un.)
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <Input
                  label={form.sale_type === 'compra' ? 'Produto / Modelo *' : 'Modelo (manual, se não selecionou acima)'}
                  placeholder="Ex: iPhone 13 Pro Max"
                  value={form.product_name_manual}
                  onChange={setF('product_name_manual')}
                  autoComplete="off"
                />
              </div>

              <Input label="Capacidade" placeholder="256GB" value={form.product_capacity} onChange={setF('product_capacity')} autoComplete="off" />
              <Input label="Cor" placeholder="Azul-Sierra" value={form.product_color} onChange={setF('product_color')} autoComplete="off" />

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado de Conservação</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                  value={form.product_condition}
                  onChange={setF('product_condition')}
                >
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <Input label="IMEI *" placeholder="352XXXXXXXXXXXX" value={form.product_imei} onChange={setF('product_imei')} autoComplete="off" />
              <div className="sm:col-span-2">
                <Input label="Acessórios Inclusos" placeholder="Cabo, carregador, caixa original..." value={form.product_accessories} onChange={setF('product_accessories')} autoComplete="off" />
              </div>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Condições de Pagamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={form.sale_type === 'compra' ? 'Valor Pago (R$) *' : 'Valor (R$) *'}
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.sale_price_manual || (selectedProductData ? String(selectedProductData.sale_price) : '')}
                onChange={setF('sale_price_manual')}
                required
              />
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Forma de Pagamento</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                  value={form.payment_method}
                  onChange={setF('payment_method')}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Data e Hora</label>
                <input
                  type="datetime-local"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                  value={form.sale_date}
                  onChange={setF('sale_date')}
                />
              </div>
            </div>

            {/* Preview total */}
            {(Number(form.sale_price_manual) > 0 || selectedProductData) && (
              <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-700">Total da operação:</span>
                <span className="text-2xl font-black text-primary-900">
                  {formatCurrency(Number(form.sale_price_manual) || (selectedProductData ? selectedProductData.sale_price * form.quantity : 0))}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit" leftIcon={<CheckCircle2 size={18} />}>
              Registrar {TYPE_LABELS[form.sale_type]}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── DETAIL / PDF MODAL ─── */}
      <Modal isOpen={!!detailSale} onClose={() => setDetailSale(null)} title={`Operação ${detailSale?.sale_number || ''}`} maxWidth="lg">
        {detailSale && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={cn('px-3 py-1 rounded-full text-sm font-bold', TYPE_COLORS[detailSale.sale_type || 'venda'])}>
                {TYPE_LABELS[detailSale.sale_type || 'venda']}
              </span>
              <span className="text-sm text-neutral-500">{formatDate(detailSale.created_at)}</span>
              <span className="ml-auto text-2xl font-black text-neutral-900">{formatCurrency(Number(detailSale.total_amount))}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Número', detailSale.sale_number],
                ['Pagamento', detailSale.payment_method],
                ['Produto', detailSale.product_name],
                ['IMEI', detailSale.product_imei],
                ['Capacidade', detailSale.product_capacity],
                ['Cor', detailSale.product_color],
                ['Estado', detailSale.product_condition],
                ['Acessórios', detailSale.product_accessories],
                ['Vendedor/Cliente', detailSale.customer_name || detailSale.seller_name],
                ['CPF', detailSale.seller_cpf || detailSale.customer_cpf],
                ['RG', detailSale.seller_rg],
                ['Telefone', detailSale.seller_phone || detailSale.customer_phone],
                ['Endereço', detailSale.seller_address],
                ['E-mail', detailSale.seller_email],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-bold">{label}</p>
                  <p className="font-semibold text-neutral-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            <Button fullWidth leftIcon={<Download size={18} />} onClick={() => handleGeneratePDF(detailSale)}>
              Gerar e Baixar PDF
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Vendas;
