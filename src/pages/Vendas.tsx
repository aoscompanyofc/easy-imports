import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart, Plus, Search, Package, CheckCircle2,
  Trash2, X, FileText, ChevronDown, ChevronRight, Download,
  RefreshCw, Eye, Link2, MessageCircle, Copy, UserPlus, RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { generatePDF, type CompanyInfo, type SalePDFData } from '../lib/pdfGenerator';
import { isConnected as gcIsConnected, createCalendarEvent } from '../lib/googleCalendar';
import { useProfileStore } from '../stores/profileStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SALE_TYPES = [
  { value: 'venda', label: 'Venda ao Cliente', desc: 'Easy Imports vende para um cliente' },
  { value: 'troca', label: 'Troca de Aparelhos', desc: 'Cliente entrega um aparelho e leva outro' },
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

function toWhatsAppNumber(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length >= 10) return '55' + d;
  return d;
}

function getCompanyInfo(): CompanyInfo {
  const store = useProfileStore.getState();
  return {
    name: store.name || localStorage.getItem('user_name') || 'Easy Imports',
    cnpj: store.cnpj || localStorage.getItem('company_cnpj') || '[CNPJ NÃO INFORMADO]',
    phone: store.telefone || localStorage.getItem('user_telefone') || '[TELEFONE NÃO INFORMADO]',
    email: 'easyimportsbrstore@gmail.com',
  };
}

function generateSaleNumber(existingCount: number, type: string) {
  const prefix = type === 'troca' ? 'T' : 'V';
  return `#${prefix}${String(existingCount + 1).padStart(4, '0')}`;
}

const emptyForm = () => ({
  sale_type: 'venda',
  // Cliente
  selectedCustomer: '', customer_phone: '', customer_cpf: '',
  seller_name: '', seller_cpf: '', seller_rg: '',
  seller_phone: '', seller_address: '', seller_email: '',
  // Produto que sai do estoque
  selectedProduct: '',
  product_name_manual: '',
  product_capacity: '', product_color: '',
  product_condition: 'Seminovo', product_imei: '',
  product_accessories: '',
  quantity: 1,
  sale_price_manual: '',
  // Aparelho que entra (troca)
  incoming_name: '',
  incoming_imei: '',
  incoming_category: 'Smartphones',
  incoming_capacity: '',
  incoming_color: '',
  incoming_condition: 'Seminovo',
  incoming_purchase_price: '',
  incoming_sale_price: '',
  // Pagamento
  payment_method: 'PIX',
  installments: 1,
  sale_date: new Date().toISOString().slice(0, 16),
  // WhatsApp para envio automático do link de assinatura
  whatsapp_number: '',
});

