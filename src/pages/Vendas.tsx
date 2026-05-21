import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart, Plus, Search, Package, CheckCircle2,
  Trash2, X, FileText, ChevronDown, ChevronRight, Download,
  RefreshCw, Eye, Link2, MessageCircle, Copy, UserPlus, RotateCcw, Pencil,
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
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_rg TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_phone TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_email TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_city TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_capacity TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_color TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_condition TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_imei TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_accessories TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_imei TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_serial TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_email TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_capacity TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_color TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_condition TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_battery_health TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS incoming_purchase_price NUMERIC DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS pdf_type TEXT DEFAULT 'seminovo';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 0;`;

function toWhatsAppNumber(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length >= 10) return '55' + d;
  return d;
}

export function getCompanyInfo(): CompanyInfo {
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
  selectedCustomer: '', customer_phone: '', customer_cpf: '', customer_city: '',
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
  incoming_serial: '',
  incoming_email: '',
  incoming_category: 'Smartphones',
  incoming_capacity: '',
  incoming_color: '',
  incoming_condition: 'Seminovo',
  incoming_battery_health: '',
  incoming_purchase_price: '',
  incoming_sale_price: '',
  // Pagamento
  payment_method: 'PIX',
  installments: 1,
  sale_date: new Date().toISOString().slice(0, 16),
  // WhatsApp para envio automático do link de assinatura
  whatsapp_number: '',
  // Tipo de garantia no PDF: 'novo' = fabricante 1 ano | 'seminovo' = 90 dias Easy Imports
  pdf_type: 'seminovo',
  // Custo manual (quando produto não vem do estoque)
  product_cost_manual: '',
  // Salvar produto no histórico do estoque mesmo sendo venda sob demanda
  save_to_stock: false,
  // Pagamento dividido
  split_payment: false,
  payment2_method: 'Cartão de Crédito',
  payment2_amount: '',
});

export const Vendas: React.FC = () => {
  const { signature: adminSignature } = useProfileStore();
  const [sales, setSales] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const [deleteSale, setDeleteSale] = useState<any | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [editSale, setEditSale] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const setEF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm((f: any) => ({ ...f, [field]: e.target.value }));

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [showSQL, setShowSQL] = useState(false);

  const [form, setForm] = useState(emptyForm());
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', cpf: '', email: '', address: '' });
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
      const [salesData, custData, prodData, txData] = await Promise.all([
        dataService.getSales(),
        dataService.getCustomers(),
        dataService.getProducts(),
        dataService.getTransactions(),
      ]);
      setSales(salesData || []);
      setTransactions(txData || []);
      setCustomers(custData || []);
      setProducts((prodData || []).filter((p: any) => p.stock_quantity > 0));

      // Default: open current month
      const thisMonth = format(new Date(), 'yyyy-MM');
      setOpenMonths(new Set([thisMonth]));

      // Auto-fix: vendas salvas sem sale_type mas com aparelho entrante → são trocas
      const toFix = (salesData || []).filter(
        (s: any) => s.incoming_name?.trim() && s.sale_type !== 'troca'
      );
      if (toFix.length > 0) {
        await Promise.all(
          toFix.map((s: any) =>
            dataService.updateSale(s.id, { sale_type: 'troca' }).catch(() => {})
          )
        );
        // Re-busca com os tipos corrigidos
        const fixed = await dataService.getSales();
        if (fixed) setSales(fixed);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Map sale_number / ID-prefix → cost de transações auto-criadas (suporta formato antigo e novo)
  const costBySale = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === 'expense' && t.category === 'stock') {
        if (t.description?.startsWith('Custo Mercadoria #')) {
          // Formato antigo: "Custo Mercadoria #a3f8b2c1"
          const prefix = t.description.replace('Custo Mercadoria #', '').trim();
          map[`uuid:${prefix}`] = (map[`uuid:${prefix}`] || 0) + Number(t.amount || 0);
        } else if (t.description?.startsWith('Custo #') || t.description?.startsWith('Custo T') || t.description?.startsWith('Custo V')) {
          // Formato novo: "Custo #V0001 — iPhone 17 Pro Max"
          const match = t.description.match(/^Custo (#[A-Z0-9]+)/);
          if (match) map[match[1]] = (map[match[1]] || 0) + Number(t.amount || 0);
        }
      }
    }
    return map;
  }, [transactions]);

  // Auto-fill WhatsApp e CPF do cliente selecionado
  useEffect(() => {
    if (form.selectedCustomer) {
      const c = customers.find((c) => c.id === form.selectedCustomer);
      const updates: Record<string, string> = {};
      if (c?.phone) updates.whatsapp_number = c.phone;
      if (c?.cpf)   updates.customer_cpf   = c.cpf;
      if (c?.city)  updates.customer_city  = c.city;
      if (Object.keys(updates).length > 0) setForm((f) => ({ ...f, ...updates }));
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

  // When a product is selected from stock, pre-fill its details into the form.
  // product_condition always comes from the stock record (strips battery note suffix).
  useEffect(() => {
    if (!form.selectedProduct || !selectedProductData) return;
    const rawCond = (selectedProductData.product_condition || 'Seminovo').replace(/ · Bateria:.*/, '');
    const condLower = rawCond.toLowerCase();
    const condIsNovo = condLower === 'novo' || condLower.startsWith('novo ') || condLower.startsWith('novo(');
    setForm((f) => ({
      ...f,
      product_imei:     f.product_imei     || selectedProductData.imei              || '',
      product_capacity: f.product_capacity || selectedProductData.product_capacity  || '',
      product_color:    f.product_color    || selectedProductData.product_color     || '',
      product_condition: rawCond,
      pdf_type: condIsNovo ? 'novo' : 'seminovo',
      sale_price_manual: f.sale_price_manual || (selectedProductData.sale_price > 0 ? String(selectedProductData.sale_price) : ''),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.selectedProduct]);

  // Actual unit price: manual input wins, then product.sale_price if > 0, else 0
  const resolvedUnitPrice = Number(form.sale_price_manual) || (selectedProductData?.sale_price > 0 ? selectedProductData.sale_price : 0);
  const salePrice = resolvedUnitPrice * form.quantity;

  // Lucro estimado para venda simples (sempre calculado, exibido no preview de pagamento)
  const unitCost = selectedProductData?.purchase_price || Number(form.product_cost_manual) || 0;
  const totalCost = unitCost * (form.quantity || 1);
  const vendaProfit = salePrice - totalCost;
  const vendaMargin = salePrice > 0 ? Math.round((vendaProfit / salePrice) * 100) : 0;
  const hasCost = unitCost > 0;

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.selectedCustomer && !form.product_name_manual && !form.selectedProduct) {
      toast.error('Selecione um cliente e um produto.');
      return;
    }

    const product = form.selectedProduct ? selectedProductData : null;
    const productName = product?.name || form.product_name_manual;
    const unitPrice = Number(form.sale_price_manual) || (product && product.sale_price > 0 ? product.sale_price : 0);
    // Para troca: total_amount = caixa recebido + valor do aparelho que entrou
    // (representa o valor real da transação, evitando lucro negativo no Dashboard)
    const tradeInValue = form.sale_type === 'troca' ? Number(form.incoming_purchase_price || 0) : 0;
    const totalAmount = unitPrice * form.quantity + tradeInValue;

    if (unitPrice <= 0) { toast.error('Informe o valor da venda (campo Valor R$).'); return; }

    // Monta forma de pagamento combinada se split ativo
    let resolvedPaymentMethod = form.payment_method;
    if (form.split_payment && Number(form.payment2_amount) > 0) {
      const p2 = Number(form.payment2_amount);
      const p1 = Math.max(0, unitPrice * form.quantity - p2);
      const cardMethod = form.payment2_method === 'Cartão de Crédito' ? form.payment2_method : form.payment_method === 'Cartão de Crédito' ? form.payment_method : null;
      const instStr = cardMethod && form.installments > 1 ? ` ${form.installments}x` : '';
      resolvedPaymentMethod = `${form.payment_method} (${formatCurrency(p1)}) + ${form.payment2_method}${instStr} (${formatCurrency(p2)})`;
    }

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
          cpf: newCustomer.cpf.trim(),
          city: newCustomer.address.trim(),
        });
        customerId = created.id;
        customerName = created.name;
        customerPhone = created.phone || customerPhone;
        setCustomers((prev) => [created, ...prev]);
      }

      // Resolve customer fields — new customer form takes priority over existing customer data
      const resolvedCpf = newCustomer.cpf.trim() || form.customer_cpf || selectedCustomerData?.cpf || '';
      const resolvedCity = newCustomer.address.trim() || form.customer_city || selectedCustomerData?.city || '';

      const savedSale = await dataService.addSale(
        {
          customer_id: customerId,
          customer_name: customerName,
          product_name: productName,
          total_amount: totalAmount,
          payment_method: resolvedPaymentMethod,
          installments: form.split_payment ? 1 : form.installments,
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
          customer_cpf: resolvedCpf,
          customer_city: resolvedCity,
          product_capacity: form.product_capacity,
          product_color: form.product_color,
          product_condition: form.product_condition,
          product_imei: form.product_imei || selectedProductData?.imei || '',
          product_accessories: form.product_accessories,
          incoming_name: form.incoming_name || '',
          incoming_imei: form.incoming_imei || '',
          incoming_capacity: form.incoming_capacity || '',
          incoming_color: form.incoming_color || '',
          incoming_condition: form.incoming_condition || '',
          incoming_battery_health: form.incoming_battery_health || '',
          incoming_purchase_price: Number(form.incoming_purchase_price) || 0,
          pdf_type: form.pdf_type || 'seminovo',
        },
        product
          ? [{ product_id: form.selectedProduct, quantity: form.quantity, unit_price: unitPrice }]
          : []
      );

      // For troca: add incoming device to stock
      if (form.sale_type === 'troca' && form.incoming_name.trim()) {
        const batteryNote = form.incoming_battery_health ? ` · Bateria: ${form.incoming_battery_health}` : '';
        await dataService.addProduct({
          name: form.incoming_name.trim(),
          category: form.incoming_category || 'Smartphones',
          purchase_price: Number(form.incoming_purchase_price) || 0,
          sale_price: Number(form.incoming_sale_price) || 0,
          stock_quantity: 1,
          status: 'available',
          imei: form.incoming_imei || '',
          product_capacity: form.incoming_capacity || '',
          product_color: form.incoming_color || '',
          product_condition: (form.incoming_condition || 'Seminovo') + batteryNote,
          entry_date: new Date(form.sale_date).toISOString().split('T')[0],
        });
      }

      // Para trocas: registra o valor do aparelho que entrou como receita
      if (form.sale_type === 'troca' && form.incoming_name.trim() && Number(form.incoming_purchase_price) > 0) {
        await dataService.addTransaction({
          description: `Aparelho Recebido ${saleNumber} — ${form.incoming_name.trim()}`,
          amount: Number(form.incoming_purchase_price),
          type: 'income',
          category: 'trade',
          date: new Date(form.sale_date).toISOString().slice(0, 10),
        });
      }

      // Para produtos sem estoque: cria transações financeiras manualmente
      if (!product) {
        await dataService.addTransaction({
          description: `Receita ${saleNumber} — ${productName || 'Produto'}`,
          amount: unitPrice * form.quantity,
          type: 'income',
          category: 'sale',
          date: new Date(form.sale_date).toISOString().slice(0, 10),
        });
        const manualCost = Number(form.product_cost_manual);
        if (manualCost > 0) {
          await dataService.addTransaction({
            description: `Custo ${saleNumber} — ${productName || 'Produto'}`,
            amount: manualCost * form.quantity,
            type: 'expense',
            category: 'stock',
            date: new Date(form.sale_date).toISOString().slice(0, 10),
          });
        }

        // Salvar no histórico do estoque se solicitado
        if (form.save_to_stock && productName) {
          await dataService.addProduct({
            name: productName,
            category: form.incoming_category || 'Smartphones',
            purchase_price: manualCost || 0,
            sale_price: unitPrice,
            stock_quantity: 0,
            status: 'out_of_stock',
            imei: form.product_imei || '',
            product_capacity: form.product_capacity || '',
            product_color: form.product_color || '',
            product_condition: form.product_condition || 'Seminovo',
            entry_date: new Date(form.sale_date).toISOString().split('T')[0],
          });
        }
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
        customer_phone: customerPhone || '',
        customer_cpf: resolvedCpf,
        customer_city: resolvedCity,
        product_name: productName || '',
        product_capacity: form.product_capacity,
        product_color: form.product_color,
        product_condition: form.product_condition,
        product_imei: form.product_imei || selectedProductData?.imei || '',
        product_accessories: form.product_accessories,
        total_amount: totalAmount,
        payment_method: resolvedPaymentMethod,
        installments: form.split_payment ? 1 : form.installments,
        // Aparelho entrante (troca)
        incoming_name: form.incoming_name || undefined,
        incoming_imei: form.incoming_imei || undefined,
        incoming_serial: form.incoming_serial || undefined,
        incoming_email: form.incoming_email || undefined,
        incoming_capacity: form.incoming_capacity || undefined,
        incoming_color: form.incoming_color || undefined,
        incoming_condition: form.incoming_condition || undefined,
        incoming_battery_health: form.incoming_battery_health || undefined,
        incoming_purchase_price: Number(form.incoming_purchase_price) || undefined,
        signature_admin: adminSignature || undefined,
        pdf_type: form.pdf_type || 'seminovo',
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
          form.installments > 1 ? `Parcelamento: ${form.installments}x de ${formatCurrency(totalAmount / (form.installments || 1))}` : '',
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
      setNewCustomer({ name: '', phone: '', cpf: '', email: '', address: '' });
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSale) return;
    const amount = Number(editForm.total_amount);
    if (!amount || amount <= 0) { toast.error('Informe um valor maior que zero.'); return; }
    try {
      setIsSavingEdit(true);
      const updates: any = {
        sale_type: editForm.sale_type,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_cpf: editForm.customer_cpf,
        customer_city: editForm.customer_city,
        product_name: editForm.product_name,
        product_capacity: editForm.product_capacity,
        product_color: editForm.product_color,
        product_condition: editForm.product_condition,
        product_imei: editForm.product_imei,
        product_accessories: editForm.product_accessories,
        pdf_type: editForm.pdf_type,
        total_amount: amount,
        payment_method: editForm.payment_method,
        installments: editForm.installments,
        created_at: new Date(editForm.sale_date).toISOString(),
      };
      if (editForm.sale_type === 'troca') {
        updates.incoming_name = editForm.incoming_name;
        updates.incoming_imei = editForm.incoming_imei;
        updates.incoming_capacity = editForm.incoming_capacity;
        updates.incoming_color = editForm.incoming_color;
        updates.incoming_condition = editForm.incoming_condition;
        updates.incoming_battery_health = editForm.incoming_battery_health;
        updates.incoming_purchase_price = Number(editForm.incoming_purchase_price) || 0;
      }
      await dataService.updateSale(editSale.id, updates);
      const nextRev = (editSale.revision || 0) + 1;
      await dataService.tryUpdateSaleRevision(editSale.id, nextRev);
      const baseNum = editSale.sale_number || '';
      toast.success(`Venda atualizada! PDF versão ${baseNum}.${nextRev}`);
      setEditSale(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteWithChoice = async (choice: 'restore' | 'discard') => {
    if (!deleteSale) return;
    setIsDeletingSale(true);
    try {
      const allProds = await dataService.getProducts();

      if (choice === 'restore') {
        // Restaura o aparelho que SAIU do estoque (o que a Easy Imports vendeu)
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

      // Se era troca: remove o aparelho que ENTROU do cliente (foi adicionado ao estoque na hora da troca)
      const isTradeType = deleteSale.sale_type === 'troca' || deleteSale.incoming_name?.trim();
      if (isTradeType && deleteSale.incoming_name?.trim()) {
        const incoming = allProds.find((p: any) => {
          if (deleteSale.incoming_imei && p.imei) return p.imei === deleteSale.incoming_imei && p.stock_quantity > 0;
          return p.name === deleteSale.incoming_name?.trim() && p.stock_quantity > 0;
        });
        if (incoming) {
          await dataService.deleteProduct(incoming.id);
          toast.success('Aparelho entrante removido do estoque.');
        }
      }

      await dataService.deleteSale(deleteSale.id);
      toast.success('Operação cancelada e removida.');
      setDeleteSale(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsDeletingSale(false);
    }
  };

  const handleGeneratePDF = (sale: any) => {
    const baseNum = sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`;
    const displayNum = sale.revision > 0 ? `${baseNum}.${sale.revision}` : baseNum;
    const pdfData: SalePDFData = {
      sale_number: displayNum,
      sale_type: sale.sale_type || (sale.incoming_name?.trim() ? 'troca' : 'venda'),
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
      customer_city: sale.customer_city || sale.customers?.city || '',
      product_name: sale.product_name,
      product_capacity: sale.product_capacity,
      product_color: sale.product_color,
      product_condition: sale.product_condition,
      product_imei: sale.product_imei,
      product_accessories: sale.product_accessories,
      total_amount: Number(sale.total_amount),
      payment_method: sale.payment_method,
      installments: sale.installments || 1,
      incoming_name: sale.incoming_name || undefined,
      incoming_imei: sale.incoming_imei || undefined,
      incoming_serial: sale.incoming_serial || undefined,
      incoming_email: sale.incoming_email || undefined,
      incoming_capacity: sale.incoming_capacity || undefined,
      incoming_color: sale.incoming_color || undefined,
      incoming_condition: sale.incoming_condition || undefined,
      incoming_battery_health: sale.incoming_battery_health || undefined,
      incoming_purchase_price: sale.incoming_purchase_price || undefined,
      signature_admin: adminSignature || undefined,
      signature_client: sale.signature_client || undefined,
      pdf_type: sale.pdf_type || undefined,
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
          <Button leftIcon={<Plus size={20} />} onClick={() => { setForm(emptyForm()); setShowNewCustomer(false); setNewCustomer({ name: '', phone: '', cpf: '', email: '', address: '' }); setIsModalOpen(true); }}>
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
                      const type = sale.sale_type || (sale.incoming_name?.trim() ? 'troca' : 'venda');
                      const baseNum = sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`;
                      const num = sale.revision > 0 ? `${baseNum}.${sale.revision}` : baseNum;
                      const name = sale.customer_name || sale.customers?.name || '—';
                      const saleCost = costBySale[sale.sale_number] ?? costBySale[`uuid:${sale.id?.slice(0, 8)}`] ?? null;
                      const saleProfit = type === 'troca' ? null : (saleCost !== null ? Number(sale.total_amount) - saleCost : null);

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
                              {type === 'troca' && sale.incoming_name?.trim() ? ` ⇄ ${sale.incoming_name}` : ''}
                            </p>
                          </div>

                          {/* Payment */}
                          <span className="hidden sm:block text-xs text-neutral-500 flex-shrink-0">
                            {sale.installments > 1
                              ? `${sale.installments}x ${formatCurrency(sale.total_amount / (sale.installments || 1))}`
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

                          {/* Value + Profit */}
                          <div className="flex-shrink-0 text-right">
                            <p className="font-black text-neutral-900 text-sm leading-tight">
                              {formatCurrency(Number(sale.total_amount))}
                            </p>
                            {saleProfit !== null && (
                              <p className={cn('text-[10px] font-bold leading-tight', saleProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                                {saleProfit >= 0 ? '+' : ''}{formatCurrency(saleProfit)}
                              </p>
                            )}
                          </div>

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
                              onClick={() => {
                                setEditSale(sale);
                                setEditForm({
                                  customer_name: sale.customer_name || '',
                                  customer_phone: sale.customer_phone || '',
                                  customer_cpf: sale.customer_cpf || '',
                                  customer_city: sale.customer_city || sale.customers?.city || '',
                                  product_name: sale.product_name || '',
                                  product_capacity: sale.product_capacity || '',
                                  product_color: sale.product_color || '',
                                  product_condition: sale.product_condition || 'Seminovo',
                                  product_imei: sale.product_imei || '',
                                  product_accessories: sale.product_accessories || '',
                                  sale_type: sale.sale_type || 'venda',
                                  pdf_type: sale.pdf_type || 'seminovo',
                                  total_amount: String(sale.total_amount || ''),
                                  payment_method: sale.payment_method || 'PIX',
                                  installments: sale.installments || 1,
                                  sale_date: sale.created_at
                                    ? new Date(sale.created_at).toISOString().slice(0, 16)
                                    : new Date().toISOString().slice(0, 16),
                                  incoming_name: sale.incoming_name || '',
                                  incoming_imei: sale.incoming_imei || '',
                                  incoming_capacity: sale.incoming_capacity || '',
                                  incoming_color: sale.incoming_color || '',
                                  incoming_condition: sale.incoming_condition || 'Seminovo',
                                  incoming_battery_health: sale.incoming_battery_health || '',
                                  incoming_purchase_price: sale.incoming_purchase_price ? String(sale.incoming_purchase_price) : '',
                                });
                              }}
                              className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Editar venda"
                            >
                              <Pencil size={15} />
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
                        label="CPF / CNPJ"
                        placeholder="CPF ou CNPJ"
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
                      <div className="sm:col-span-2">
                        <Input
                          label="Endereço"
                          placeholder="Rua, número, bairro, cidade — SP"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))}
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
                  <Input label="CPF / CNPJ" placeholder="CPF ou CNPJ" value={form.customer_cpf} onChange={setF('customer_cpf')} autoComplete="off" />
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
                      {p.name}{p.imei ? ` · IMEI: ${p.imei}` : ''} — {formatCurrency(p.sale_price)}
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

              {!form.selectedProduct && (
                <div className="sm:col-span-2 border-2 border-orange-200 bg-orange-50/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-orange-400 rounded-full flex-shrink-0" />
                    <p className="text-xs font-black text-orange-700 uppercase tracking-widest">Produto Sob Demanda</p>
                    <span className="text-xs text-orange-500 font-normal normal-case">— comprado e vendido direto</span>
                  </div>

                  <Input
                    label="Custo de Entrada (R$)"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="Quanto você pagou pelo produto"
                    value={form.product_cost_manual}
                    onChange={setF('product_cost_manual')}
                    autoComplete="off"
                  />

                  {/* Live profit preview */}
                  {hasCost && salePrice > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-white rounded-xl border border-orange-100 p-2.5 text-center">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Custo</p>
                        <p className="text-sm font-black text-neutral-700 mt-0.5">{formatCurrency(totalCost)}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-orange-100 p-2.5 text-center">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Venda</p>
                        <p className="text-sm font-black text-neutral-700 mt-0.5">{formatCurrency(salePrice)}</p>
                      </div>
                      <div className={cn('rounded-xl border p-2.5 text-center', vendaProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Lucro</p>
                        <p className={cn('text-sm font-black mt-0.5', vendaProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                          {formatCurrency(vendaProfit)}
                        </p>
                        <p className={cn('text-[10px] font-bold', vendaProfit >= 0 ? 'text-green-500' : 'text-red-400')}>
                          {vendaMargin}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Toggle: salvar no histórico do estoque */}
                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.save_to_stock}
                        onChange={(e) => setForm((f) => ({ ...f, save_to_stock: e.target.checked }))}
                      />
                      <div className={cn(
                        'w-10 h-6 rounded-full transition-colors',
                        form.save_to_stock ? 'bg-orange-400' : 'bg-neutral-200'
                      )} />
                      <div className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        form.save_to_stock ? 'translate-x-5' : 'translate-x-1'
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800">Salvar no histórico do estoque</p>
                      <p className="text-xs text-neutral-500">O produto aparece no Estoque como "Vendido" com custo e preço registrados</p>
                    </div>
                  </label>
                </div>
              )}

              <Input label="Capacidade" placeholder="256GB" value={form.product_capacity} onChange={setF('product_capacity')} autoComplete="off" />
              <Input label="Cor" placeholder="Azul-Sierra" value={form.product_color} onChange={setF('product_color')} autoComplete="off" />

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado de Conservação</label>
                <select
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                  value={form.product_condition}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cLower = val.toLowerCase();
                    const condIsNovo = cLower === 'novo' || cLower.startsWith('novo ') || cLower.startsWith('novo(');
                    setForm((f) => ({ ...f, product_condition: val, pdf_type: condIsNovo ? 'novo' : 'seminovo' }));
                  }}
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

          {/* ─── Tipo de Garantia no PDF ─── */}
          <div className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-primary rounded-full flex-shrink-0" />
              <p className="text-xs font-black text-neutral-800 uppercase tracking-widest">Tipo de Garantia no PDF</p>
              <span className="text-xs text-neutral-400 font-normal normal-case">— será impresso no contrato</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={cn(
                'flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                form.pdf_type === 'novo'
                  ? 'border-amber-400 bg-amber-50 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-amber-300'
              )}>
                <input type="radio" name="pdf_type" value="novo"
                  checked={form.pdf_type === 'novo'}
                  onChange={() => setForm((f) => ({ ...f, pdf_type: 'novo' }))}
                  className="hidden" />
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    form.pdf_type === 'novo' ? 'border-amber-500' : 'border-neutral-300')}>
                    {form.pdf_type === 'novo' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                  </div>
                  <span className="font-bold text-sm text-neutral-900">Aparelho Novo (Lacrado)</span>
                </div>
                <p className="text-xs text-neutral-500 pl-6.5">Garantia do Fabricante · 12 meses (Apple)</p>
                <p className="text-[10px] text-amber-600 font-semibold pl-6.5">→ PDF imprime: Garantia Oficial do Fabricante</p>
              </label>

              <label className={cn(
                'flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                form.pdf_type === 'seminovo'
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-blue-300'
              )}>
                <input type="radio" name="pdf_type" value="seminovo"
                  checked={form.pdf_type === 'seminovo'}
                  onChange={() => setForm((f) => ({ ...f, pdf_type: 'seminovo' }))}
                  className="hidden" />
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    form.pdf_type === 'seminovo' ? 'border-blue-500' : 'border-neutral-300')}>
                    {form.pdf_type === 'seminovo' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="font-bold text-sm text-neutral-900">Seminovo / Usado</span>
                </div>
                <p className="text-xs text-neutral-500 pl-6.5">Garantia Easy Imports · 90 dias (CDC art. 26)</p>
                <p className="text-[10px] text-blue-600 font-semibold pl-6.5">→ PDF imprime: Garantia Easy Imports 90 dias</p>
              </label>
            </div>

            {/* Aviso de inconsistência entre condição e tipo de garantia */}
            {(() => {
              const cLower = (form.product_condition || '').toLowerCase();
              const condIsNovo = cLower === 'novo' || cLower.startsWith('novo ') || cLower.startsWith('novo(');
              if (condIsNovo && form.pdf_type !== 'novo') return (
                <p className="mt-3 text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 font-medium">
                  ⚠️ O estado selecionado é "Novo" mas a garantia do PDF está como Seminovo — verifique se está correto!
                </p>
              );
              if (!condIsNovo && form.pdf_type === 'novo') return (
                <p className="mt-3 text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 font-medium">
                  ⚠️ O estado selecionado é Seminovo/Usado mas a garantia do PDF está como Novo — verifique se está correto!
                </p>
              );
              return (
                <p className="mt-2 text-xs text-neutral-400 font-medium">
                  {form.pdf_type === 'novo'
                    ? '✅ Aparelho Novo selecionado — PDF com Garantia do Fabricante (12 meses)'
                    : '✅ Seminovo/Usado selecionado — PDF com Garantia Easy Imports (90 dias)'}
                </p>
              );
            })()}
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
                <Input label="Número de Série" placeholder="Ex: C02XG2YJHV2Q" value={form.incoming_serial} onChange={setF('incoming_serial')} autoComplete="off" />
                <Input label="E-mail da Conta (iCloud/Google)" placeholder="Ex: joao@icloud.com" value={form.incoming_email} onChange={setF('incoming_email')} autoComplete="off" />
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
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Saúde da Bateria</label>
                  <select
                    className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                    value={form.incoming_battery_health}
                    onChange={setF('incoming_battery_health')}
                  >
                    <option value="">Não verificado</option>
                    {['100%','99%','98%','97%','96%','95%','94%','93%','92%','91%','90%','89%','88%','87%','86%','85%','84%','83%','82%','81%','80%','Abaixo de 80%'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Valor dado ao cliente (R$) *"
                  type="number"
                  step="any" inputMode="decimal"
                  placeholder="Quanto você avaliou o aparelho"
                  value={form.incoming_purchase_price}
                  onChange={setF('incoming_purchase_price')}
                  autoComplete="off"
                />
                <Input
                  label="Previsão de revenda (R$)"
                  type="number"
                  step="any" inputMode="decimal"
                  placeholder="Quanto pretende vender depois"
                  value={form.incoming_sale_price}
                  onChange={setF('incoming_sale_price')}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-purple-500">Este aparelho será adicionado automaticamente ao seu estoque.</p>

              {/* ── Painel de lucratividade da troca ── */}
              {(() => {
                const cashReceived  = Number(form.sale_price_manual) || 0;
                const tradeIn       = Number(form.incoming_purchase_price) || 0;
                const outSale       = cashReceived + tradeIn; // valor real da transação
                const outCost       = selectedProductData?.purchase_price || 0;
                const inResale      = Number(form.incoming_sale_price) || 0;

                const profitOutgoing  = outSale - outCost;
                const profitIncoming  = inResale > 0 ? inResale - tradeIn : null;
                const totalProfit     = profitOutgoing + (profitIncoming ?? 0);
                const hasNumbers      = cashReceived > 0 || outCost > 0 || tradeIn > 0;

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
                        <span className="text-neutral-500">Você recebe em caixa</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(cashReceived)}</span>
                      </div>
                      {tradeIn > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Crédito da troca</span>
                          <span className="font-bold text-neutral-900">+ {formatCurrency(tradeIn)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Valor total da operação</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(outSale)}</span>
                      </div>
                      {outCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Custo do estoque</span>
                          <span className="font-bold text-neutral-600">− {formatCurrency(outCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-neutral-100">
                        <span className="font-bold text-neutral-700">Lucro nesta venda</span>
                        <span className={cn('font-black', profitColor(profitOutgoing))}>
                          {formatCurrency(profitOutgoing)}
                          {outSale > 0 && <span className="text-xs font-normal ml-1">({((profitOutgoing / outSale) * 100).toFixed(0)}%)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Aparelho entrando */}
                    {tradeIn > 0 && inResale > 0 && (
                      <div className="space-y-1 text-sm border-t border-neutral-100 pt-3">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aparelho entrando</p>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Custo (valor dado)</span>
                          <span className="font-bold text-neutral-600">− {formatCurrency(tradeIn)}</span>
                        </div>
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
                      </div>
                    )}

                    {/* Totais */}
                    <div className="border-t-2 border-purple-200 pt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Você recebe em caixa agora</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(cashReceived)}</span>
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Condições de Pagamento</p>
              {/* Toggle pagamento dividido */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" className="sr-only"
                    checked={form.split_payment}
                    onChange={(e) => setForm((f: any) => ({ ...f, split_payment: e.target.checked, payment2_amount: '' }))}
                  />
                  <div className={cn('w-9 h-5 rounded-full transition-colors', form.split_payment ? 'bg-primary' : 'bg-neutral-200')} />
                  <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', form.split_payment ? 'translate-x-4' : 'translate-x-0.5')} />
                </div>
                <span className="text-xs font-bold text-neutral-600">Pagamento dividido</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={form.sale_type === 'troca' ? 'Você recebe em caixa (R$) *' : 'Valor de Venda (R$) *'}
                type="number"
                step="any" inputMode="decimal"
                placeholder={form.sale_type === 'troca' ? 'Ex: 3100 (só o dinheiro)' : 'Digite o valor'}
                value={form.sale_price_manual}
                onChange={setF('sale_price_manual')}
                required
              />

              {!form.split_payment ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Forma de Pagamento</label>
                    <select
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                      value={form.payment_method}
                      onChange={(e) => { const v = e.target.value; setForm((f: any) => ({ ...f, payment_method: v, installments: v === 'Cartão de Crédito' ? f.installments : 1 })); }}
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
                </>
              ) : (
                /* Pagamento dividido */
                <div className="sm:col-span-2 border-2 border-primary/20 bg-primary/5 rounded-2xl p-3 space-y-3">
                  {(() => {
                    const total = salePrice;
                    const p2 = Number(form.payment2_amount) || 0;
                    const p1 = Math.max(0, total - p2);
                    const remainder = total - p1 - p2;
                    const hasCard = form.payment_method === 'Cartão de Crédito' || form.payment2_method === 'Cartão de Crédito';
                    const cardBase = form.payment2_method === 'Cartão de Crédito' ? p2 : p1;
                    return (
                      <>
                        {/* Linha 1 */}
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-black">1</span>
                          </div>
                          <select
                            className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                            value={form.payment_method}
                            onChange={(e) => { const v = e.target.value; setForm((f: any) => ({ ...f, payment_method: v, installments: v === 'Cartão de Crédito' ? f.installments : 1 })); }}
                          >
                            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <div className="w-28 flex-shrink-0">
                            <div className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 text-sm font-bold text-neutral-600 text-right">
                              {total > 0 ? formatCurrency(p1) : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Linha 2 */}
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-neutral-600">2</span>
                          </div>
                          <select
                            className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                            value={form.payment2_method}
                            onChange={(e) => setForm((f: any) => ({ ...f, payment2_method: e.target.value }))}
                          >
                            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            placeholder="Valor"
                            value={form.payment2_amount}
                            onChange={setF('payment2_amount')}
                            className="w-28 flex-shrink-0 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary text-right"
                          />
                        </div>

                        {/* Saldo */}
                        {total > 0 && (
                          <div className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold',
                            Math.abs(remainder) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          )}>
                            <span>{Math.abs(remainder) < 0.01 ? '✓ Pagamento completo' : 'Restante a distribuir'}</span>
                            <span>{Math.abs(remainder) < 0.01 ? formatCurrency(total) : formatCurrency(Math.abs(remainder))}</span>
                          </div>
                        )}

                        {/* Parcelas se tiver cartão */}
                        {hasCard && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 flex-shrink-0">Parcelas do cartão:</span>
                            <select
                              className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                              value={form.installments}
                              onChange={(e) => setForm((f: any) => ({ ...f, installments: Number(e.target.value) }))}
                            >
                              {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => {
                                const label = n === 1 ? '1x (à vista)' : `${n}x de ${cardBase > 0 ? formatCurrency(cardBase / n) : '—'}`;
                                return <option key={n} value={n}>{label}</option>;
                              })}
                            </select>
                          </div>
                        )}
                      </>
                    );
                  })()}
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

            {/* Preview total + Lucro */}
            {salePrice > 0 && form.sale_type !== 'troca' && (
              <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-700">Total da operação</span>
                  <span className="text-2xl font-black text-primary-900">{formatCurrency(salePrice)}</span>
                </div>
                {hasCost && (
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>Custo do produto</span>
                    <span className="font-semibold">− {formatCurrency(totalCost)}</span>
                  </div>
                )}
                <div className={cn('flex items-center justify-between pt-2 border-t', 'border-primary/20')}>
                  <span className="font-bold text-neutral-800">Lucro estimado</span>
                  <div className="text-right">
                    {hasCost ? (
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xl font-black', vendaProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(vendaProfit)}
                        </span>
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', vendaProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                          {vendaMargin}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400 font-medium">— custo não cadastrado</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview troca — mostra breakdown */}
            {form.sale_type === 'troca' && salePrice > 0 && (
              <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span>Você recebe em caixa</span>
                  <span className="font-bold">{formatCurrency(salePrice)}</span>
                </div>
                {Number(form.incoming_purchase_price) > 0 && (
                  <div className="flex items-center justify-between text-sm text-purple-700">
                    <span>Aparelho da troca</span>
                    <span className="font-bold">+ {formatCurrency(Number(form.incoming_purchase_price))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                  <span className="font-bold text-neutral-700">Valor total recebido</span>
                  <span className="text-2xl font-black text-primary-900">
                    {formatCurrency(salePrice + Number(form.incoming_purchase_price || 0))}
                  </span>
                </div>
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
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-base transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2z"/>
                    </svg>
                    Enviar link ao cliente
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

      {/* ─── EDITAR VENDA MODAL ─── */}
      <Modal isOpen={!!editSale} onClose={() => !isSavingEdit && setEditSale(null)} title={`Editar — ${editSale?.sale_number || ''}`} maxWidth="2xl">
        {editSale && (
          <form onSubmit={handleSaveEdit} className="space-y-6">

            {/* Tipo da operação — editável para corrigir vendas antigas */}
            <div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Tipo da Operação</p>
              <div className="grid grid-cols-2 gap-3">
                {SALE_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={cn(
                      'flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all',
                      editForm.sale_type === t.value
                        ? 'border-primary bg-primary/10'
                        : 'border-neutral-200 hover:border-neutral-300'
                    )}
                  >
                    <input type="radio" name="edit_sale_type" value={t.value}
                      checked={editForm.sale_type === t.value}
                      onChange={() => setEditForm((f: any) => ({ ...f, sale_type: t.value }))}
                      className="hidden" />
                    <span className="font-bold text-sm text-neutral-900">{t.label}</span>
                    <span className="text-xs text-neutral-500">{t.desc}</span>
                  </label>
                ))}
              </div>
              {editForm.sale_type !== (editSale.sale_type || 'venda') && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 font-medium">
                  ⚠️ Tipo alterado — o PDF gerado após salvar refletirá o novo tipo de documento.
                </p>
              )}
              <p className="mt-1 text-xs font-mono text-neutral-400">{editSale.sale_number}</p>
            </div>

            {/* Comprador */}
            <div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Dados do Comprador</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input label="Nome do Cliente *" value={editForm.customer_name} onChange={setEF('customer_name')} autoComplete="off" required />
                </div>
                <Input label="Telefone / WhatsApp" type="tel" placeholder="(11) 99999-9999" value={editForm.customer_phone} onChange={setEF('customer_phone')} autoComplete="off" />
                <Input label="CPF / CNPJ" placeholder="CPF ou CNPJ" value={editForm.customer_cpf} onChange={setEF('customer_cpf')} autoComplete="off" />
                <div className="sm:col-span-2">
                  <Input label="Endereço / Cidade" placeholder="Rua, número, bairro, cidade — SP" value={editForm.customer_city} onChange={setEF('customer_city')} autoComplete="off" />
                </div>
              </div>
            </div>

            {/* Produto */}
            <div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">
                {editForm.sale_type === 'troca' ? 'Aparelho Saindo (do estoque)' : 'Dados do Produto'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input label="Modelo *" placeholder="Ex: iPhone 13 Pro Max" value={editForm.product_name} onChange={setEF('product_name')} autoComplete="off" required />
                </div>
                <Input label="Capacidade" placeholder="256GB" value={editForm.product_capacity} onChange={setEF('product_capacity')} autoComplete="off" />
                <Input label="Cor" placeholder="Azul-Sierra" value={editForm.product_color} onChange={setEF('product_color')} autoComplete="off" />
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado de Conservação</label>
                  <select
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    value={editForm.product_condition}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cLower = val.toLowerCase();
                      const condIsNovo = cLower === 'novo' || cLower.startsWith('novo ') || cLower.startsWith('novo(');
                      setEditForm((f: any) => ({ ...f, product_condition: val, pdf_type: condIsNovo ? 'novo' : 'seminovo' }));
                    }}
                  >
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Input label="IMEI" placeholder="352XXXXXXXXXXXX" value={editForm.product_imei} onChange={setEF('product_imei')} autoComplete="off" />
                <div className="sm:col-span-2">
                  <Input label="Acessórios Inclusos" placeholder="Cabo, carregador, caixa original..." value={editForm.product_accessories} onChange={setEF('product_accessories')} autoComplete="off" />
                </div>
              </div>
            </div>

            {/* Garantia no PDF */}
            <div className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-primary rounded-full flex-shrink-0" />
                <p className="text-xs font-black text-neutral-800 uppercase tracking-widest">Tipo de Garantia no PDF</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={cn(
                  'flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                  editForm.pdf_type === 'novo' ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-amber-300'
                )}>
                  <input type="radio" name="edit_pdf_type" value="novo" checked={editForm.pdf_type === 'novo'}
                    onChange={() => setEditForm((f: any) => ({ ...f, pdf_type: 'novo' }))} className="hidden" />
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      editForm.pdf_type === 'novo' ? 'border-amber-500' : 'border-neutral-300')}>
                      {editForm.pdf_type === 'novo' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    </div>
                    <span className="font-bold text-sm text-neutral-900">Aparelho Novo (Lacrado)</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-6.5">Garantia do Fabricante · 12 meses</p>
                </label>
                <label className={cn(
                  'flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                  editForm.pdf_type === 'seminovo' ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-blue-300'
                )}>
                  <input type="radio" name="edit_pdf_type" value="seminovo" checked={editForm.pdf_type === 'seminovo'}
                    onChange={() => setEditForm((f: any) => ({ ...f, pdf_type: 'seminovo' }))} className="hidden" />
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      editForm.pdf_type === 'seminovo' ? 'border-blue-500' : 'border-neutral-300')}>
                      {editForm.pdf_type === 'seminovo' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <span className="font-bold text-sm text-neutral-900">Seminovo / Usado</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-6.5">Garantia Easy Imports · 90 dias (CDC art. 26)</p>
                </label>
              </div>
            </div>

            {/* Aparelho Entrante (apenas troca) */}
            {editForm.sale_type === 'troca' && (
              <div className="border border-purple-200 bg-purple-50/50 rounded-2xl p-4 space-y-4">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Aparelho Entrando (do cliente)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input label="Modelo do aparelho" placeholder="Ex: Samsung Galaxy S22" value={editForm.incoming_name} onChange={setEF('incoming_name')} autoComplete="off" />
                  </div>
                  <Input label="IMEI" placeholder="352XXXXXXXXXXXX" value={editForm.incoming_imei} onChange={setEF('incoming_imei')} autoComplete="off" />
                  <Input label="Capacidade" placeholder="128GB" value={editForm.incoming_capacity} onChange={setEF('incoming_capacity')} autoComplete="off" />
                  <Input label="Cor" placeholder="Preto" value={editForm.incoming_color} onChange={setEF('incoming_color')} autoComplete="off" />
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado</label>
                    <select className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400/30"
                      value={editForm.incoming_condition} onChange={setEF('incoming_condition')}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Saúde da Bateria</label>
                    <select className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400/30"
                      value={editForm.incoming_battery_health} onChange={setEF('incoming_battery_health')}>
                      <option value="">Não verificado</option>
                      {['100%','99%','98%','97%','96%','95%','94%','93%','92%','91%','90%','89%','88%','87%','86%','85%','84%','83%','82%','81%','80%','Abaixo de 80%'].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Valor dado ao cliente (R$)" type="number" step="any" inputMode="decimal"
                    value={editForm.incoming_purchase_price} onChange={setEF('incoming_purchase_price')} autoComplete="off" />
                </div>
              </div>
            )}

            {/* Pagamento */}
            <div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Condições de Pagamento</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Valor Total (R$) *"
                  type="number" step="any" inputMode="decimal" required
                  value={editForm.total_amount}
                  onChange={setEF('total_amount')}
                />
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Forma de Pagamento</label>
                  <select
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    value={editForm.payment_method}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditForm((f: any) => ({ ...f, payment_method: v, installments: v === 'Cartão de Crédito' ? f.installments : 1 }));
                    }}
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {editForm.payment_method === 'Cartão de Crédito' && (
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Parcelas</label>
                    <select
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                      value={editForm.installments}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, installments: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => {
                        const amt = Number(editForm.total_amount);
                        const label = n === 1 ? '1x (à vista)' : `${n}x de ${amt > 0 ? formatCurrency(amt / n) : '—'}`;
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
                    value={editForm.sale_date}
                    onChange={setEF('sale_date')}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setEditSale(null)} type="button" disabled={isSavingEdit}>
                Cancelar
              </Button>
              <Button fullWidth loading={isSavingEdit} type="submit" leftIcon={<CheckCircle2 size={18} />}>
                Salvar Alterações
              </Button>
            </div>
          </form>
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

            {/* Custo + Lucro / Resumo da Troca */}
            {(() => {
              const dtype = detailSale.sale_type || (detailSale.incoming_name?.trim() ? 'troca' : 'venda');
              const dcost = costBySale[detailSale.sale_number] ?? costBySale[`uuid:${detailSale.id?.slice(0, 8)}`] ?? null;

              if (dtype === 'troca') {
                const cashReceived = Number(detailSale.total_amount);
                const incomingValue = Number(detailSale.incoming_purchase_price || 0);
                const resultado = dcost !== null ? cashReceived + incomingValue - dcost : null;
                return (
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                    <div className="bg-neutral-900 text-white px-4 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wider">Resumo da Troca</p>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Aparelho que saiu</p>
                          <p className="text-sm font-semibold text-neutral-900">{detailSale.product_name}</p>
                        </div>
                        {dcost !== null && (
                          <span className="text-sm font-black text-red-600">− {formatCurrency(dcost)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Cliente pagou</p>
                          <p className="text-sm font-semibold text-neutral-900">{detailSale.payment_method || 'Dinheiro'}</p>
                        </div>
                        <span className="text-sm font-black text-green-600">+ {formatCurrency(cashReceived)}</span>
                      </div>
                      {detailSale.incoming_name?.trim() && (
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Aparelho recebido</p>
                            <p className="text-sm font-semibold text-neutral-900">{detailSale.incoming_name}</p>
                          </div>
                          {incomingValue > 0 && (
                            <span className="text-sm font-black text-green-600">+ {formatCurrency(incomingValue)}</span>
                          )}
                        </div>
                      )}
                      {resultado !== null && (
                        <div className={cn('flex items-center justify-between px-4 py-3', resultado >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                          <p className={cn('text-xs font-black uppercase tracking-wide', resultado >= 0 ? 'text-green-700' : 'text-red-700')}>
                            {resultado >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                          </p>
                          <span className={cn('text-base font-black', resultado >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Venda / Compra
              const dprofit = dcost !== null ? Number(detailSale.total_amount) - dcost : null;
              const dmargin = dprofit !== null && Number(detailSale.total_amount) > 0
                ? Math.round((dprofit / Number(detailSale.total_amount)) * 100)
                : null;
              if (dcost === null) return null;
              return (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Venda</p>
                    <p className="text-sm font-black text-neutral-900 mt-0.5">{formatCurrency(Number(detailSale.total_amount))}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-wide">Custo</p>
                    <p className="text-sm font-black text-red-600 mt-0.5">{formatCurrency(dcost)}</p>
                  </div>
                  {dprofit !== null && (
                    <div className={cn('border rounded-xl p-3 text-center', dprofit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
                      <p className={cn('text-[10px] font-black uppercase tracking-wide', dprofit >= 0 ? 'text-green-500' : 'text-red-400')}>Lucro</p>
                      <p className={cn('text-sm font-black mt-0.5', dprofit >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(dprofit)}</p>
                      {dmargin !== null && (
                        <p className={cn('text-[10px] font-bold', dprofit >= 0 ? 'text-green-500' : 'text-red-400')}>{dmargin}%</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Número', detailSale.sale_number],
                ['Pagamento', detailSale.installments > 1
                  ? `Cartão de Crédito — ${detailSale.installments}x de ${formatCurrency(detailSale.total_amount / (detailSale.installments || 1))}`
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