export const Vendas: React.FC = () => {
  const { signature: adminSignature } = useProfileStore();
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const [deleteSale, setDeleteSale] = useState<any | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [showSQL, setShowSQL] = useState(false);

  const [form, setForm] = useState(emptyForm());
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', cpf: '', email: '' });
  const [postSaleData, setPostSaleData] = useState<{
    customerName: string; phone: string; signLink: string;
    saleNumber: string; saleType: string;
  } | null>(null);

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

  // Auto-fill WhatsApp number from selected customer
  useEffect(() => {
    if (form.selectedCustomer) {
      const c = customers.find((c) => c.id === form.selectedCustomer);
      if (c?.phone) setForm((f) => ({ ...f, whatsapp_number: c.phone }));
    }
  }, [form.selectedCustomer, customers]);

  const selectedProductData = products.find((p) => p.id === form.selectedProduct);
  const selectedCustomerData = customers.find((c) => c.id === form.selectedCustomer);

  // Auto-fill WhatsApp from new customer phone as user types
  useEffect(() => {
    if (showNewCustomer && newCustomer.phone) {
      setForm((f) => ({ ...f, whatsapp_number: newCustomer.phone }));
    }
  }, [newCustomer.phone, showNewCustomer]);

  // When a product is selected from stock, pre-fill its details into the form
  useEffect(() => {
    if (!form.selectedProduct || !selectedProductData) return;
    setForm((f) => ({
      ...f,
      product_imei: f.product_imei || selectedProductData.imei || '',
      product_capacity: f.product_capacity || selectedProductData.product_capacity || '',
      product_color: f.product_color || selectedProductData.product_color || '',
      product_condition: f.product_condition || selectedProductData.product_condition || 'Seminovo',
      // Pre-fill sale price only if product has one defined (> 0) and user hasn't typed one yet
      sale_price_manual: f.sale_price_manual || (selectedProductData.sale_price > 0 ? String(selectedProductData.sale_price) : ''),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.selectedProduct]);

  // Actual unit price: manual input wins, then product.sale_price if > 0, else 0
  const resolvedUnitPrice = Number(form.sale_price_manual) || (selectedProductData?.sale_price > 0 ? selectedProductData.sale_price : 0);
  const salePrice = resolvedUnitPrice * form.quantity;

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.selectedCustomer && !form.product_name_manual && !form.selectedProduct) {
      toast.error('Selecione um cliente e um produto.');
      return;
    }

    const product = form.selectedProduct ? selectedProductData : null;
    const productName = product?.name || form.product_name_manual;
    const unitPrice = Number(form.sale_price_manual) || (product && product.sale_price > 0 ? product.sale_price : 0);
    const totalAmount = unitPrice * form.quantity;

    if (totalAmount <= 0) { toast.error('Informe o valor da venda (campo Valor R$).'); return; }

    const saleNumber = generateSaleNumber(sales.length, form.sale_type);

    try {
      setIsSaving(true);

      // Create new customer on-the-fly if requested
      let customerId = form.selectedCustomer || null;
      let customerName = selectedCustomerData?.name || form.seller_name || 'Avulso';
      let customerPhone = form.customer_phone || selectedCustomerData?.phone;

      if (showNewCustomer && newCustomer.name.trim()) {
        const created = await dataService.addCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim(),
        });
        customerId = created.id;
        customerName = created.name;
        customerPhone = created.phone || customerPhone;
        setCustomers((prev) => [created, ...prev]);
      }

      const savedSale = await dataService.addSale(
        {
          customer_id: customerId,
          customer_name: customerName,
          product_name: productName,
          total_amount: totalAmount,
          payment_method: form.payment_method,
          installments: form.installments,
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
          customer_phone: customerPhone,
          customer_cpf: newCustomer.cpf || form.customer_cpf,
          product_capacity: form.product_capacity,
          product_color: form.product_color,
          product_condition: form.product_condition,
          product_imei: form.product_imei,
          product_accessories: form.product_accessories,
        },
        product
          ? [{ product_id: form.selectedProduct, quantity: form.quantity, unit_price: unitPrice }]
          : []
      );

      // For troca: add incoming device to stock
      if (form.sale_type === 'troca' && form.incoming_name.trim()) {
        await dataService.addProduct({
          name: form.incoming_name.trim(),
          category: form.incoming_category || 'Smartphones',
          purchase_price: Number(form.incoming_purchase_price) || 0,
          sale_price: 0,
          stock_quantity: 1,
          status: 'available',
          imei: form.incoming_imei || '',
          product_capacity: form.incoming_capacity || '',
          product_color: form.incoming_color || '',
          product_condition: form.incoming_condition || 'Seminovo',
        });
      }

      // Generate PDF immediately with form data
      const pdfData: SalePDFData = {
        sale_number: saleNumber,
        sale_type: form.sale_type,
        created_at: new Date(form.sale_date).toISOString(),
        seller_name: getCompanyInfo().name,
        seller_cpf: getCompanyInfo().cnpj,
        seller_rg: '',
        seller_phone: getCompanyInfo().phone,
        seller_address: '',
        seller_email: getCompanyInfo().email,
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
        installments: form.installments,
        signature_admin: adminSignature || undefined,
      };
      generatePDF(pdfData, getCompanyInfo());

      // Google Calendar event (fire-and-forget — don't block sale flow)
      const signLink = savedSale?.sign_token
        ? `${window.location.origin}/assinar/${savedSale.sign_token}`
        : '';
      if (gcIsConnected()) {
        const typeLabel = form.sale_type === 'troca' ? 'Troca' : 'Venda';
        const desc = [
          `Cliente: ${customerName}`,
          form.customer_phone || customerPhone ? `Telefone: ${form.customer_phone || customerPhone}` : '',
          `Produto: ${productName || '—'}`,
          form.product_imei ? `IMEI: ${form.product_imei}` : '',
          `Valor: ${formatCurrency(totalAmount)}`,
          form.installments > 1 ? `Parcelamento: ${form.installments}x de ${formatCurrency(totalAmount / form.installments)}` : '',
          `Pagamento: ${form.payment_method}`,
          signLink ? `Link de assinatura: ${signLink}` : '',
        ].filter(Boolean).join('\n');

        createCalendarEvent({
          title: `${typeLabel} ${saleNumber} — ${customerName}`,
          description: desc,
          startISO: new Date(form.sale_date).toISOString(),
          durationMinutes: 30,
        }).then(() => {
          toast.success('Evento criado no Google Agenda!', { icon: '📅', duration: 3000 });
        }).catch((e: any) => {
          if (e.message === 'not_connected') {
            toast('Google Agenda desconectado. Reconecte em Configurações → Integrações.', { icon: '📅' });
          } else {
            console.warn('Google Calendar error:', e.message);
          }
        });
      }

      // Build WhatsApp post-sale data
      const whatsappPhone = form.whatsapp_number || customerPhone || '';
      const postName = customerName;

      setPostSaleData({ customerName: postName, phone: whatsappPhone, signLink, saleNumber, saleType: form.sale_type });
      setIsModalOpen(false);
      setForm(emptyForm());
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '', cpf: '', email: '' });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (sale: any) => {
    setDeleteSale(sale);
  };

  const handleDeleteWithChoice = async (choice: 'restore' | 'discard') => {
    if (!deleteSale) return;
    setIsDeletingSale(true);
    try {
      if (choice === 'restore') {
        const allProds = await dataService.getProducts();
        const found = allProds.find((p: any) => {
          if (deleteSale.product_imei && p.imei) return p.imei === deleteSale.product_imei;
          return p.name === deleteSale.product_name && p.stock_quantity <= 0;
        });
        if (found) {
          await dataService.updateProduct(found.id, {
            name: found.name,
            category: found.category,
            imei: found.imei,
            purchase_price: found.purchase_price,
            sale_price: found.sale_price,
            stock_quantity: 1,
            status: 'available',
          });
          toast.success('Produto devolvido ao estoque!');
        } else {
          toast('Produto não localizado automaticamente — ajuste o estoque manualmente se necessário.', { icon: '⚠️', duration: 5000 });
        }
      }
      await dataService.deleteSale(deleteSale.id);
      toast.success('Venda cancelada e removida.');
      setDeleteSale(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsDeletingSale(false);
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
      installments: sale.installments || 1,
      signature_admin: adminSignature || undefined,
      signature_client: sale.signature_client || undefined,
    };
    generatePDF(pdfData, getCompanyInfo());
  };

  const handleCopySignLink = async (sale: any) => {
    if (!sale.sign_token) { toast.error('Esta venda não tem token de assinatura. Registre novamente.'); return; }
    const link = `${window.location.origin}/assinar/${sale.sign_token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link de assinatura copiado!');
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
          <Button leftIcon={<Plus size={20} />} onClick={() => { setForm(emptyForm()); setShowNewCustomer(false); setNewCustomer({ name: '', phone: '', cpf: '', email: '' }); setIsModalOpen(true); }}>
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
                            {sale.installments > 1
                              ? `${sale.installments}x ${formatCurrency(sale.total_amount / sale.installments)}`
                              : sale.payment_method}
                          </span>

                          {/* Signature status */}
                          <span className={cn(
                            'hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0',
                            sale.signature_client
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {sale.signature_client ? (
                              <><CheckCircle2 size={10} /> Assinado</>
                            ) : (
                              <><RefreshCw size={10} /> Aguardando</>
                            )}
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
                              onClick={() => handleDelete(sale)}
                              className="p-1.5 text-neutral-400 hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                              title="Cancelar venda"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Dados do Cliente */}
          <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Dados do Comprador</p>
                <button
                  type="button"
                  onClick={() => { setShowNewCustomer((v) => !v); setForm((f) => ({ ...f, selectedCustomer: '' })); }}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors',
                    showNewCustomer
                      ? 'bg-primary/10 border-primary/30 text-primary-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-primary/30 hover:text-primary-900'
                  )}
                >
                  <UserPlus size={13} />
                  {showNewCustomer ? 'Usar cliente cadastrado' : 'Novo cliente'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* New customer inline form */}
                {showNewCustomer ? (
                  <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                      <UserPlus size={13} /> Novo Cliente — será salvo na sua base
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <Input
                          label="Nome Completo *"
                          placeholder="João da Silva"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
                          autoComplete="off"
                          required={showNewCustomer}
                        />
                      </div>
                      <Input
                        label="Telefone / WhatsApp"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
                        autoComplete="off"
                      />
                      <Input
                        label="CPF"
                        placeholder="000.000.000-00"
                        value={newCustomer.cpf}
                        onChange={(e) => setNewCustomer((c) => ({ ...c, cpf: e.target.value }))}
                        autoComplete="off"
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="E-mail"
                          type="email"
                          placeholder="joao@email.com"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}

                {!showNewCustomer && !form.selectedCustomer && (
                <>
                  <Input label="Nome (se não cadastrado)" value={form.seller_name} onChange={setF('seller_name')} autoComplete="off" />
                  <Input label="CPF" value={form.customer_cpf} onChange={setF('customer_cpf')} autoComplete="off" />
                </>
              )}

              {/* WhatsApp — always visible so the signing link can be sent */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                  <MessageCircle size={15} className="text-green-500" />
                  WhatsApp do Cliente <span className="text-neutral-400 font-normal text-xs">(para envio do link de assinatura)</span>
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp_number}
                  onChange={setF('whatsapp_number')}
                  autoComplete="off"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400"
                />
              </div>
              </div>
            </div>

          {/* Dados do Produto (que sai do estoque) */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">
              {form.sale_type === 'troca' ? 'Aparelho Saindo (do seu estoque)' : 'Dados do Produto'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="sm:col-span-2">
                <Input
                  label="Modelo (manual, se não selecionou acima)"
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

          {/* Aparelho Entrando (troca) */}
          {form.sale_type === 'troca' && (
            <div className="border border-purple-200 bg-purple-50/50 rounded-2xl p-4 space-y-4">
              <p className="text-xs font-black text-purple-600 uppercase tracking-widest">
                Aparelho Entrando (do cliente)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Modelo do aparelho *"
                    placeholder="Ex: Samsung Galaxy S22"
                    value={form.incoming_name}
                    onChange={setF('incoming_name')}
                    autoComplete="off"
                  />
                </div>
                <Input label="IMEI" placeholder="352XXXXXXXXXXXX" value={form.incoming_imei} onChange={setF('incoming_imei')} autoComplete="off" />
                <Input label="Capacidade" placeholder="128GB" value={form.incoming_capacity} onChange={setF('incoming_capacity')} autoComplete="off" />
                <Input label="Cor" placeholder="Preto" value={form.incoming_color} onChange={setF('incoming_color')} autoComplete="off" />
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado</label>
                  <select
                    className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                    value={form.incoming_condition}
                    onChange={setF('incoming_condition')}
                  >
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Input
                  label="Valor dado ao cliente (R$) *"
                  type="number"
                  step="0.01"
                  placeholder="Quanto você avaliou o aparelho"
                  value={form.incoming_purchase_price}
                  onChange={setF('incoming_purchase_price')}
                  autoComplete="off"
                />
                <Input
                  label="Previsão de revenda (R$)"
                  type="number"
                  step="0.01"
                  placeholder="Quanto pretende vender depois"
                  value={form.incoming_sale_price}
                  onChange={setF('incoming_sale_price')}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-purple-500">Este aparelho será adicionado automaticamente ao seu estoque.</p>

              {/* ── Painel de lucratividade da troca ── */}
              {(() => {
                const outSale   = Number(form.sale_price_manual) || 0;
                const outCost   = selectedProductData?.purchase_price || 0;
                const tradeIn   = Number(form.incoming_purchase_price) || 0;
                const inResale  = Number(form.incoming_sale_price) || 0;

                const cashReceived    = outSale - tradeIn;
                const profitOutgoing  = outSale - outCost;
                const profitIncoming  = inResale > 0 ? inResale - tradeIn : null;
                const totalProfit     = profitOutgoing + (profitIncoming ?? 0);
                const hasNumbers      = outSale > 0 || outCost > 0 || tradeIn > 0;

                if (!hasNumbers) return null;

                const profitColor = (v: number) =>
                  v > 0 ? 'text-green-700' : v < 0 ? 'text-red-600' : 'text-neutral-600';

                return (
                  <div className="bg-white border border-purple-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-purple-700 uppercase tracking-widest">📊 Análise da Troca</p>

                    {/* Aparelho saindo */}
                    <div className="space-y-1 text-sm">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aparelho saindo</p>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Preço de venda</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(outSale)}</span>
                      </div>
                      {outCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Custo do estoque</span>
                          <span className="font-bold text-neutral-600">− {formatCurrency(outCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-neutral-100">
                        <span className="font-bold text-neutral-700">Margem bruta</span>
                        <span className={cn('font-black', profitColor(profitOutgoing))}>
                          {formatCurrency(profitOutgoing)}
                          {outSale > 0 && <span className="text-xs font-normal ml-1">({((profitOutgoing / outSale) * 100).toFixed(0)}%)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Aparelho entrando */}
                    {tradeIn > 0 && (
                      <div className="space-y-1 text-sm border-t border-neutral-100 pt-3">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aparelho entrando</p>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Valor dado ao cliente</span>
                          <span className="font-bold text-neutral-600">− {formatCurrency(tradeIn)}</span>
                        </div>
                        {inResale > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Previsão de revenda</span>
                              <span className="font-bold text-neutral-900">{formatCurrency(inResale)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-neutral-100">
                              <span className="font-bold text-neutral-700">Lucro potencial</span>
                              <span className={cn('font-black', profitColor(profitIncoming ?? 0))}>
                                {formatCurrency(profitIncoming ?? 0)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Totais */}
                    <div className="border-t-2 border-purple-200 pt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Você recebe em caixa agora</span>
                        <span className={cn('font-bold', profitColor(cashReceived))}>{formatCurrency(cashReceived)}</span>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="font-black text-neutral-800">
                          {profitIncoming !== null ? 'Lucro total esperado' : 'Lucro bruto'}
                        </span>
                        <span className={cn('font-black text-lg', profitColor(totalProfit))}>
                          {formatCurrency(totalProfit)}
                        </span>
                      </div>
                      {totalProfit < 0 && (
                        <p className="text-xs text-red-600 font-bold bg-red-50 rounded-lg px-3 py-2">
                          ⚠️ Atenção: você está no prejuízo nesta operação!
                        </p>
                      )}
                      {totalProfit === 0 && (
                        <p className="text-xs text-amber-600 font-bold bg-amber-50 rounded-lg px-3 py-2">
                          ⚠️ Operação no zero a zero — sem lucro nem prejuízo.
                        </p>
                      )}
                      {totalProfit > 0 && (
                        <p className="text-xs text-green-700 font-bold bg-green-50 rounded-lg px-3 py-2">
                          ✅ Operação no lucro!
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Condições de Pagamento */}
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Condições de Pagamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Valor de Venda (R$) *"
                type="number"
                step="0.01"
                placeholder="Digite o valor"
                value={form.sale_price_manual}
                onChange={setF('sale_price_manual')}
                required
              />
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Forma de Pagamento</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                  value={form.payment_method}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f: any) => ({ ...f, payment_method: v, installments: v === 'Cartão de Crédito' ? f.installments : 1 }));
                  }}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {form.payment_method === 'Cartão de Crédito' && (
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Parcelas</label>
                  <select
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    value={form.installments}
                    onChange={(e) => setForm((f: any) => ({ ...f, installments: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => {
                      const label = n === 1 ? '1x (à vista)' : `${n}x de ${salePrice > 0 ? formatCurrency(salePrice / n) : '—'}`;
                      return <option key={n} value={n}>{label}</option>;
                    })}
                  </select>
                </div>
              )}
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
            {salePrice > 0 && (
              <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-700">Total da operação:</span>
                <span className="text-2xl font-black text-primary-900">{formatCurrency(salePrice)}</span>
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

      {/* ─── POST-SALE SUCCESS MODAL ─── */}
      <Modal
        isOpen={!!postSaleData}
        onClose={() => setPostSaleData(null)}
        title="✅ Operação registrada!"
        maxWidth="md"
      >
        {postSaleData && (() => {
          const { customerName, phone, signLink, saleNumber, saleType } = postSaleData;
          const waNumber = toWhatsAppNumber(phone);
          const companyName = useProfileStore.getState().name || 'Five Akon';
          const waMessage = [
            `Olá ${customerName}! 👋`,
            ``,
            `Aqui é a *${companyName}*.`,
            ``,
            `Seu documento *${saleNumber}* foi gerado com sucesso! ✅`,
            signLink ? `\nPara assinar digitalmente, acesse o link abaixo:` : '',
            signLink ? `👉 ${signLink}` : '',
            ``,
            `Qualquer dúvida é só chamar! 😊`,
          ].filter((l) => l !== undefined).join('\n');

          return (
            <div className="space-y-5">
              <div className="bg-neutral-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Operação</span>
                  <span className="font-bold">{saleNumber} — {TYPE_LABELS[saleType]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cliente</span>
                  <span className="font-bold">{customerName}</span>
                </div>
                {phone && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">WhatsApp</span>
                    <span className="font-bold">{phone}</span>
                  </div>
                )}
                {signLink && (
                  <div className="pt-1 border-t border-neutral-200">
                    <p className="text-neutral-500 text-xs mb-1">Link de assinatura</p>
                    <p className="text-xs font-mono text-neutral-700 break-all">{signLink}</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-neutral-600 font-medium">
                O PDF foi gerado. Agora envie o link de assinatura pelo WhatsApp:
              </p>

              <div className="flex flex-col gap-3">
                {phone && waNumber ? (
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors"
                  >
                    <MessageCircle size={20} />
                    Enviar pelo WhatsApp
                  </a>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Número de WhatsApp não informado. Copie o link abaixo e envie manualmente.
                  </div>
                )}

                {signLink && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(signLink); toast.success('Link copiado!'); }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-sm font-medium transition-colors"
                  >
                    <Copy size={15} />
                    Copiar link de assinatura
                  </button>
                )}

                <button
                  onClick={() => setPostSaleData(null)}
                  className="w-full py-2.5 rounded-xl text-neutral-500 hover:text-neutral-700 text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─── CANCELAR VENDA MODAL ─── */}
      <Modal isOpen={!!deleteSale} onClose={() => !isDeletingSale && setDeleteSale(null)} title="Cancelar Venda" maxWidth="sm">
        {deleteSale && (
          <div className="space-y-5">
            {/* Sale summary */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', TYPE_COLORS[deleteSale.sale_type || 'venda'])}>
                  {TYPE_LABELS[deleteSale.sale_type || 'venda']}
                </span>
                <span className="text-xs font-mono text-neutral-500">{deleteSale.sale_number}</span>
              </div>
              <p className="font-bold text-neutral-900">{deleteSale.customer_name}</p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {deleteSale.product_name}
                {deleteSale.product_imei ? ` · IMEI ${deleteSale.product_imei}` : ''}
              </p>
              <p className="text-lg font-black text-neutral-900 mt-2">{formatCurrency(Number(deleteSale.total_amount))}</p>
            </div>

            <div>
              <p className="text-sm font-black text-neutral-700 mb-3">O que fazer com o produto?</p>
              <div className="space-y-3">
                {/* Restore to stock */}
                <button
                  onClick={() => handleDeleteWithChoice('restore')}
                  disabled={isDeletingSale}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                    <RotateCcw size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">Devolver ao estoque</p>
                    <p className="text-xs text-neutral-500 mt-0.5">O produto volta como disponível para nova venda</p>
                  </div>
                </button>

                {/* Discard — just delete the sale */}
                <button
                  onClick={() => handleDeleteWithChoice('discard')}
                  disabled={isDeletingSale}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-neutral-200 hover:border-red-300 hover:bg-red-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} className="text-neutral-500" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">Só remover a venda</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Produto não volta ao estoque (descartado, perdido, etc.)</p>
                  </div>
                </button>
              </div>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setDeleteSale(null)}
              type="button"
              disabled={isDeletingSale}
            >
              Cancelar
            </Button>
          </div>
        )}
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
                ['Pagamento', detailSale.installments > 1
                  ? `Cartão de Crédito — ${detailSale.installments}x de ${formatCurrency(detailSale.total_amount / detailSale.installments)}`
                  : detailSale.payment_method],
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

            {/* Signature status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold',
                detailSale.signature_client ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                {detailSale.signature_client ? <CheckCircle2 size={13} /> : <Package size={13} />}
                {detailSale.signature_client ? 'Cliente assinou' : 'Aguardando assinatura do cliente'}
              </div>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              {detailSale.sign_token && (detailSale.customer_phone || detailSale.seller_phone) && (
                <a
                  href={(() => {
                    const phone = detailSale.customer_phone || detailSale.seller_phone || '';
                    const link = `${window.location.origin}/assinar/${detailSale.sign_token}`;
                    const name = detailSale.customer_name || detailSale.customers?.name || 'Cliente';
                    const msg = `Olá ${name}! 👋\n\nAqui é a *${useProfileStore.getState().name || 'Five Akon'}*.\n\nSeu documento *${detailSale.sale_number || ''}* está pronto! ✅\n\nPara assinar digitalmente:\n👉 ${link}\n\nQualquer dúvida é só chamar! 😊`;
                    return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(msg)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
              )}
              <Button fullWidth={!(detailSale.customer_phone || detailSale.seller_phone)} leftIcon={<Link2 size={16} />} variant="secondary"
                onClick={() => handleCopySignLink(detailSale)}>
                Copiar Link
              </Button>
              <Button fullWidth leftIcon={<Download size={16} />} onClick={() => handleGeneratePDF(detailSale)}>
                Gerar PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Vendas;
