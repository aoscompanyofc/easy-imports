import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart, Plus, Search, Package, CheckCircle2,
  Trash2, X, FileText, ChevronDown, ChevronRight, Download,
  RefreshCw, Eye, Link2, MessageCircle, Copy, UserPlus, RotateCcw, Pencil,
  Calendar, Clock, AlertCircle,
} from 'lucide-react';
import { DeviceForm, emptyDeviceForm, deviceFormToProductName, type DeviceFormData } from '../components/ui/DeviceForm';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { generatePDF, type CompanyInfo, type SalePDFData } from '../lib/pdfGenerator';
import { isConnected as gcIsConnected, createCalendarEvent } from '../lib/googleCalendar';
import { sendWppNotification, buildSaleNotificationText } from '../lib/whatsappNotify';
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
  { value: 'prazo', label: 'Venda a Prazo', desc: 'Cliente paga em parcelas mensais via PIX' },
];

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Boleto'];

const CONDITIONS = ['Novo', 'Seminovo', 'Usado — Bom Estado', 'Usado — Com Marcas', 'Para Retirada de Peças'];

// Extended DeviceFormData for trade-in (adds serial + account email for PDF/stock)
interface TradeInDevice extends DeviceFormData {
  serial: string;
  account_email: string;
}

const emptyTradeInDevice = (): TradeInDevice => ({
  ...emptyDeviceForm(),
  serial: '',
  account_email: '',
});

interface AdditionalOutgoingItem {
  id: string;
  selectedProduct: string;
  name_override: string;
  imei_override: string;
  capacity_override: string;
  color_override: string;
  condition_override: string;
  price_override: string;
  cost_override: string;
}

const emptyAdditionalItem = (): AdditionalOutgoingItem => ({
  id: crypto.randomUUID(),
  selectedProduct: '',
  name_override: '',
  imei_override: '',
  capacity_override: '',
  color_override: '',
  condition_override: 'Seminovo',
  price_override: '',
  cost_override: '',
});

const TYPE_COLORS: Record<string, string> = {
  compra: 'bg-neutral-100 text-neutral-600',
  venda: 'bg-neutral-900 text-white',
  troca: 'bg-primary text-neutral-900',
  prazo: 'bg-neutral-200 text-neutral-800',
};

const TYPE_LABELS: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  troca: 'Troca',
  prazo: 'A Prazo',
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
ALTER TABLE sales ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS rep_seller_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS rep_seller_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installments_json TEXT;`;

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
  const prefix = type === 'troca' ? 'T' : type === 'prazo' ? 'P' : 'V';
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
  card_fee_amount: '',
  card_fee_pct: '',
  card_received_amount: '',
  // Vendedor responsável pela venda
  rep_id: '',
  // Venda a Prazo
  prazo_count: '12',
  prazo_value: '',
  prazo_first_due: '',
  prazo_has_entrada: false,
  prazo_entrada_value: '',
  prazo_entrada_due: '',
});

export const Vendas: React.FC = () => {
  const { signature: adminSignature } = useProfileStore();
  const [sales, setSales] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [incomingDevices, setIncomingDevices] = useState<TradeInDevice[]>([emptyTradeInDevice()]);
  const [additionalItems, setAdditionalItems] = useState<AdditionalOutgoingItem[]>([]);
  const [editAdditionalItems, setEditAdditionalItems] = useState<AdditionalOutgoingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const [deleteSale, setDeleteSale] = useState<any | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  // Edit mode: reuses the create modal pre-populated with existing sale data
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [editSaleNumber, setEditSaleNumber] = useState('');
  const [editSaleRevision, setEditSaleRevision] = useState(0);
  // Legacy — kept only for TypeScript references still in file; no longer used
  const [editSale, setEditSale] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editIncomingDevices, setEditIncomingDevices] = useState<TradeInDevice[]>([emptyTradeInDevice()]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [expandedPrazoSale, setExpandedPrazoSale] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const setEF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm((f: any) => ({ ...f, [field]: e.target.value }));

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
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
      dataService.getSellers().then((s) => setSellers(s || [])).catch(() => {});

      // Default: open current month
      const thisMonth = format(new Date(), 'yyyy-MM');
      setOpenMonths(new Set([thisMonth]));

      // Auto-fix 1: vendas sem sale_type com aparelho entrante → troca (só onde sale_type está vazio)
      const toFix = (salesData || []).filter(
        (s: any) => s.incoming_name?.trim() && !s.sale_type
      );
      // Auto-fix 2: vendas classificadas erroneamente como 'troca' mas que têm installments_json → são 'prazo'
      const prazoMisclassified = (salesData || []).filter(
        (s: any) => s.sale_type === 'troca' && s.installments_json
      );
      if (toFix.length > 0 || prazoMisclassified.length > 0) {
        await Promise.all([
          ...toFix.map((s: any) =>
            dataService.updateSale(s.id, { sale_type: 'troca' }).catch(() => {})
          ),
          ...prazoMisclassified.map((s: any) =>
            dataService.updateSale(s.id, { sale_type: 'prazo' }).catch(() => {})
          ),
        ]);
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
  const cardFee   = Number(form.card_fee_amount) || 0;

  // Lucro estimado para venda simples (sempre calculado, exibido no preview de pagamento)
  const unitCost = selectedProductData?.purchase_price || Number(form.product_cost_manual) || 0;
  const totalCost = unitCost * (form.quantity || 1);
  const vendaProfit = salePrice - totalCost - cardFee;
  const vendaMargin = salePrice > 0 ? Math.round((vendaProfit / salePrice) * 100) : 0;
  const hasCost = unitCost > 0;

  // Totals for additional items (computed reactively for use in UI)
  const additionalItemsTotal = useMemo(() => {
    return additionalItems.filter(i => i.selectedProduct).reduce((sum, item) => {
      const prod = products.find((p: any) => p.id === item.selectedProduct);
      const price = Number(item.price_override) || (prod?.sale_price ?? 0);
      return sum + price;
    }, 0);
  }, [additionalItems, products]);

  const additionalItemsCost = useMemo(() => {
    return additionalItems.filter(i => i.selectedProduct).reduce((sum, item) => {
      const prod = products.find((p: any) => p.id === item.selectedProduct);
      return sum + (prod?.purchase_price ?? 0);
    }, 0);
  }, [additionalItems, products]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nunca processar se não estiver no passo final do wizard
    if (wizardStep < 4) return;

    if (!form.selectedCustomer && !form.product_name_manual && !form.selectedProduct) {
      toast.error('Selecione um cliente e um produto.');
      return;
    }

    const product = form.selectedProduct ? selectedProductData : null;
    const productName = product?.name || form.product_name_manual;
    const isPrazo = form.sale_type === 'prazo';
    const prazoCount = isPrazo ? Math.max(1, Number(form.prazo_count) || 1) : 0;

    // Para prazo: preço do produto vem de sale_price_manual (auto-preenchido do estoque ou manual)
    const prazoProductPrice = isPrazo
      ? (Number(form.sale_price_manual) || (product?.sale_price > 0 ? product.sale_price : 0)) + additionalItemsTotal
      : 0;
    // Aparelhos dados pelo cliente na troca (crédito abatido do prazo)
    const prazoTradeInTotal = isPrazo
      ? incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0)
      : 0;
    // Entrada (down payment)
    const prazoHasEntrada = isPrazo && !!form.prazo_has_entrada;
    const prazoEntrada = prazoHasEntrada ? Math.max(0, Number(form.prazo_entrada_value) || 0) : 0;
    const prazoEntradaDue = prazoHasEntrada ? form.prazo_entrada_due : '';
    // Base para parcelamento = produto − troca − entrada
    const prazoFinancing = Math.max(0, prazoProductPrice - prazoTradeInTotal - prazoEntrada);
    // Valor por parcela: manual tem prioridade; senão auto-calcula pelo financiamento
    const prazoValue = isPrazo
      ? (Number(form.prazo_value) > 0 ? Number(form.prazo_value) : (prazoCount > 0 ? prazoFinancing / prazoCount : 0))
      : 0;

    const unitPrice = isPrazo
      ? prazoProductPrice
      : (Number(form.sale_price_manual) || (product && product.sale_price > 0 ? product.sale_price : 0));
    // Trade-in para troca regular
    const tradeInValue = form.sale_type === 'troca'
      ? incomingDevices.reduce((sum, d) => sum + Number(d.purchase_price || 0), 0)
      : 0;
    // Total: prazo = entrada + parcelas + troca; outros = preço × qtd + troca + itens adicionais
    const totalAmount = isPrazo
      ? prazoEntrada + prazoCount * prazoValue + prazoTradeInTotal
      : (unitPrice * form.quantity + tradeInValue + additionalItemsTotal);

    if (isPrazo) {
      if (prazoHasEntrada && prazoEntrada <= 0) { toast.error('Informe o valor da entrada.'); return; }
      if (prazoHasEntrada && !prazoEntradaDue) { toast.error('Informe a data de vencimento da entrada.'); return; }
      if (prazoValue <= 0) { toast.error('Informe o valor da parcela ou o valor do produto.'); return; }
      if (!form.prazo_first_due) { toast.error('Informe a data do 1º vencimento.'); return; }
    } else {
      if (unitPrice <= 0) { toast.error('Informe o valor da venda (campo Valor R$).'); return; }
    }

    // Build installments JSON for prazo sales
    let installmentsJson: string | null = null;
    if (isPrazo) {
      const items: any[] = [];
      if (prazoHasEntrada && prazoEntrada > 0 && prazoEntradaDue) {
        items.push({ n: 0, due: prazoEntradaDue, amount: prazoEntrada, paid_at: null, is_entrada: true });
      }
      const [fy, fm, fd] = form.prazo_first_due.split('-').map(Number);
      Array.from({ length: prazoCount }, (_, i) => {
        const d = new Date(fy, fm - 1 + i, fd);
        const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        items.push({ n: i + 1, due, amount: prazoValue, paid_at: null });
      });
      installmentsJson = JSON.stringify(items);
    }

    // Build outgoing items JSON (primary + additional) for PDF and edit restoration
    const buildOutgoingItemsJson = () => {
      const primaryProd = form.selectedProduct ? products.find((p: any) => p.id === form.selectedProduct) : null;
      const primaryItem = {
        product_id: form.selectedProduct || '',
        name: primaryProd?.name || form.product_name_manual || '',
        imei: form.product_imei || primaryProd?.imei || '',
        capacity: form.product_capacity || primaryProd?.product_capacity || '',
        color: form.product_color || primaryProd?.product_color || '',
        condition: form.product_condition || '',
        price: isPrazo ? prazoProductPrice : unitPrice,
        cost: primaryProd?.purchase_price || Number(form.product_cost_manual) || 0,
      };
      const additionalMapped = additionalItems.filter(i => i.selectedProduct).map(i => {
        const prod = products.find((p: any) => p.id === i.selectedProduct);
        return {
          product_id: i.selectedProduct,
          name: i.name_override || prod?.name || '',
          imei: i.imei_override || prod?.imei || '',
          capacity: i.capacity_override || prod?.product_capacity || '',
          color: i.color_override || prod?.product_color || '',
          condition: (prod?.product_condition || i.condition_override || 'Seminovo').replace(/ · Bateria:.*/, ''),
          price: Number(i.price_override) || prod?.sale_price || 0,
          cost: prod?.purchase_price || 0,
        };
      });
      return JSON.stringify([primaryItem, ...additionalMapped]);
    };
    const outgoingItemsJson = buildOutgoingItemsJson();

    // Monta forma de pagamento combinada se split ativo
    let resolvedPaymentMethod = isPrazo
      ? (() => {
          const parts: string[] = [];
          if (prazoTradeInTotal > 0) parts.push(`Troca ${formatCurrency(prazoTradeInTotal)}`);
          if (prazoHasEntrada && prazoEntrada > 0) parts.push(`Entrada ${formatCurrency(prazoEntrada)}`);
          parts.push(`${prazoCount}x de ${formatCurrency(prazoValue)} a prazo`);
          return parts.join(' + ');
        })()
      : form.payment_method;
    if (!isPrazo && form.split_payment && Number(form.payment2_amount) > 0) {
      const p2 = Number(form.payment2_amount);
      const p1 = Math.max(0, unitPrice * form.quantity - p2);
      const cardMethod = form.payment2_method === 'Cartão de Crédito' ? form.payment2_method : form.payment_method === 'Cartão de Crédito' ? form.payment_method : null;
      const instStr = cardMethod && form.installments > 1 ? ` ${form.installments}x` : '';
      resolvedPaymentMethod = `${form.payment_method} (${formatCurrency(p1)}) + ${form.payment2_method}${instStr} (${formatCurrency(p2)})`;
    }

    const saleNumber = generateSaleNumber(sales.length, form.sale_type);
    // Open PDF window synchronously (before any await) to avoid popup blocker
    const printWin = !isEditMode ? window.open('', '_blank', 'width=920,height=1060') : null;

    try {
      setIsSaving(true);

      // ─── EDIT MODE: only update the sale record, no stock/transaction changes ───
      if (isEditMode && editSaleId) {
        let customerId = form.selectedCustomer || null;
        let customerName = selectedCustomerData?.name || form.seller_name || 'Avulso';
        let customerPhone = form.customer_phone || selectedCustomerData?.phone;

        if (showNewCustomer && newCustomer.name.trim()) {
          const created = await dataService.addCustomer({
            name: newCustomer.name.trim(), phone: newCustomer.phone.trim(),
            email: newCustomer.email.trim(), cpf: newCustomer.cpf.trim(), city: newCustomer.address.trim(),
          });
          customerId = created.id; customerName = created.name;
          customerPhone = created.phone || customerPhone;
          setCustomers((prev) => [created, ...prev]);
        }

        const resolvedCpf  = newCustomer.cpf.trim()     || form.customer_cpf  || selectedCustomerData?.cpf  || '';
        const resolvedCity = newCustomer.address.trim()  || form.customer_city || selectedCustomerData?.city || '';
        const primaryDevice = incomingDevices[0] || emptyTradeInDevice();

        // Preserve paid_at values from existing installments
        let editInstJson = installmentsJson;
        if (isPrazo && installmentsJson) {
          const origSale = sales.find((s: any) => s.id === editSaleId);
          const prevInsts: any[] = (() => { try { return JSON.parse(origSale?.installments_json || '[]'); } catch { return []; } })();
          if (prevInsts.length > 0) {
            const newInsts = JSON.parse(installmentsJson) as any[];
            // Match by is_entrada flag and n value to preserve paid_at correctly
            editInstJson = JSON.stringify(newInsts.map((inst) => {
              const prev = inst.is_entrada
                ? prevInsts.find((p: any) => p.is_entrada)
                : prevInsts.find((p: any) => !p.is_entrada && p.n === inst.n);
              return { ...inst, paid_at: prev?.paid_at || null };
            }));
          }
        }

        await dataService.updateSale(editSaleId, {
          sale_type: form.sale_type,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_cpf: resolvedCpf,
          customer_city: resolvedCity,
          product_name: productName,
          product_capacity: form.product_capacity,
          product_color: form.product_color,
          product_condition: form.product_condition,
          product_imei: form.product_imei || selectedProductData?.imei || '',
          product_accessories: form.product_accessories,
          pdf_type: form.pdf_type || (form.product_condition?.toLowerCase().startsWith('novo') ? 'novo' : 'seminovo'),
          total_amount: totalAmount,
          payment_method: resolvedPaymentMethod,
          installments: isPrazo ? prazoCount : (form.split_payment ? 1 : form.installments),
          created_at: new Date(form.sale_date).toISOString(),
          incoming_name: deviceFormToProductName(primaryDevice) || primaryDevice.model || '',
          incoming_imei: primaryDevice.imei || '',
          incoming_serial: primaryDevice.serial || '',
          incoming_email: primaryDevice.account_email || '',
          incoming_capacity: primaryDevice.capacity || '',
          incoming_color: primaryDevice.color || '',
          incoming_condition: primaryDevice.condition || '',
          incoming_battery_health: primaryDevice.battery_health || '',
          incoming_purchase_price: Number(primaryDevice.purchase_price) || 0,
          installments_json: editInstJson,
          outgoing_items_json: outgoingItemsJson,
        });
        await dataService.tryUpdateSaleRevision(editSaleId, editSaleRevision + 1);
        toast.success(`Venda atualizada! PDF versão ${editSaleNumber}.${editSaleRevision + 1}`);
        setIsModalOpen(false); setIsEditMode(false); setEditSaleId(null);
        setAdditionalItems([]);
        setForm(emptyForm()); setIncomingDevices([emptyTradeInDevice()]);
        setShowNewCustomer(false); setNewCustomer({ name: '', phone: '', cpf: '', email: '', address: '' });
        fetchData();
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────

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
        if (created.__migration_needed) {
          localStorage.setItem('needs_customer_migration', '1');
        }
      }

      // Resolve customer fields — new customer form takes priority over existing customer data
      const resolvedCpf = newCustomer.cpf.trim() || form.customer_cpf || selectedCustomerData?.cpf || '';
      const resolvedCity = newCustomer.address.trim() || form.customer_city || selectedCustomerData?.city || '';

      const primaryDevice = incomingDevices[0] || emptyTradeInDevice();
      const repSeller = sellers.find((s) => s.id === form.rep_id);
      const savedSale = await dataService.addSale(
        {
          customer_id: customerId,
          customer_name: customerName,
          product_name: productName,
          total_amount: totalAmount,
          payment_method: resolvedPaymentMethod,
          installments: isPrazo ? prazoCount : (form.split_payment ? 1 : form.installments),
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
          incoming_name: deviceFormToProductName(primaryDevice) || primaryDevice.model || '',
          incoming_imei: primaryDevice.imei || '',
          incoming_serial: primaryDevice.serial || '',
          incoming_email: primaryDevice.account_email || '',
          incoming_capacity: primaryDevice.capacity || '',
          incoming_color: primaryDevice.color || '',
          incoming_condition: primaryDevice.condition || '',
          incoming_battery_health: primaryDevice.battery_health || '',
          incoming_purchase_price: Number(primaryDevice.purchase_price) || 0,
          pdf_type: form.pdf_type || (form.product_condition?.toLowerCase().startsWith('novo') ? 'novo' : 'seminovo'),
          rep_seller_id: repSeller?.id || null,
          rep_seller_name: repSeller?.name || '',
          incoming_devices_json: incomingDevices.filter((d) => d.model.trim()).length > 0
            ? JSON.stringify(incomingDevices.filter((d) => d.model.trim()))
            : null,
          installments_json: installmentsJson,
          outgoing_items_json: outgoingItemsJson,
        },
        // Prazo: itens passados como [] — estoque/custo tratados manualmente abaixo
        isPrazo ? [] : (product
          ? [
              { product_id: form.selectedProduct, quantity: form.quantity, unit_price: unitPrice, fee_deduction: cardFee },
              ...additionalItems.filter(i => i.selectedProduct).map(i => {
                const prod = products.find((p: any) => p.id === i.selectedProduct);
                return {
                  product_id: i.selectedProduct,
                  quantity: 1,
                  unit_price: Number(i.price_override) || (prod?.sale_price ?? 0),
                  fee_deduction: 0,
                };
              }),
            ]
          : [])
      );

      // For troca/prazo: add ALL incoming devices to stock
      if (form.sale_type === 'troca' || (isPrazo && incomingDevices.some(d => d.model.trim()))) {
        for (const device of incomingDevices) {
          const deviceName = deviceFormToProductName(device) || device.model;
          if (!deviceName.trim()) continue;
          const batteryNote = device.battery_health ? ` · Bateria: ${device.battery_health}` : '';
          await dataService.addProduct({
            name: deviceName.trim(),
            category: device.category || 'iPhone',
            purchase_price: Number(device.purchase_price) || 0,
            sale_price: Number(device.sale_price) || 0,
            stock_quantity: 1,
            status: 'available',
            imei: device.imei || '',
            product_capacity: device.capacity !== '—' ? device.capacity : '',
            product_color: device.color || '',
            product_condition: (device.condition || 'Seminovo — Excelente') + batteryNote,
            product_warranty: device.warranty || 'Sem garantia',
            product_origin: device.origin || '',
            entry_date: device.entry_date || new Date(form.sale_date).toISOString().split('T')[0],
          });
          if (Number(device.purchase_price) > 0) {
            await dataService.addTransaction({
              description: `Aparelho Recebido ${saleNumber} — ${deviceName.trim()}`,
              amount: Number(device.purchase_price),
              type: 'income',
              category: 'trade',
              date: new Date(form.sale_date).toISOString().slice(0, 10),
            });
          }
        }
      }

      // Venda a Prazo: decrementa estoque (custo é registrado proporcionalmente ao pagar cada parcela)
      if (isPrazo) {
        if (product) {
          const newQty = Math.max(0, product.stock_quantity - form.quantity);
          await dataService.updateProduct(product.id, {
            name: product.name, category: product.category,
            purchase_price: product.purchase_price, sale_price: product.sale_price,
            stock_quantity: newQty, status: newQty <= 0 ? 'out_of_stock' : 'available',
            imei: product.imei || '',
          });
        } else {
          const manualCost = Number(form.product_cost_manual);
          if (form.save_to_stock && productName) {
            await dataService.addProduct({
              name: productName, category: 'Smartphones',
              purchase_price: manualCost || 0, sale_price: prazoValue,
              stock_quantity: 0, status: 'out_of_stock',
              imei: form.product_imei || '', product_capacity: form.product_capacity || '',
              product_color: form.product_color || '', product_condition: form.product_condition || 'Seminovo',
              entry_date: new Date(form.sale_date).toISOString().split('T')[0],
            });
          }
        }
        // Handle additional items for prazo: only decrement stock (no cost transaction yet)
        for (const addItem of additionalItems.filter(i => i.selectedProduct)) {
          const addProd = products.find((p: any) => p.id === addItem.selectedProduct);
          if (addProd) {
            const newQty = Math.max(0, addProd.stock_quantity - 1);
            await dataService.updateProduct(addProd.id, {
              name: addProd.name, category: addProd.category,
              purchase_price: addProd.purchase_price, sale_price: addProd.sale_price,
              stock_quantity: newQty, status: newQty <= 0 ? 'out_of_stock' : 'available',
              imei: addProd.imei || '',
            });
          }
        }
      }

      // Para produtos sem estoque (não-prazo): cria transações financeiras manualmente
      if (!product && !isPrazo) {
        await dataService.addTransaction({
          description: `Receita ${saleNumber} — ${productName || 'Produto'}`,
          amount: Math.max(0, unitPrice * form.quantity - cardFee),
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
            category: 'Smartphones',
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

        // Additional stock items for manual (non-stock) primary sales
        for (const addItem of additionalItems.filter(i => i.selectedProduct)) {
          const addProd = products.find((p: any) => p.id === addItem.selectedProduct);
          if (addProd) {
            const addPrice = Number(addItem.price_override) || addProd.sale_price || 0;
            const newQty = Math.max(0, addProd.stock_quantity - 1);
            await dataService.updateProduct(addProd.id, {
              name: addProd.name, category: addProd.category,
              purchase_price: addProd.purchase_price, sale_price: addProd.sale_price,
              stock_quantity: newQty, status: newQty <= 0 ? 'out_of_stock' : 'available',
              imei: addProd.imei || '',
            });
            if (addPrice > 0) {
              await dataService.addTransaction({
                description: `Receita ${saleNumber} — ${addProd.name}`,
                amount: addPrice,
                type: 'income', category: 'sale',
                date: new Date(form.sale_date).toISOString().slice(0, 10),
              });
            }
            if (addProd.purchase_price > 0) {
              await dataService.addTransaction({
                description: `Custo ${saleNumber} — ${addProd.name}`,
                amount: addProd.purchase_price,
                type: 'expense', category: 'stock',
                date: new Date(form.sale_date).toISOString().slice(0, 10),
              });
            }
          }
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
        customer_phone: customerPhone || form.whatsapp_number || '',
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
        // Aparelho entrante (troca) — PDF mostra o primeiro aparelho
        incoming_name: (deviceFormToProductName(primaryDevice) || primaryDevice.model) || undefined,
        incoming_imei: primaryDevice.imei || undefined,
        incoming_serial: primaryDevice.serial || undefined,
        incoming_email: primaryDevice.account_email || undefined,
        incoming_capacity: primaryDevice.capacity || undefined,
        incoming_color: primaryDevice.color || undefined,
        incoming_condition: primaryDevice.condition || undefined,
        incoming_battery_health: primaryDevice.battery_health || undefined,
        incoming_purchase_price: Number(primaryDevice.purchase_price) || undefined,
        signature_admin: adminSignature || undefined,
        pdf_type: form.pdf_type || (form.product_condition?.toLowerCase().startsWith('novo') ? 'novo' : 'seminovo'),
        installments_json: installmentsJson || undefined,
        outgoing_items: (() => {
          try {
            const items = JSON.parse(outgoingItemsJson || '[]');
            return items.length > 1 ? items : undefined;
          } catch { return undefined; }
        })(),
      };
      generatePDF(pdfData, getCompanyInfo(), printWin);

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

      // WhatsApp notification (fire-and-forget)
      sendWppNotification(buildSaleNotificationText({
        saleType:        form.sale_type,
        saleNumber,
        customerName,
        productName:     productName || '—',
        productCondition: form.product_condition || '',
        totalAmount,
        paymentMethod:   resolvedPaymentMethod || form.payment_method || '—',
      }));

      // Build WhatsApp post-sale data
      const whatsappPhone = form.whatsapp_number || customerPhone || '';
      const postName = customerName;

      setPostSaleData({ customerName: postName, phone: whatsappPhone, signLink, saleNumber, saleType: form.sale_type });
      setIsModalOpen(false);
      setAdditionalItems([]);
      setForm(emptyForm());
      setIncomingDevices([emptyTradeInDevice()]);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '', cpf: '', email: '', address: '' });
      fetchData();
    } catch (error: any) {
      printWin?.close();
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
      // Aparelho entrante (troca e prazo) — lê do DeviceForm
      const primaryEditDevice = editIncomingDevices[0] || emptyTradeInDevice();
      if (editForm.sale_type === 'troca' || editForm.sale_type === 'prazo') {
        const deviceName = deviceFormToProductName(primaryEditDevice) || primaryEditDevice.model || '';
        updates.incoming_name = deviceName;
        updates.incoming_imei = primaryEditDevice.imei || '';
        updates.incoming_serial = primaryEditDevice.serial || '';
        updates.incoming_email = primaryEditDevice.account_email || '';
        updates.incoming_capacity = primaryEditDevice.capacity || '';
        updates.incoming_color = primaryEditDevice.color || '';
        updates.incoming_condition = primaryEditDevice.condition || '';
        updates.incoming_battery_health = primaryEditDevice.battery_health || '';
        updates.incoming_purchase_price = Number(primaryEditDevice.purchase_price) || 0;
        // Se o aparelho entrante mudou/foi adicionado vs o que estava salvo, adiciona ao estoque
        const prevName = editSale.incoming_name?.trim() || '';
        const newName  = deviceName.trim();
        if (newName && newName !== prevName) {
          const batteryNote = primaryEditDevice.battery_health ? ` · Bateria: ${primaryEditDevice.battery_health}` : '';
          await dataService.addProduct({
            name: newName,
            category: primaryEditDevice.category || 'iPhone',
            purchase_price: Number(primaryEditDevice.purchase_price) || 0,
            sale_price: Number(primaryEditDevice.sale_price) || 0,
            stock_quantity: 1,
            status: 'available',
            imei: primaryEditDevice.imei || '',
            product_capacity: primaryEditDevice.capacity !== '—' ? primaryEditDevice.capacity : '',
            product_color: primaryEditDevice.color || '',
            product_condition: (primaryEditDevice.condition || 'Seminovo — Excelente') + batteryNote,
            product_warranty: primaryEditDevice.warranty || 'Sem garantia',
            product_origin: primaryEditDevice.origin || '',
            entry_date: primaryEditDevice.entry_date || new Date().toISOString().split('T')[0],
          });
        }
      }
      if (editForm.sale_type === 'prazo') {
        const productPrice = Number(editForm.sale_price_manual) || amount;
        const tradeIn = Number(primaryEditDevice.purchase_price) || 0;
        updates.total_amount = productPrice;
        if (editForm.prazo_count && editForm.prazo_value && editForm.prazo_first_due) {
          const count = Math.max(1, Number(editForm.prazo_count) || 1);
          const value = Number(editForm.prazo_value) || 0;
          const editHasEntrada = !!editForm.prazo_has_entrada;
          const editEntradaVal = editHasEntrada ? Math.max(0, Number(editForm.prazo_entrada_value) || 0) : 0;
          const editEntradaDue = editHasEntrada ? editForm.prazo_entrada_due : '';
          const [fy, fm, fd] = editForm.prazo_first_due.split('-').map(Number);
          const existingInsts: any[] = (() => { try { return JSON.parse(editSale.installments_json || '[]'); } catch { return []; } })();
          const newInsts: any[] = [];
          if (editHasEntrada && editEntradaVal > 0 && editEntradaDue) {
            const prevEntrada = existingInsts.find((p: any) => p.is_entrada);
            newInsts.push({ n: 0, due: editEntradaDue, amount: editEntradaVal, paid_at: prevEntrada?.paid_at || null, is_entrada: true });
          }
          Array.from({ length: count }, (_, i) => {
            const d = new Date(fy, fm - 1 + i, fd);
            const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const prevInst = existingInsts.find((p: any) => !p.is_entrada && p.n === i + 1);
            newInsts.push({ n: i + 1, due, amount: value, paid_at: prevInst?.paid_at || null });
          });
          updates.installments_json = JSON.stringify(newInsts);
          updates.installments = count;
          const parts: string[] = [];
          if (tradeIn > 0) parts.push(`Troca ${formatCurrency(tradeIn)}`);
          if (editHasEntrada && editEntradaVal > 0) parts.push(`Entrada ${formatCurrency(editEntradaVal)}`);
          parts.push(`${count}x de ${formatCurrency(value)} a prazo`);
          updates.payment_method = parts.join(' + ');
          updates.total_amount = editEntradaVal + count * value + tradeIn;
        }
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
        // Restaura TODOS os aparelhos que saíram do estoque — lê outgoing_items_json se disponível
        const outgoingItems: Array<{name: string; imei?: string}> = (() => {
          try {
            const parsed = JSON.parse(deleteSale.outgoing_items_json || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {}
          // Fallback: só produto principal
          return [{ name: deleteSale.product_name, imei: deleteSale.product_imei }];
        })();

        let restoredCount = 0;
        for (const outItem of outgoingItems) {
          const found = allProds.find((p: any) => {
            if (outItem.imei && p.imei) return p.imei === outItem.imei;
            return p.name === outItem.name && p.stock_quantity <= 0;
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
            restoredCount++;
          }
        }
        if (restoredCount > 0) {
          toast.success(`${restoredCount} produto${restoredCount > 1 ? 's devolvidos' : ' devolvido'} ao estoque!`);
        } else {
          toast('Produtos não localizados automaticamente — ajuste o estoque manualmente se necessário.', { icon: '⚠️', duration: 5000 });
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

      // Cascade: remove related financial transactions
      const saleNum = deleteSale.sale_number;
      if (saleNum) {
        const relatedTx = transactions.filter((t: any) =>
          t.description?.includes(saleNum)
        );
        await Promise.all(relatedTx.map((t: any) => dataService.deleteTransaction(t.id).catch(() => {})));
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

  const handleMarkPaid = async (sale: any, instIndex: number) => {
    const key = `${sale.id}-${instIndex}`;
    try {
      setMarkingPaid(key);
      const installments: any[] = JSON.parse(sale.installments_json || '[]');
      const paid_at = new Date().toISOString().slice(0, 10);
      const updated = installments.map((inst, i) =>
        i === instIndex ? { ...inst, paid_at } : inst
      );
      await dataService.updateSale(sale.id, { installments_json: JSON.stringify(updated) });
      const inst = installments[instIndex];
      const regularInsts = installments.filter((i: any) => !i.is_entrada);
      const instLabel = inst.is_entrada ? 'Entrada' : `Parcela ${inst.n}/${regularInsts.length}`;
      const txDesc = `Receita ${sale.sale_number} — ${instLabel} (${sale.customer_name || ''})`;
      await dataService.addTransaction({
        description: txDesc,
        amount: inst.amount,
        type: 'income',
        category: 'sale',
        date: paid_at,
      });

      // Custo proporcional: só para vendas SEM custo já registrado em lump-sum (novas vendas)
      const existingLumpSumCost = costBySale[sale.sale_number] ?? costBySale[`uuid:${sale.id?.slice(0, 8)}`] ?? 0;
      if (existingLumpSumCost === 0) {
        // Novo estilo: calcula custo a partir de outgoing_items_json
        const outItems: any[] = (() => { try { return JSON.parse(sale.outgoing_items_json || '[]'); } catch { return []; } })();
        const totalItemCost = outItems.reduce((s: number, i: any) => s + Number(i.cost || 0), 0);
        const totalAmt = Number(sale.total_amount || 0);
        if (totalItemCost > 0 && totalAmt > 0) {
          const proportionalCost = Math.round(totalItemCost * (inst.amount / totalAmt) * 100) / 100;
          if (proportionalCost > 0) {
            await dataService.addTransaction({
              description: `Custo Parcela ${sale.sale_number} — ${instLabel} (${sale.customer_name || ''})`,
              amount: proportionalCost,
              type: 'expense',
              category: 'stock',
              date: paid_at,
            });
          }
        }
      }

      toast.success(inst.is_entrada ? 'Entrada marcada como paga!' : `Parcela ${inst.n} marcada como paga!`);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao marcar parcela: ' + error.message);
    } finally {
      setMarkingPaid(null);
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
      customer_phone: sale.customer_phone || sale.customers?.phone || '',
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
      installments_json: sale.installments_json || undefined,
      outgoing_items: (() => {
        try {
          const items = JSON.parse(sale.outgoing_items_json || '[]');
          return items.length > 1 ? items : undefined;
        } catch { return undefined; }
      })(),
    };
    generatePDF(pdfData, getCompanyInfo());
  };

  const handleCopySignLink = async (sale: any) => {
    if (!sale.sign_token) { toast.error('Esta venda não tem token de assinatura. Registre novamente.'); return; }
    const link = `${window.location.origin}/assinar/${sale.sign_token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link de assinatura copiado!');
    } catch {
      // Fallback para iOS Safari e contextos sem permissão de clipboard
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) toast.success('Link de assinatura copiado!');
      else toast.error('Não foi possível copiar. Acesse: ' + link);
    }
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

  const exportMonthCSV = (monthSales: any[], monthKey: string) => {
    const header = ['Nº', 'Tipo', 'Cliente', 'Produto', 'IMEI', 'Valor (R$)', 'Pagamento', 'Data'];
    const rows = monthSales.map(s => [
      s.sale_number || '',
      TYPE_LABELS[s.sale_type || 'venda'] || 'Venda',
      s.customer_name || '',
      s.product_name || '',
      s.product_imei || '',
      String(Number(s.total_amount || 0).toFixed(2)),
      s.payment_method || '',
      s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '',
    ]);
    const csv = '﻿' + [header, ...rows].map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vendas-${monthKey}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

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
        <Button leftIcon={<Plus size={20} />} onClick={() => { setForm(emptyForm()); setIncomingDevices([emptyTradeInDevice()]); setShowNewCustomer(false); setNewCustomer({ name: '', phone: '', cpf: '', email: '', address: '' }); setWizardStep(1); setIsModalOpen(true); }}>
          Nova Operação
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, produto, IMEI..."
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowDateFilter(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-bold flex-shrink-0 transition-all',
              (showDateFilter || dateFrom || dateTo)
                ? 'border-primary/40 bg-primary/8 text-primary-900'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50'
            )}
            title="Filtrar por período"
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">Período</span>
            {(dateFrom || dateTo) && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>
          {(searchTerm || dateFrom || dateTo) && (
            <button onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setShowDateFilter(false); }}
              className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-danger hover:border-danger transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Collapsible date filter */}
        {showDateFilter && (
          <div className="flex gap-2 animate-in slide-in-from-top-1 duration-150">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">De</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-w-0 px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-w-0 px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); exportMonthCSV(monthSales, monthKey); }}
                      className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                      title="Exportar CSV do mês"
                    >
                      <Download size={15} />
                    </button>
                    <div className="text-right">
                      <p className="font-black text-neutral-900">{formatCurrency(monthTotal)}</p>
                      <p className="text-xs text-neutral-400">total do mês</p>
                    </div>
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
                      const saleProfit = type === 'prazo' ? null : (saleCost !== null ? Number(sale.total_amount) - saleCost : null);
                      // Para trocas: lucro potencial do aparelho recebido
                      const tradeDevs: any[] = type === 'troca' ? (() => { try { return JSON.parse(sale.incoming_devices_json || '[]'); } catch { return []; } })() : [];
                      const tradeResale = type === 'troca' ? Number(tradeDevs[0]?.sale_price || 0) : 0;
                      const tradePotential = tradeResale > 0 ? tradeResale - Number(sale.incoming_purchase_price || 0) : null;
                      const prazoInsts: any[] = type === 'prazo' && sale.installments_json
                        ? (() => { try { return JSON.parse(sale.installments_json); } catch { return []; } })()
                        : [];
                      const paidCount = prazoInsts.filter((i: any) => i.paid_at).length;
                      const isExpanded = expandedPrazoSale === sale.id;
                      const today = new Date().toISOString().slice(0, 10);

                      return (
                        <React.Fragment key={sale.id}>
                        <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-neutral-50 transition-colors">
                          {/* Number + type badge stacked on mobile */}
                          <div className="flex-shrink-0 flex flex-col items-start gap-0.5 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-neutral-500">{num}</span>
                            <span className={cn('px-1.5 py-px rounded-full text-[9px] font-bold', TYPE_COLORS[type])}>
                              {TYPE_LABELS[type]}
                            </span>
                          </div>

                          {/* Name + product */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{name}</p>
                            <p className="text-xs text-neutral-400 truncate">
                              {(() => {
                                try {
                                  const items = JSON.parse(sale.outgoing_items_json || '[]');
                                  if (items.length > 1) return items.map((it: any) => it.name).join(' + ');
                                } catch {}
                                return sale.product_name + (sale.product_imei ? ` · IMEI ${sale.product_imei}` : '');
                              })()}
                              {(type === 'troca' || type === 'prazo') && sale.incoming_name?.trim() ? ` ⇄ ${sale.incoming_name}` : ''}
                            </p>
                          </div>

                          {/* Rep seller badge */}
                          {sale.rep_seller_name && (
                            <span className="hidden md:block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary-900 flex-shrink-0 max-w-[100px] truncate">
                              {sale.rep_seller_name}
                            </span>
                          )}

                          {/* Payment */}
                          <span className="hidden sm:block text-xs text-neutral-500 flex-shrink-0">
                            {sale.installments > 1
                              ? `${sale.installments}x ${formatCurrency(sale.total_amount / (sale.installments || 1))}`
                              : sale.payment_method}
                          </span>

                          {/* Prazo progress OR signature status */}
                          {type === 'prazo' ? (
                            <button
                              onClick={() => setExpandedPrazoSale(isExpanded ? null : sale.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all border active:scale-95',
                                !sale.installments_json
                                  ? 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                                  : paidCount === prazoInsts.length && prazoInsts.length > 0
                                  ? 'bg-primary/10 text-neutral-900 border-primary/20 hover:bg-primary/15'
                                  : prazoInsts.some((i: any) => !i.paid_at && i.due < today)
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                              )}
                              title="Ver parcelas"
                            >
                              <Clock size={11} />
                              <span className="hidden sm:inline">
                                {!sale.installments_json ? 'Migração' : `${paidCount}/${prazoInsts.length} pagas`}
                              </span>
                              <span className="sm:hidden">
                                {!sale.installments_json ? '!' : `${paidCount}/${prazoInsts.length}`}
                              </span>
                              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </button>
                          ) : (
                            <span className={cn(
                              'hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0',
                              sale.signature_client
                                ? 'bg-primary/10 text-neutral-900'
                                : 'bg-neutral-100 text-neutral-500'
                            )}>
                              {sale.signature_client ? (
                                <><CheckCircle2 size={10} /> Assinado</>
                              ) : (
                                <><RefreshCw size={10} /> Aguardando</>
                              )}
                            </span>
                          )}

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
                                {tradePotential !== null && (
                                  <span className="text-neutral-400"> + {formatCurrency(tradePotential)}</span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => setDetailSale(sale)}
                              className="p-2 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleGeneratePDF(sale)}
                              className="p-2 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors hidden sm:block"
                              title="Baixar PDF"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const sType = sale.sale_type || 'venda';
                                const tradeIn = sale.incoming_purchase_price || 0;
                                const existingInsts: any[] = (() => { try { return JSON.parse(sale.installments_json || '[]'); } catch { return []; } })();
                                // sale_price_manual: para troca = caixa recebido (total − troca); prazo/venda = total_amount
                                const salePriceManual = sType === 'troca'
                                  ? String(Math.max(0, (sale.total_amount || 0) - tradeIn))
                                  : String(sale.total_amount || '');
                                const payMethod = PAYMENT_METHODS.includes(sale.payment_method || '') ? (sale.payment_method || 'PIX') : 'PIX';

                                const primaryProductId = (() => { try { return JSON.parse(sale.outgoing_items_json || '[]')[0]?.product_id || ''; } catch { return ''; } })();
                                setForm({
                                  ...emptyForm(),
                                  sale_type: sType,
                                  selectedCustomer: sale.customer_id || '',
                                  customer_phone: sale.customer_phone || sale.customers?.phone || '',
                                  customer_cpf: sale.customer_cpf || '',
                                  customer_city: sale.customer_city || sale.customers?.city || '',
                                  selectedProduct: primaryProductId,
                                  product_name_manual: sale.product_name || '',
                                  product_capacity: sale.product_capacity || '',
                                  product_color: sale.product_color || '',
                                  product_condition: sale.product_condition || 'Seminovo',
                                  product_imei: sale.product_imei || '',
                                  product_accessories: sale.product_accessories || '',
                                  sale_price_manual: salePriceManual,
                                  payment_method: payMethod,
                                  installments: sale.installments || 1,
                                  sale_date: sale.created_at
                                    ? new Date(sale.created_at).toISOString().slice(0, 16)
                                    : new Date().toISOString().slice(0, 16),
                                  whatsapp_number: sale.customer_phone || sale.customers?.phone || '',
                                  pdf_type: sale.pdf_type || (sale.product_condition?.toLowerCase().startsWith('novo') ? 'novo' : 'seminovo'),
                                  prazo_count: String(existingInsts.filter((i: any) => !i.is_entrada).length || 1),
                                  prazo_value: (() => { const fi = existingInsts.find((i: any) => !i.is_entrada); return fi?.amount ? String(fi.amount) : ''; })(),
                                  prazo_first_due: existingInsts.find((i: any) => !i.is_entrada)?.due || '',
                                  prazo_has_entrada: existingInsts.some((i: any) => i.is_entrada),
                                  prazo_entrada_value: (() => { const ei = existingInsts.find((i: any) => i.is_entrada); return ei?.amount ? String(ei.amount) : ''; })(),
                                  prazo_entrada_due: existingInsts.find((i: any) => i.is_entrada)?.due || '',
                                });
                                // Pré-preenche aparelho entrante — restaura todos os campos do json salvo
                                const storedDevices: any[] = (() => { try { return JSON.parse(sale.incoming_devices_json || '[]'); } catch { return []; } })();
                                const sd0 = storedDevices[0];
                                setIncomingDevices(sale.incoming_name?.trim() ? [{
                                  ...emptyTradeInDevice(),
                                  category: sd0?.category || 'iPhone',
                                  model: sale.incoming_name || '',
                                  imei: sale.incoming_imei || '',
                                  capacity: sale.incoming_capacity || '',
                                  color: sale.incoming_color || '',
                                  condition: sale.incoming_condition || 'Seminovo — Excelente',
                                  battery_health: sale.incoming_battery_health || '',
                                  purchase_price: tradeIn > 0 ? String(tradeIn) : '',
                                  serial: sale.incoming_serial || '',
                                  account_email: sale.incoming_email || '',
                                  sale_price: sd0?.sale_price ? String(sd0.sale_price) : '',
                                  warranty: sd0?.warranty || 'Sem garantia',
                                  origin: sd0?.origin || '',
                                }] : [emptyTradeInDevice()]);
                                // Restore additional items from outgoing_items_json
                                const storedOutgoing = (() => { try { return JSON.parse(sale.outgoing_items_json || '[]'); } catch { return []; } })();
                                if (storedOutgoing.length > 1) {
                                  setAdditionalItems(storedOutgoing.slice(1).map((item: any) => ({
                                    ...emptyAdditionalItem(),
                                    id: crypto.randomUUID(),
                                    selectedProduct: item.product_id || '',
                                    name_override: item.name || '',
                                    imei_override: item.imei || '',
                                    capacity_override: item.capacity || '',
                                    color_override: item.color || '',
                                    condition_override: item.condition || 'Seminovo',
                                    price_override: String(item.price || ''),
                                  })));
                                } else {
                                  setAdditionalItems([]);
                                }
                                setShowNewCustomer(false);
                                setNewCustomer({ name: '', phone: '', cpf: '', email: '', address: '' });
                                setIsEditMode(true);
                                setEditSaleId(sale.id);
                                setEditSaleNumber(sale.sale_number || '');
                                setEditSaleRevision(sale.revision || 0);
                                setWizardStep(1);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                              title="Editar venda"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(sale)}
                              className="p-2 text-neutral-400 hover:text-danger hover:bg-danger-light rounded-xl transition-colors"
                              title="Remover venda"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* ── Installments panel (prazo) ── */}
                        {type === 'prazo' && isExpanded && (
                          <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-3 space-y-1.5">
                            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Calendar size={11} /> Parcelas — {name}
                            </p>

                            {!sale.installments_json ? (
                              <div className="flex items-start gap-3 bg-neutral-100 border border-neutral-200 rounded-xl p-4">
                                <span className="text-neutral-500 text-lg flex-shrink-0">⚠️</span>
                                <div>
                                  <p className="text-sm font-bold text-neutral-800">Dados das parcelas não encontrados</p>
                                  <p className="text-xs text-neutral-600 mt-1">
                                    A coluna <code className="bg-neutral-200 px-1 rounded">installments_json</code> não existe no banco. Execute a migração SQL em{' '}
                                    <strong>Configurações → Banco de Dados</strong> e recrie esta venda a prazo.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {prazoInsts.map((inst: any, i: number) => {
                                  const isOverdue = !inst.paid_at && inst.due < today;
                                  const isPaid = !!inst.paid_at;
                                  const markKey = `${sale.id}-${i}`;
                                  return (
                                    <div key={i} className={cn(
                                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                                      isPaid ? 'bg-white border border-neutral-200' : isOverdue ? 'bg-red-50 border border-red-200' : inst.is_entrada ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-neutral-200'
                                    )}>
                                      <span className={cn('text-xs font-black w-5 flex-shrink-0', isPaid ? 'text-neutral-400' : isOverdue ? 'text-red-600' : inst.is_entrada ? 'text-amber-700' : 'text-neutral-700')}>
                                        {inst.is_entrada ? '↓' : inst.n}
                                      </span>
                                      <span className={cn('text-xs flex-shrink-0', inst.is_entrada ? 'font-black text-amber-700 w-auto pr-1' : 'text-neutral-500 w-24')}>
                                        {inst.is_entrada ? 'Entrada' : ''}{inst.is_entrada ? ' · ' : ''}{inst.due.split('-').reverse().join('/')}
                                      </span>
                                      <span className="font-bold text-neutral-800 flex-1">
                                        {formatCurrency(inst.amount)}
                                      </span>
                                      {isPaid ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                          <CheckCircle2 size={10} className="text-primary" /> Pago {inst.paid_at.split('-').reverse().join('/')}
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleMarkPaid(sale, i)}
                                          disabled={markingPaid === markKey}
                                          className={cn(
                                            'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors',
                                            isOverdue
                                              ? 'bg-red-500 text-white hover:bg-red-600'
                                              : inst.is_entrada
                                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                                              : 'bg-neutral-900 text-white hover:bg-neutral-800',
                                            markingPaid === markKey && 'opacity-50 cursor-not-allowed'
                                          )}
                                        >
                                          {markingPaid === markKey ? (
                                            <RefreshCw size={11} className="animate-spin" />
                                          ) : (
                                            <CheckCircle2 size={11} />
                                          )}
                                          {isOverdue ? 'Atrasada — Receber' : inst.is_entrada ? 'Receber Entrada' : 'Receber'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between pt-2 border-t border-neutral-200 text-xs font-bold text-neutral-700">
                                  <span>Total do contrato</span>
                                  <span>{formatCurrency(prazoInsts.reduce((s: number, i: any) => s + i.amount, 0))}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-neutral-500 font-bold">
                                  <span>Já recebido ({paidCount} parcela{paidCount !== 1 ? 's' : ''})</span>
                                  <span className="text-primary font-black">{formatCurrency(prazoInsts.filter((i: any) => i.paid_at).reduce((s: number, i: any) => s + i.amount, 0))}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        </React.Fragment>
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
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setIsEditMode(false); setEditSaleId(null); setAdditionalItems([]); }} title={isEditMode ? `Editar — ${editSaleNumber}` : 'Nova Operação'} maxWidth="2xl">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-0"
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        >

          {/* ── Wizard: Progress indicator ── */}
          {(() => {
            const steps = [
              { n: 1, label: 'Operação & Cliente' },
              { n: 2, label: form.sale_type === 'troca' ? 'Produtos & Troca' : form.sale_type === 'prazo' ? 'Produto & Parcelas' : 'Produto' },
              { n: 3, label: 'Negociação' },
              { n: 4, label: 'Revisão' },
            ];
            return (
              <div className="mb-6">
                <div className="flex items-center gap-0">
                  {steps.map((s, i) => (
                    <React.Fragment key={s.n}>
                      <button
                        type="button"
                        onClick={() => wizardStep > s.n && setWizardStep(s.n)}
                        className={cn(
                          'flex flex-col items-center gap-1 flex-1 py-2 transition-all',
                          wizardStep > s.n ? 'cursor-pointer' : 'cursor-default'
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all',
                          wizardStep === s.n ? 'bg-neutral-900 text-white scale-110' :
                          wizardStep > s.n  ? 'bg-primary text-neutral-900' :
                          'bg-neutral-100 text-neutral-400'
                        )}>
                          {wizardStep > s.n ? <CheckCircle2 size={14} /> : s.n}
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold text-center leading-tight hidden sm:block',
                          wizardStep === s.n ? 'text-neutral-900' : wizardStep > s.n ? 'text-primary' : 'text-neutral-400'
                        )}>{s.label}</span>
                      </button>
                      {i < steps.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mb-5 transition-all', wizardStep > s.n ? 'bg-primary' : 'bg-neutral-200')} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ══════════════════════════════════════════
              ETAPA 1 — Operação & Cliente
          ══════════════════════════════════════════ */}
          {wizardStep === 1 && <div className="space-y-6">

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
                  <div className="sm:col-span-2 bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
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

              {!showNewCustomer && (
                <div className="sm:col-span-2">
                  <Input
                    label="Endereço / Cidade do Cliente"
                    placeholder="Rua, número, bairro, cidade — SP"
                    value={form.customer_city}
                    onChange={setF('customer_city')}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* WhatsApp — always visible so the signing link can be sent */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                  <MessageCircle size={15} className="text-primary" />
                  WhatsApp do Cliente <span className="text-neutral-400 font-normal text-xs">(para envio do link de assinatura)</span>
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp_number}
                  onChange={setF('whatsapp_number')}
                  autoComplete="off"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                />
              </div>
              </div>
            </div>

          </div>} {/* ── fim etapa 1 ── */}

          {/* ══════════════════════════════════════════
              ETAPA 2 — Produto(s)
          ══════════════════════════════════════════ */}
          {wizardStep === 2 && <div className="space-y-6">

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
                <div className="sm:col-span-2 border-2 border-primary/30 bg-primary/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-primary rounded-full flex-shrink-0" />
                    <p className="text-xs font-black text-neutral-800 uppercase tracking-widest">Produto Sob Demanda</p>
                    <span className="text-xs text-neutral-500 font-normal normal-case">— comprado e vendido direto</span>
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
                      <div className="bg-white rounded-xl border border-neutral-200 p-2.5 text-center">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Custo</p>
                        <p className="text-sm font-black text-neutral-700 mt-0.5">{formatCurrency(totalCost)}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-neutral-200 p-2.5 text-center">
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
                        form.save_to_stock ? 'bg-primary' : 'bg-neutral-200'
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

              {(() => {
                const cat = selectedProductData?.category || '';
                const isImeiOnly = ['iPhone', 'Smartphones'].includes(cat);
                const isSerialOnly = ['MacBook', 'AirPods'].includes(cat);
                const idLabel = isImeiOnly ? 'IMEI' : isSerialOnly ? 'Número de Série' : 'IMEI / Número de Série';
                const idPlaceholder = isImeiOnly ? '352XXXXXXXXXXXX' : isSerialOnly ? 'Ex: C02X1234JGH5' : 'IMEI (15 dig.) ou Nº de Série';
                const idMax = isImeiOnly ? 15 : undefined;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-bold text-neutral-700">{idLabel}{isImeiOnly ? ' *' : ''}</label>
                      {idMax && (
                        <span className={`text-xs font-mono ${form.product_imei.length === idMax ? 'text-primary font-bold' : form.product_imei.length > 0 ? 'text-neutral-500' : 'text-neutral-300'}`}>
                          {form.product_imei.length}/{idMax}
                        </span>
                      )}
                    </div>
                    <input
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                      placeholder={idPlaceholder}
                      value={form.product_imei}
                      maxLength={idMax}
                      inputMode={idMax ? 'numeric' : 'text'}
                      onChange={(e) => {
                        const val = idMax
                          ? e.target.value.replace(/\D/g, '').slice(0, idMax)
                          : e.target.value;
                        setForm((f) => ({ ...f, product_imei: val }));
                      }}
                      autoComplete="off"
                    />
                    {isImeiOnly && <p className="text-[11px] text-neutral-400 mt-1">Máx. 15 dígitos</p>}
                    {!isImeiOnly && !isSerialOnly && <p className="text-[11px] text-neutral-400 mt-1">Chip: 15 dígitos · Wi-Fi: Número de Série</p>}
                  </div>
                );
              })()}
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
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-primary/40'
              )}>
                <input type="radio" name="pdf_type" value="novo"
                  checked={form.pdf_type === 'novo'}
                  onChange={() => setForm((f) => ({ ...f, pdf_type: 'novo' }))}
                  className="hidden" />
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    form.pdf_type === 'novo' ? 'border-primary' : 'border-neutral-300')}>
                    {form.pdf_type === 'novo' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-bold text-sm text-neutral-900">Aparelho Novo (Lacrado)</span>
                </div>
                <p className="text-xs text-neutral-500 pl-6.5">Garantia do Fabricante · 12 meses (Apple)</p>
                <p className="text-[10px] text-neutral-600 font-semibold pl-6.5">→ PDF imprime: Garantia Oficial do Fabricante</p>
              </label>

              <label className={cn(
                'flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                form.pdf_type === 'seminovo'
                  ? 'border-neutral-700 bg-neutral-100 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              )}>
                <input type="radio" name="pdf_type" value="seminovo"
                  checked={form.pdf_type === 'seminovo'}
                  onChange={() => setForm((f) => ({ ...f, pdf_type: 'seminovo' }))}
                  className="hidden" />
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    form.pdf_type === 'seminovo' ? 'border-neutral-700' : 'border-neutral-300')}>
                    {form.pdf_type === 'seminovo' && <div className="w-2 h-2 rounded-full bg-neutral-700" />}
                  </div>
                  <span className="font-bold text-sm text-neutral-900">Seminovo / Usado</span>
                </div>
                <p className="text-xs text-neutral-500 pl-6.5">Garantia Easy Imports · 90 dias (CDC art. 26)</p>
                <p className="text-[10px] text-neutral-600 font-semibold pl-6.5">→ PDF imprime: Garantia Easy Imports 90 dias</p>
              </label>
            </div>

            {/* Aviso de inconsistência entre condição e tipo de garantia */}
            {(() => {
              const cLower = (form.product_condition || '').toLowerCase();
              const condIsNovo = cLower === 'novo' || cLower.startsWith('novo ') || cLower.startsWith('novo(');
              if (condIsNovo && form.pdf_type !== 'novo') return (
                <p className="mt-3 text-xs text-neutral-700 bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 font-medium">
                  ⚠️ O estado selecionado é "Novo" mas a garantia do PDF está como Seminovo — verifique se está correto!
                </p>
              );
              if (!condIsNovo && form.pdf_type === 'novo') return (
                <p className="mt-3 text-xs text-neutral-700 bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 font-medium">
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

          {/* ─── Produtos Adicionais (multi-produto) ─── */}
          {(form.selectedProduct || form.product_name_manual) && (
            <div className="space-y-3">
              {additionalItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Produtos Adicionais</p>
                  {additionalItems.map((item, idx) => {
                    const prod = products.find((p: any) => p.id === item.selectedProduct);
                    return (
                      <div key={item.id} className="border border-neutral-200 rounded-xl p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-neutral-600 uppercase tracking-widest">Produto {idx + 2}</span>
                          <button
                            type="button"
                            onClick={() => setAdditionalItems(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Produto do Estoque</label>
                            <select
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                              value={item.selectedProduct}
                              onChange={(e) => {
                                const pid = e.target.value;
                                const p = products.find((pr: any) => pr.id === pid);
                                setAdditionalItems(prev => prev.map(i => i.id === item.id ? {
                                  ...i,
                                  selectedProduct: pid,
                                  name_override: p?.name || i.name_override || '',
                                  imei_override: p?.imei || i.imei_override || '',
                                  capacity_override: p?.product_capacity || i.capacity_override || '',
                                  color_override: p?.product_color || i.color_override || '',
                                  condition_override: (p?.product_condition || 'Seminovo').replace(/ · Bateria:.*/, ''),
                                  price_override: i.price_override || (p?.sale_price > 0 ? String(p.sale_price) : ''),
                                } : i));
                              }}
                            >
                              <option value="">Selecionar do estoque...</option>
                              {products.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.imei ? ` · IMEI: ${p.imei}` : ''} — {formatCurrency(p.sale_price)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Valor de Venda (R$)</label>
                            <input
                              type="number" step="any" inputMode="decimal"
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
                              value={item.price_override}
                              placeholder={prod?.sale_price ? String(prod.sale_price) : '0,00'}
                              onChange={(e) => setAdditionalItems(prev => prev.map(i => i.id === item.id ? { ...i, price_override: e.target.value } : i))}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-neutral-700 mb-1.5">IMEI / Nº de Série</label>
                            <input
                              type="text" inputMode="text"
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                              value={item.imei_override}
                              placeholder={prod?.imei || 'IMEI ou Nº de Série'}
                              onChange={(e) => setAdditionalItems(prev => prev.map(i => i.id === item.id ? { ...i, imei_override: e.target.value } : i))}
                            />
                          </div>
                          {prod && (
                            <div className="sm:col-span-2 bg-neutral-50 rounded-lg px-3 py-2 text-xs text-neutral-600 font-medium">
                              {prod.name}{prod.product_capacity ? ` · ${prod.product_capacity}` : ''}{prod.product_color ? ` · ${prod.product_color}` : ''}{prod.imei ? ` · IMEI: ${prod.imei}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => setAdditionalItems(prev => [...prev, emptyAdditionalItem()])}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-neutral-300 rounded-xl text-sm font-bold text-neutral-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Plus size={15} />
                Adicionar outro produto à venda
              </button>
            </div>
          )}

          {/* ─── Aparelhos Entrando (troca) — multi-device ─── */}
          {(form.sale_type === 'troca' || form.sale_type === 'prazo') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-neutral-700 uppercase tracking-widest">
                  {form.sale_type === 'prazo' ? 'Aparelho na Troca (opcional)' : 'Aparelhos Entrando (do cliente)'}
                </p>
                <button
                  type="button"
                  onClick={() => setIncomingDevices((prev) => [...prev, emptyTradeInDevice()])}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Plus size={13} /> Adicionar aparelho
                </button>
              </div>

              {incomingDevices.map((device, idx) => (
                <div key={idx} className="border border-neutral-200 bg-neutral-50/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-neutral-700">{idx + 1}</span>
                      </div>
                      <p className="text-xs font-bold text-neutral-700">
                        {deviceFormToProductName(device) || device.model || 'Aparelho sem modelo'}
                      </p>
                    </div>
                    {incomingDevices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setIncomingDevices((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover aparelho"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <DeviceForm
                    value={device}
                    onChange={(v) =>
                      setIncomingDevices((prev) =>
                        prev.map((d, i) => i === idx ? { ...d, ...v } : d)
                      )
                    }
                    purchasePriceLabel="Valor dado ao cliente (R$)"
                    purchasePriceRequired={false}
                    salePriceLabel="Previsão de revenda (R$) — opcional"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                    <Input
                      label="Número de Série"
                      placeholder="Ex: C02XG2YJHV2Q"
                      value={device.serial}
                      onChange={(e) =>
                        setIncomingDevices((prev) =>
                          prev.map((d, i) => i === idx ? { ...d, serial: e.target.value } : d)
                        )
                      }
                      autoComplete="off"
                    />
                    <Input
                      label="E-mail da Conta (iCloud/Google)"
                      placeholder="Ex: joao@icloud.com"
                      value={device.account_email}
                      onChange={(e) =>
                        setIncomingDevices((prev) =>
                          prev.map((d, i) => i === idx ? { ...d, account_email: e.target.value } : d)
                        )
                      }
                      autoComplete="off"
                    />
                  </div>
                </div>
              ))}

              <p className="text-xs text-neutral-500 pl-1">
                {form.sale_type === 'prazo'
                  ? 'O aparelho entra no estoque e o crédito dado ao cliente reduz o valor contratado.'
                  : 'Todos os aparelhos serão adicionados automaticamente ao seu estoque.'
                }
              </p>

              {/* ── Painel de lucratividade da troca (só para troca, não prazo) ── */}
              {form.sale_type !== 'prazo' && (() => {
                const cashReceived = Number(form.sale_price_manual) || 0;
                const totalTradeIn = incomingDevices.reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                const totalResale  = incomingDevices.reduce((s, d) => s + Number(d.sale_price || 0), 0);
                const outSale      = cashReceived + totalTradeIn;
                const outCost      = selectedProductData?.purchase_price || 0;
                const profitOutgoing = outSale - outCost;
                const profitIncoming = totalResale > 0 ? totalResale - totalTradeIn : null;
                const totalProfit    = profitOutgoing + (profitIncoming ?? 0);
                const hasNumbers     = cashReceived > 0 || outCost > 0 || totalTradeIn > 0;
                if (!hasNumbers) return null;

                const profitColor = (v: number) =>
                  v > 0 ? 'text-green-700' : v < 0 ? 'text-red-600' : 'text-neutral-600';

                return (
                  <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-neutral-700 uppercase tracking-widest">Análise da Troca</p>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Você recebe em caixa</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(cashReceived)}</span>
                      </div>
                      {totalTradeIn > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">
                            Crédito dos aparelhos ({incomingDevices.filter((d) => d.purchase_price).length}x)
                          </span>
                          <span className="font-bold text-neutral-900">+ {formatCurrency(totalTradeIn)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Valor total da operação</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(outSale)}</span>
                      </div>
                      {outCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Custo do aparelho saindo</span>
                          <span className="font-bold text-neutral-600">− {formatCurrency(outCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1.5 border-t border-neutral-100">
                        <span className="font-bold text-neutral-700">Lucro nesta venda</span>
                        <span className={cn('font-black', profitColor(profitOutgoing))}>
                          {formatCurrency(profitOutgoing)}
                          {outSale > 0 && (
                            <span className="text-xs font-normal ml-1">
                              ({((profitOutgoing / outSale) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {profitIncoming !== null && (
                      <div className="space-y-1.5 text-sm border-t border-neutral-100 pt-3">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          Aparelhos entrando
                        </p>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Custo total (valor dado)</span>
                          <span className="font-bold text-neutral-600">− {formatCurrency(totalTradeIn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Previsão de revenda</span>
                          <span className="font-bold text-neutral-900">{formatCurrency(totalResale)}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-neutral-100">
                          <span className="font-bold text-neutral-700">Lucro potencial de revenda</span>
                          <span className={cn('font-black', profitColor(profitIncoming))}>
                            {formatCurrency(profitIncoming)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="border-t-2 border-neutral-200 pt-3 space-y-1.5 text-sm">
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
                          Atenção: você está no prejuízo nesta operação!
                        </p>
                      )}
                      {totalProfit > 0 && (
                        <p className="text-xs text-green-700 font-bold bg-green-50 rounded-lg px-3 py-2">
                          Operação no lucro!
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          </div>} {/* ── fim etapa 2 ── */}

          {/* ══════════════════════════════════════════
              ETAPA 3 — Negociação
          ══════════════════════════════════════════ */}
          {wizardStep === 3 && <div className="space-y-6">

          {/* ─── Condições de Pagamento (venda/troca) ─── */}
          {form.sale_type !== 'prazo' && <div>
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
                            Math.abs(remainder) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700'
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

            {/* Per-product prices (venda/troca) — only visible when there are additional products */}
            {additionalItems.filter(i => i.selectedProduct).length > 0 && (
              <div className="mt-2 p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Valor por Produto</p>
                {/* Primary product */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-700 truncate">
                      Produto 1: {selectedProductData?.name || form.product_name_manual || '—'}
                    </p>
                    {selectedProductData?.purchase_price > 0 && (
                      <p className="text-[10px] text-neutral-400">Custo: {formatCurrency(selectedProductData.purchase_price)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number" step="any" inputMode="decimal"
                      className="w-28 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25 text-right"
                      value={form.sale_price_manual}
                      onChange={setF('sale_price_manual')}
                      placeholder="0,00"
                    />
                    {Number(form.sale_price_manual) > 0 && selectedProductData?.purchase_price > 0 && (
                      <span className={cn('text-xs font-black w-20 text-right', (Number(form.sale_price_manual) - selectedProductData.purchase_price) >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {formatCurrency(Number(form.sale_price_manual) - selectedProductData.purchase_price)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Additional products */}
                {additionalItems.filter(i => i.selectedProduct).map((item, idx) => {
                  const addProd = products.find((p: any) => p.id === item.selectedProduct);
                  const itemPrice = Number(item.price_override) || 0;
                  const itemCost = addProd?.purchase_price || 0;
                  const itemProfit = itemPrice > 0 && itemCost > 0 ? itemPrice - itemCost : null;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-700 truncate">
                          Produto {idx + 2}: {addProd?.name || 'Produto'}
                        </p>
                        {itemCost > 0 && (
                          <p className="text-[10px] text-neutral-400">Custo: {formatCurrency(itemCost)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number" step="any" inputMode="decimal"
                          className="w-28 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25 text-right"
                          value={item.price_override}
                          onChange={(e) => setAdditionalItems(prev => prev.map(i => i.id === item.id ? { ...i, price_override: e.target.value } : i))}
                          placeholder={addProd?.sale_price ? String(addProd.sale_price) : '0,00'}
                        />
                        {itemProfit !== null && (
                          <span className={cn('text-xs font-black w-20 text-right', itemProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {formatCurrency(itemProfit)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Totals row */}
                <div className="flex justify-between items-center border-t border-neutral-200 pt-2">
                  <span className="text-sm font-bold text-neutral-700">Total dos produtos</span>
                  <div className="flex items-center gap-4">
                    {(totalCost + additionalItemsCost) > 0 && (
                      <span className="text-xs text-neutral-400">
                        Custo: {formatCurrency(totalCost + additionalItemsCost)} ·
                        Lucro: {formatCurrency((Number(form.sale_price_manual) || 0) + additionalItemsTotal - totalCost - additionalItemsCost)}
                      </span>
                    )}
                    <span className="text-sm font-black text-neutral-900">
                      {formatCurrency((Number(form.sale_price_manual) || 0) + additionalItemsTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Valor recebido da maquininha — aparece quando Cartão de Crédito é selecionado */}
            {(form.payment_method === 'Cartão de Crédito' || (form.split_payment && form.payment2_method === 'Cartão de Crédito')) && (() => {
              const cardBase = form.split_payment
                ? (form.payment2_method === 'Cartão de Crédito' ? Number(form.payment2_amount) || 0 : Math.max(0, salePrice - (Number(form.payment2_amount) || 0)))
                : salePrice;
              const received = Number(form.card_received_amount) > 0 ? Number(form.card_received_amount) : cardBase;
              const discarded = Math.max(0, cardBase - received);
              return (
                <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-black text-neutral-700 uppercase tracking-widest mb-0.5">
                        Valor recebido da maquininha (R$)
                      </label>
                      <p className="text-[10px] text-neutral-500">
                        Digite o líquido creditado na sua conta — o restante é ignorado
                      </p>
                    </div>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder={cardBase > 0 ? String(cardBase) : '0'}
                      value={form.card_received_amount}
                      onChange={(e) => {
                        const rec = e.target.value;
                        const base = form.split_payment
                          ? (form.payment2_method === 'Cartão de Crédito' ? Number(form.payment2_amount) || 0 : Math.max(0, salePrice - (Number(form.payment2_amount) || 0)))
                          : salePrice;
                        const fee = Number(rec) > 0 && base > 0 ? String(Math.max(0, base - Number(rec)).toFixed(2)) : '';
                        setForm((f: any) => ({ ...f, card_received_amount: rec, card_fee_amount: fee, card_fee_pct: '' }));
                      }}
                      className="w-32 flex-shrink-0 bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25 text-right"
                    />
                  </div>
                  {discarded > 0 && cardBase > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200 text-xs text-center">
                      <div>
                        <p className="text-neutral-400 font-bold">Cobrado no cartão</p>
                        <p className="font-black text-neutral-900">{formatCurrency(cardBase)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold">Descartado (banco)</p>
                        <p className="font-black text-red-500">− {formatCurrency(discarded)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold">Você recebe</p>
                        <p className="font-black text-green-600">{formatCurrency(received)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Resumo da Negociação — aparece para venda e troca ── */}
            {salePrice > 0 && (() => {
              const tradeCredit = incomingDevices.reduce((s, d) => s + Number(d.purchase_price || 0), 0);
              const tradeResale = incomingDevices.reduce((s, d) => s + Number(d.sale_price || 0), 0);
              const tradeProfit = tradeResale - tradeCredit;
              const isTroca = form.sale_type === 'troca';
              const addlFiltered = additionalItems.filter(i => i.selectedProduct);
              const totalSaleAllProds = salePrice + additionalItemsTotal;
              const totalCostAllProds = totalCost + additionalItemsCost;
              const hasCostAll = totalCostAllProds > 0;
              const faturamento = totalSaleAllProds + (isTroca ? tradeCredit : 0);
              const lucroVenda = hasCostAll ? faturamento - totalCostAllProds - cardFee : null;
              const lucroTotal = lucroVenda !== null ? lucroVenda + (tradeResale > 0 ? tradeProfit : 0) : null;
              return (
                <div className="mt-3 border-2 border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Resumo da Negociação</p>
                  </div>
                  <div className="divide-y divide-neutral-100">

                    {/* Seu produto — o que você está vendendo */}
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        {addlFiltered.length > 0 ? 'Seus produtos' : 'Seu produto'}
                      </p>
                      {/* Per-product breakdown when multiple */}
                      {addlFiltered.length > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-600">Produto 1: {selectedProductData?.name || form.product_name_manual || '—'}</span>
                            <div className="text-right">
                              <span className="font-bold text-neutral-900">{formatCurrency(salePrice)}</span>
                              {selectedProductData?.purchase_price > 0 && (
                                <span className={cn('block text-[10px] font-bold', (salePrice - selectedProductData.purchase_price) >= 0 ? 'text-green-600' : 'text-red-500')}>
                                  Lucro: {formatCurrency(salePrice - selectedProductData.purchase_price)}
                                </span>
                              )}
                            </div>
                          </div>
                          {addlFiltered.map((item, idx) => {
                            const addProd = products.find((p: any) => p.id === item.selectedProduct);
                            const itemPrice = Number(item.price_override) || addProd?.sale_price || 0;
                            const itemCost = addProd?.purchase_price || 0;
                            return (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-neutral-600">Produto {idx + 2}: {addProd?.name || 'Produto'}</span>
                                <div className="text-right">
                                  <span className="font-bold text-neutral-900">{formatCurrency(itemPrice)}</span>
                                  {itemCost > 0 && itemPrice > 0 && (
                                    <span className={cn('block text-[10px] font-bold', (itemPrice - itemCost) >= 0 ? 'text-green-600' : 'text-red-500')}>
                                      Lucro: {formatCurrency(itemPrice - itemCost)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between text-sm font-bold border-t border-neutral-100 pt-1">
                            <span className="text-neutral-700">= Total dos produtos</span>
                            <span className="text-neutral-900">{formatCurrency(totalSaleAllProds)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">{isTroca ? 'Caixa recebido' : 'Preço de venda'}</span>
                          <span className="font-bold text-neutral-900">{formatCurrency(salePrice)}</span>
                        </div>
                      )}
                      {isTroca && tradeCredit > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">+ Crédito da troca</span>
                          <span className="font-bold text-neutral-900">+ {formatCurrency(tradeCredit)}</span>
                        </div>
                      )}
                      {isTroca && tradeCredit > 0 && (
                        <div className="flex justify-between text-sm border-t border-neutral-100 pt-1">
                          <span className="font-bold text-neutral-700">= Receita total</span>
                          <span className="font-bold text-neutral-900">{formatCurrency(faturamento)}</span>
                        </div>
                      )}
                      {hasCostAll ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">{additionalItemsCost > 0 ? 'Custo total dos produtos' : 'Custo do produto'}</span>
                          <span className="font-bold text-red-500">− {formatCurrency(totalCostAllProds)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400 italic">Custo não cadastrado</span>
                          <span className="text-neutral-300">—</span>
                        </div>
                      )}
                      {cardFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Taxa do cartão</span>
                          <span className="font-bold text-red-400">− {formatCurrency(cardFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-100">
                        <span className={lucroVenda !== null ? (lucroVenda >= 0 ? 'text-green-700' : 'text-red-600') : 'text-neutral-400'}>
                          {isTroca ? 'Lucro desta negociação' : 'Lucro da venda'}
                        </span>
                        <span className={lucroVenda !== null ? (lucroVenda >= 0 ? 'text-green-600' : 'text-red-600') : 'text-neutral-400'}>
                          {lucroVenda !== null ? formatCurrency(lucroVenda) : '—'}
                          {lucroVenda !== null && faturamento > 0 && (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                              {Math.round((lucroVenda / faturamento) * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Troca — aparelho do cliente (futura revenda) */}
                    {isTroca && tradeCredit > 0 && (
                      <div className="px-4 py-3 space-y-1.5">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Aparelho Recebido (estoque)</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Entra no estoque por</span>
                          <span className="font-bold text-neutral-700">{formatCurrency(tradeCredit)}</span>
                        </div>
                        {tradeResale > 0 ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-600">Previsão de revenda</span>
                              <span className="font-bold text-neutral-900">+ {formatCurrency(tradeResale)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-100">
                              <span className={tradeProfit >= 0 ? 'text-green-700' : 'text-red-600'}>Lucro potencial de revenda</span>
                              <span className={tradeProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(tradeProfit)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-400 italic">Previsão de revenda não informada</span>
                            <span className="text-neutral-300">—</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Totais */}
                    <div className="px-4 py-3 bg-neutral-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-neutral-800">
                          {isTroca && tradeResale > 0 ? 'Lucro total esperado (negociação + revenda)' : 'Lucro da operação'}
                        </span>
                        <span className={cn(
                          'text-xl font-black',
                          lucroTotal === null ? 'text-neutral-400' : lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {lucroTotal !== null ? formatCurrency(lucroTotal) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>}

          {/* ─── Condições a Prazo ─── */}
          {form.sale_type === 'prazo' && (
            <div className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-primary rounded-full flex-shrink-0" />
                <p className="text-xs font-black text-neutral-800 uppercase tracking-widest">Condições a Prazo</p>
              </div>

              {/* Valor dos produtos — per-product pricing */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-neutral-700">
                  {additionalItems.filter(i => i.selectedProduct).length > 0 ? 'Valor dos Produtos (R$) *' : 'Valor do Produto (R$) *'}
                </p>
                {/* Primary product */}
                <div className="bg-white border-2 border-primary/40 rounded-xl p-3 space-y-2">
                  {additionalItems.filter(i => i.selectedProduct).length > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-neutral-600 truncate">
                        Produto 1: {selectedProductData?.name || form.product_name_manual || '—'}
                      </p>
                      {selectedProductData?.purchase_price > 0 && (
                        <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-2">
                          Custo: {formatCurrency(selectedProductData.purchase_price)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={form.sale_price_manual}
                      onChange={setF('sale_price_manual')}
                      className="flex-1 bg-transparent text-sm font-bold outline-none focus:ring-0"
                      placeholder="Ex: 5000"
                    />
                    {Number(form.sale_price_manual) > 0 && selectedProductData?.purchase_price > 0 && additionalItems.filter(i => i.selectedProduct).length > 0 && (
                      <span className={cn('text-xs font-black flex-shrink-0', (Number(form.sale_price_manual) - selectedProductData.purchase_price) >= 0 ? 'text-green-600' : 'text-red-500')}>
                        Lucro: {formatCurrency(Number(form.sale_price_manual) - selectedProductData.purchase_price)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Additional products */}
                {additionalItems.filter(i => i.selectedProduct).map((item, idx) => {
                  const addProd = products.find((p: any) => p.id === item.selectedProduct);
                  const itemPrice = Number(item.price_override) || addProd?.sale_price || 0;
                  const itemCost = addProd?.purchase_price || 0;
                  const itemProfit = itemPrice > 0 && itemCost > 0 ? itemPrice - itemCost : null;
                  return (
                    <div key={item.id} className="bg-white border-2 border-primary/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-neutral-600 truncate">
                          Produto {idx + 2}: {addProd?.name || 'Produto'}
                        </p>
                        {itemCost > 0 && (
                          <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-2">
                            Custo: {formatCurrency(itemCost)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" step="any" inputMode="decimal"
                          value={item.price_override}
                          onChange={(e) => setAdditionalItems(prev => prev.map(i => i.id === item.id ? { ...i, price_override: e.target.value } : i))}
                          className="flex-1 bg-transparent text-sm font-bold outline-none focus:ring-0"
                          placeholder={addProd?.sale_price ? String(addProd.sale_price) : 'Valor de venda'}
                        />
                        {itemProfit !== null && (
                          <span className={cn('text-xs font-black flex-shrink-0', itemProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                            Lucro: {formatCurrency(itemProfit)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {additionalItems.filter(i => i.selectedProduct).length > 0 && (
                  <div className="flex justify-between text-sm font-bold px-1 pt-1">
                    <span className="text-neutral-700">Total dos produtos</span>
                    <span className="text-neutral-900">
                      {formatCurrency((Number(form.sale_price_manual) || 0) + additionalItemsTotal)}
                    </span>
                  </div>
                )}
              </div>

              {/* Breakdown: produto − troca − entrada = base parcelas */}
              {(() => {
                const prodPrice = (Number(form.sale_price_manual) || 0) + additionalItemsTotal;
                const tradeIn = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                const entrada = form.prazo_has_entrada ? Math.max(0, Number(form.prazo_entrada_value) || 0) : 0;
                const diff = Math.max(0, prodPrice - tradeIn - entrada);
                const cnt = Math.max(1, Number(form.prazo_count) || 1);
                const suggested = cnt > 0 ? diff / cnt : 0;
                if (prodPrice === 0 && tradeIn === 0) return null;
                return (
                  <div className="bg-white border border-neutral-200 rounded-xl p-3.5 space-y-2">
                    <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">Breakdown do Contrato</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Valor do produto</span>
                      <span className="font-bold text-neutral-900">{formatCurrency(prodPrice)}</span>
                    </div>
                    {tradeIn > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-700">Crédito da troca ({incomingDevices.filter(d => d.model.trim()).length}x aparelho)</span>
                        <span className="font-bold text-neutral-700">− {formatCurrency(tradeIn)}</span>
                      </div>
                    )}
                    {entrada > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-700 font-bold">Entrada</span>
                        <span className="font-bold text-amber-700">− {formatCurrency(entrada)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-neutral-200 pt-2">
                      <span className="text-neutral-900">Base para parcelas</span>
                      <span className="text-neutral-900">{formatCurrency(diff)}</span>
                    </div>
                    {suggested > 0 && (
                      <p className="text-xs text-neutral-600">
                        Sugestão: {cnt}x de {formatCurrency(suggested)}
                        {!Number(form.prazo_value) && (
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, prazo_value: String(Math.round(suggested * 100) / 100) }))}
                            className="ml-2 px-2 py-0.5 bg-primary/10 text-neutral-900 font-bold rounded-full hover:bg-primary/15 transition-colors"
                          >
                            Usar este valor
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Nº de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    inputMode="numeric"
                    value={form.prazo_count}
                    onChange={setF('prazo_count')}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Valor por Parcela (R$) *</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={form.prazo_value}
                    onChange={setF('prazo_value')}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="500,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">1º Vencimento *</label>
                  <input
                    type="date"
                    value={form.prazo_first_due}
                    onChange={setF('prazo_first_due')}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                    required={form.sale_type === 'prazo'}
                  />
                </div>
              </div>

              {/* Entrada (down payment) */}
              <div className="border border-neutral-200 rounded-xl p-3.5 space-y-3 bg-white">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.prazo_has_entrada}
                    onChange={(e) => setForm(f => ({ ...f, prazo_has_entrada: e.target.checked, prazo_entrada_value: '', prazo_entrada_due: '' }))}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-neutral-700">Cobrar entrada antes das parcelas</span>
                </label>
                {form.prazo_has_entrada && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Valor da Entrada (R$) *</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={form.prazo_entrada_value}
                        onChange={setF('prazo_entrada_value')}
                        className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
                        placeholder="Ex: 1000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Vencimento da Entrada *</label>
                      <input
                        type="date"
                        value={form.prazo_entrada_due}
                        onChange={setF('prazo_entrada_due')}
                        className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Data da venda */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Data da Operação</label>
                <input
                  type="datetime-local"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                  value={form.sale_date}
                  onChange={setF('sale_date')}
                />
              </div>

              {/* Preview do contrato — mostra breakdown completo */}
              {(Number(form.prazo_value) > 0 || Number(form.sale_price_manual) > 0) && Number(form.prazo_count) > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-black text-neutral-800 uppercase tracking-widest">Resumo do Contrato</p>

                  {(() => {
                    const primaryPrice = Number(form.sale_price_manual) || 0;
                    const addlFiltered = additionalItems.filter(i => i.selectedProduct);
                    if (primaryPrice <= 0 && additionalItemsTotal <= 0) return null;
                    if (addlFiltered.length === 0) {
                      return primaryPrice > 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Valor do produto</span>
                          <span className="font-bold">{formatCurrency(primaryPrice)}</span>
                        </div>
                      ) : null;
                    }
                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Produto 1: {selectedProductData?.name || form.product_name_manual || '—'}</span>
                          <span className="font-bold">{formatCurrency(primaryPrice)}</span>
                        </div>
                        {addlFiltered.map((item, idx) => {
                          const p = products.find((pr: any) => pr.id === item.selectedProduct);
                          const price = Number(item.price_override) || p?.sale_price || 0;
                          return (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-neutral-500">Produto {idx + 2}: {p?.name || 'Produto'}</span>
                              <span className="font-bold">{formatCurrency(price)}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm font-bold border-t border-neutral-100 pt-1">
                          <span className="text-neutral-700">Total dos produtos</span>
                          <span>{formatCurrency(primaryPrice + additionalItemsTotal)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const tradeIn = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                    if (tradeIn <= 0) return null;
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-700">Crédito da troca</span>
                        <span className="font-bold text-neutral-700">− {formatCurrency(tradeIn)}</span>
                      </div>
                    );
                  })()}

                  {form.prazo_has_entrada && Number(form.prazo_entrada_value) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-700 font-bold">Entrada {form.prazo_entrada_due ? `(${form.prazo_entrada_due.split('-').reverse().join('/')})` : ''}</span>
                      <span className="font-bold text-amber-700">{formatCurrency(Number(form.prazo_entrada_value))}</span>
                    </div>
                  )}

                  {Number(form.prazo_value) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Parcelas ({form.prazo_count}x){form.prazo_first_due ? ` · 1º em ${form.prazo_first_due.split('-').reverse().join('/')}` : ''}</span>
                      <span className="font-bold">{form.prazo_count}x de {formatCurrency(Number(form.prazo_value))}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm border-t border-neutral-100 pt-2">
                    <span className="font-bold text-neutral-700">Total da operação</span>
                    <span className="text-xl font-black text-neutral-900">
                      {(() => {
                        const cnt = Math.max(1, Number(form.prazo_count) || 1);
                        const entrada = form.prazo_has_entrada ? Math.max(0, Number(form.prazo_entrada_value) || 0) : 0;
                        const val = Number(form.prazo_value) > 0
                          ? Number(form.prazo_value)
                          : (() => {
                            const prodP = (Number(form.sale_price_manual) || 0) + additionalItemsTotal;
                            const tradeIn = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                            return Math.max(0, prodP - tradeIn - entrada) / cnt;
                          })();
                        const tradeIn = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                        return formatCurrency(entrada + cnt * val + tradeIn);
                      })()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-medium mt-2">
                    A receita entra no Financeiro conforme entrada e parcelas são marcadas como pagas.
                  </p>

                  {/* Lucro estimado no prazo */}
                  {(() => {
                    const prodPrice = (Number(form.sale_price_manual) || (selectedProductData?.sale_price || 0)) + additionalItemsTotal;
                    const totalCostAll = totalCost + additionalItemsCost;
                    const hasCostAll = totalCostAll > 0;
                    const tradeCredit = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                    const tradeResale = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.sale_price || 0), 0);
                    const tradeProfit = tradeResale - tradeCredit;
                    const lucroVenda = hasCostAll ? prodPrice - totalCostAll : null;
                    const lucroTotal = lucroVenda !== null ? lucroVenda + (tradeResale > 0 ? tradeProfit : 0) : null;
                    if (prodPrice === 0 && !hasCostAll) return null;
                    return (
                      <div className="mt-3 border border-neutral-200 rounded-xl overflow-hidden">
                        <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-100">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lucro da Operação</p>
                        </div>
                        <div className="px-3 py-2.5 space-y-1.5">
                          {prodPrice > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">{additionalItemsTotal > 0 ? 'Preço total dos produtos' : 'Preço do produto'}</span>
                              <span className="font-bold text-neutral-900">{formatCurrency(prodPrice)}</span>
                            </div>
                          )}
                          {hasCostAll && (
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">{additionalItemsCost > 0 ? 'Custo total dos produtos' : 'Custo do produto'}</span>
                              <span className="font-bold text-red-500">− {formatCurrency(totalCostAll)}</span>
                            </div>
                          )}
                          {tradeCredit > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">Crédito da troca dado</span>
                              <span className="font-bold text-neutral-700">− {formatCurrency(tradeCredit)}</span>
                            </div>
                          )}
                          {tradeResale > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">Previsão revenda troca</span>
                              <span className="font-bold text-neutral-700">+ {formatCurrency(tradeResale)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-black border-t border-neutral-100 pt-2">
                            <span className={lucroTotal === null ? 'text-neutral-400' : lucroTotal >= 0 ? 'text-green-700' : 'text-red-600'}>
                              Lucro estimado
                            </span>
                            <span className={lucroTotal === null ? 'text-neutral-400' : lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {lucroTotal !== null ? formatCurrency(lucroTotal) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Vendedor responsável — sempre visível */}
          <div className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-primary rounded-full flex-shrink-0" />
              <p className="text-xs font-black text-neutral-800 uppercase tracking-widest">Vendedor Responsável</p>
            </div>
            {sellers.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhum vendedor cadastrado.{' '}
                <a href="/vendedores" className="text-primary font-bold underline underline-offset-2 hover:opacity-80">
                  Cadastre na aba Vendedores
                </a>{' '}
                para metrificar vendas por vendedor.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[{ id: '', name: 'Sem atribuição', role: '' }, ...sellers].map((s: any) => (
                  <label
                    key={s.id || 'none'}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      form.rep_id === s.id
                        ? 'border-primary bg-primary/10'
                        : 'border-neutral-200 bg-white hover:border-primary/40'
                    )}
                  >
                    <input
                      type="radio"
                      name="rep_id"
                      value={s.id}
                      checked={form.rep_id === s.id}
                      onChange={() => setForm((f) => ({ ...f, rep_id: s.id }))}
                      className="hidden"
                    />
                    {s.id && s.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">{s.name}</p>
                      {s.role && <p className="text-[10px] text-neutral-400 truncate">{s.role}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          </div>} {/* ── fim etapa 3 ── */}

          {/* ══════════════════════════════════════════
              ETAPA 4 — Revisão Final
          ══════════════════════════════════════════ */}
          {wizardStep === 4 && (() => {
            const isPrazo = form.sale_type === 'prazo';
            const customerName = showNewCustomer ? newCustomer.name : (selectedCustomerData?.name || form.seller_name || '—');
            const customerPhone = showNewCustomer ? newCustomer.phone : (form.whatsapp_number || selectedCustomerData?.phone || '—');
            const customerCpf = showNewCustomer ? newCustomer.cpf : (form.customer_cpf || selectedCustomerData?.cpf || '—');
            const customerAddr = showNewCustomer ? newCustomer.address : (form.customer_city || selectedCustomerData?.city || '—');

            // Build all outgoing products list for review
            const allOutgoing = (() => {
              const primary = {
                name: selectedProductData?.name || form.product_name_manual || '—',
                imei: form.product_imei || selectedProductData?.imei || '—',
                capacity: form.product_capacity || selectedProductData?.product_capacity || '—',
                color: form.product_color || selectedProductData?.product_color || '—',
                condition: form.product_condition || 'Seminovo',
                price: isPrazo
                  ? (Number(form.sale_price_manual) || selectedProductData?.sale_price || 0)
                  : (Number(form.sale_price_manual) || selectedProductData?.sale_price || 0),
                cost: selectedProductData?.purchase_price || Number(form.product_cost_manual) || 0,
                pdf_type: form.pdf_type,
              };
              const addl = additionalItems.filter(i => i.selectedProduct).map(i => {
                const p = products.find((pr: any) => pr.id === i.selectedProduct);
                return {
                  name: p?.name || '—',
                  imei: i.imei_override || p?.imei || '—',
                  capacity: i.capacity_override || p?.product_capacity || '—',
                  color: i.color_override || p?.product_color || '—',
                  condition: (p?.product_condition || i.condition_override || 'Seminovo').replace(/ · Bateria:.*/, ''),
                  price: Number(i.price_override) || p?.sale_price || 0,
                  cost: p?.purchase_price || 0,
                  pdf_type: (() => {
                    const cond = (p?.product_condition || '').toLowerCase();
                    return (cond === 'novo' || cond.startsWith('novo ') || cond.startsWith('novo(')) ? 'novo' : 'seminovo';
                  })(),
                };
              });
              return [primary, ...addl];
            })();

            const totalPrice = allOutgoing.reduce((s, p) => s + p.price, 0);
            const totalCostR = allOutgoing.reduce((s, p) => s + p.cost, 0);
            const totalProfit = totalCostR > 0 ? totalPrice - totalCostR : null;

            const conditionLabel = (c: string) => {
              const lower = c.toLowerCase();
              if (lower === 'novo' || lower.startsWith('novo ') || lower.startsWith('novo(')) return 'Novo (lacrado)';
              return c;
            };

            return (
              <div className="space-y-5">
                {/* Warning banner */}
                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-amber-800">Confira tudo antes de confirmar</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Verifique estado, IMEI, condição e valores de cada produto. O PDF será gerado após confirmação.
                    </p>
                  </div>
                </div>

                {/* Cliente */}
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="bg-neutral-900 px-4 py-2">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Dados do Cliente</p>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div><span className="text-neutral-400 text-xs">Nome</span><p className="font-bold text-neutral-900">{customerName}</p></div>
                    <div><span className="text-neutral-400 text-xs">Telefone</span><p className="font-bold text-neutral-900">{customerPhone}</p></div>
                    <div><span className="text-neutral-400 text-xs">CPF/CNPJ</span><p className="font-bold text-neutral-900">{customerCpf}</p></div>
                    <div><span className="text-neutral-400 text-xs">Endereço</span><p className="font-bold text-neutral-900">{customerAddr}</p></div>
                  </div>
                </div>

                {/* Produtos */}
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="bg-neutral-900 px-4 py-2 flex items-center justify-between">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">
                      Produto{allOutgoing.length > 1 ? `s (${allOutgoing.length})` : ''}
                    </p>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Garantia: {form.pdf_type === 'novo' ? 'Fabricante (12m)' : 'Easy Imports (90d)'}</p>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {allOutgoing.map((p, i) => {
                      const isNovo = p.condition.toLowerCase() === 'novo' || p.condition.toLowerCase().startsWith('novo');
                      const condMismatch = (isNovo && form.pdf_type !== 'novo') || (!isNovo && form.pdf_type === 'novo' && allOutgoing.length === 1);
                      return (
                        <div key={i} className={cn('px-4 py-3 space-y-1.5', condMismatch ? 'bg-red-50' : '')}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-black text-sm text-neutral-900">{p.name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {p.imei && p.imei !== '—' && (
                                  <span className="text-xs text-neutral-500">IMEI: <span className="font-mono font-bold">{p.imei}</span></span>
                                )}
                                {p.capacity && p.capacity !== '—' && (
                                  <span className="text-xs text-neutral-500">Capacidade: <span className="font-bold">{p.capacity}</span></span>
                                )}
                                {p.color && p.color !== '—' && (
                                  <span className="text-xs text-neutral-500">Cor: <span className="font-bold">{p.color}</span></span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-neutral-900">{formatCurrency(p.price)}</p>
                              {p.cost > 0 && (
                                <p className={cn('text-xs font-bold', (p.price - p.cost) >= 0 ? 'text-green-600' : 'text-red-500')}>
                                  Lucro: {formatCurrency(p.price - p.cost)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full',
                              isNovo ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-700'
                            )}>
                              {conditionLabel(p.condition)}
                            </span>
                            {condMismatch && (
                              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Estado e tipo de garantia incompatíveis! Volte e corrija.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {allOutgoing.length > 1 && (
                    <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex justify-between text-sm font-bold">
                      <span className="text-neutral-700">Total dos produtos</span>
                      <div className="text-right">
                        <span className="text-neutral-900">{formatCurrency(totalPrice)}</span>
                        {totalProfit !== null && (
                          <span className={cn('block text-xs font-bold', totalProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                            Lucro total: {formatCurrency(totalProfit)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagamento */}
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="bg-neutral-900 px-4 py-2">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Pagamento</p>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {!isPrazo && (
                      <>
                        <div><span className="text-neutral-400 text-xs">Valor total</span><p className="font-black text-lg text-neutral-900">{formatCurrency((Number(form.sale_price_manual) || 0) + additionalItemsTotal)}</p></div>
                        <div><span className="text-neutral-400 text-xs">Forma</span><p className="font-bold text-neutral-900">{form.payment_method}</p></div>
                        <div><span className="text-neutral-400 text-xs">Data</span><p className="font-bold text-neutral-900">{new Date(form.sale_date).toLocaleDateString('pt-BR')}</p></div>
                        {form.payment_method === 'Cartão de Crédito' && form.installments > 1 && (
                          <div><span className="text-neutral-400 text-xs">Parcelamento</span><p className="font-bold text-neutral-900">{form.installments}x</p></div>
                        )}
                      </>
                    )}
                    {isPrazo && (() => {
                      const cnt = Math.max(1, Number(form.prazo_count) || 1);
                      const entrada = form.prazo_has_entrada ? Number(form.prazo_entrada_value) || 0 : 0;
                      const val = Number(form.prazo_value) || 0;
                      const tradeIn = incomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
                      return (
                        <>
                          <div><span className="text-neutral-400 text-xs">Total da operação</span><p className="font-black text-lg text-neutral-900">{formatCurrency(entrada + cnt * val + tradeIn)}</p></div>
                          <div><span className="text-neutral-400 text-xs">Parcelas</span><p className="font-bold text-neutral-900">{cnt}x de {formatCurrency(val)}</p></div>
                          <div><span className="text-neutral-400 text-xs">1º vencimento</span><p className="font-bold text-neutral-900">{form.prazo_first_due ? form.prazo_first_due.split('-').reverse().join('/') : '—'}</p></div>
                          {entrada > 0 && <div><span className="text-neutral-400 text-xs">Entrada</span><p className="font-bold text-amber-700">{formatCurrency(entrada)} em {form.prazo_entrada_due ? form.prazo_entrada_due.split('-').reverse().join('/') : '—'}</p></div>}
                          {tradeIn > 0 && <div><span className="text-neutral-400 text-xs">Crédito de troca</span><p className="font-bold text-neutral-900">{formatCurrency(tradeIn)}</p></div>}
                          <div><span className="text-neutral-400 text-xs">Data</span><p className="font-bold text-neutral-900">{new Date(form.sale_date).toLocaleDateString('pt-BR')}</p></div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Wizard navigation buttons ── */}
          <div className="flex gap-3 pt-4 border-t border-neutral-100 mt-4">
            {wizardStep === 1 ? (
              <Button variant="secondary" fullWidth onClick={() => { setIsModalOpen(false); setIsEditMode(false); setEditSaleId(null); }} type="button">
                Cancelar
              </Button>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => setWizardStep(w => w - 1)} type="button">
                ← Voltar
              </Button>
            )}

            {wizardStep < 4 ? (
              <Button
                fullWidth
                type="button"
                onClick={() => {
                  if (wizardStep === 1) {
                    const hasCustomer = form.selectedCustomer || (showNewCustomer && newCustomer.name.trim()) || form.seller_name.trim();
                    if (!hasCustomer) { toast.error('Informe o cliente para continuar.'); return; }
                  }
                  if (wizardStep === 2) {
                    const hasProduct = form.selectedProduct || form.product_name_manual.trim();
                    if (!hasProduct) { toast.error('Informe o produto para continuar.'); return; }
                  }
                  setWizardStep(w => w + 1);
                }}
              >
                {wizardStep === 3 ? '✓ Revisar' : 'Próximo →'}
              </Button>
            ) : (
              <Button
                fullWidth
                loading={isSaving}
                type="button"
                leftIcon={<CheckCircle2 size={18} />}
                onClick={() => handleCreateSale({ preventDefault: () => {} } as React.FormEvent)}
              >
                {isEditMode ? 'Salvar Alterações' : `Confirmar e Gerar PDF`}
              </Button>
            )}
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
                  <div className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                    Número de WhatsApp não informado. Copie o link abaixo e envie manualmente.
                  </div>
                )}

                {signLink && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(signLink);
                        toast.success('Link copiado!');
                      } catch {
                        const ta = document.createElement('textarea');
                        ta.value = signLink;
                        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
                        document.body.appendChild(ta);
                        ta.focus(); ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        toast.success('Link copiado!');
                      }
                    }}
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

      {/* ─── EDITAR VENDA MODAL (legacy — never opens; edit now reuses the create modal) ─── */}
      <Modal isOpen={false} onClose={() => setEditSale(null)} title="" maxWidth="2xl">
        {false && (
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
                <p className="mt-2 text-xs text-neutral-700 bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 font-medium">
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
                {(() => {
                  const isImeiLike = /^\d*$/.test(editForm.product_imei);
                  const isImei = isImeiLike && (editForm.product_imei.length === 0 || editForm.product_imei.length <= 15);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-neutral-700">IMEI / Número de Série</label>
                        {isImeiLike && editForm.product_imei.length > 0 && (
                          <span className={`text-xs font-mono ${editForm.product_imei.length === 15 ? 'text-primary font-bold' : 'text-neutral-500'}`}>
                            {editForm.product_imei.length}/15
                          </span>
                        )}
                      </div>
                      <input
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                        placeholder="IMEI (15 dígitos) ou Número de Série"
                        value={editForm.product_imei}
                        maxLength={isImei && isImeiLike ? 15 : undefined}
                        onChange={(e) => setEditForm((f: any) => ({ ...f, product_imei: e.target.value }))}
                        autoComplete="off"
                      />
                    </div>
                  );
                })()}
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
                  editForm.pdf_type === 'novo' ? 'border-primary bg-primary/10 shadow-sm' : 'border-neutral-200 bg-white hover:border-primary/40'
                )}>
                  <input type="radio" name="edit_pdf_type" value="novo" checked={editForm.pdf_type === 'novo'}
                    onChange={() => setEditForm((f: any) => ({ ...f, pdf_type: 'novo' }))} className="hidden" />
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      editForm.pdf_type === 'novo' ? 'border-primary' : 'border-neutral-300')}>
                      {editForm.pdf_type === 'novo' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm text-neutral-900">Aparelho Novo (Lacrado)</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-6.5">Garantia do Fabricante · 12 meses</p>
                </label>
                <label className={cn(
                  'flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                  editForm.pdf_type === 'seminovo' ? 'border-neutral-700 bg-neutral-100 shadow-sm' : 'border-neutral-200 bg-white hover:border-neutral-400'
                )}>
                  <input type="radio" name="edit_pdf_type" value="seminovo" checked={editForm.pdf_type === 'seminovo'}
                    onChange={() => setEditForm((f: any) => ({ ...f, pdf_type: 'seminovo' }))} className="hidden" />
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      editForm.pdf_type === 'seminovo' ? 'border-neutral-700' : 'border-neutral-300')}>
                      {editForm.pdf_type === 'seminovo' && <div className="w-2 h-2 rounded-full bg-neutral-700" />}
                    </div>
                    <span className="font-bold text-sm text-neutral-900">Seminovo / Usado</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-6.5">Garantia Easy Imports · 90 dias (CDC art. 26)</p>
                </label>
              </div>
            </div>

            {/* Aparelhos Entrando (troca e prazo) — idêntico ao painel de criação */}
            {(editForm.sale_type === 'troca' || editForm.sale_type === 'prazo') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-neutral-700 uppercase tracking-widest">
                    {editForm.sale_type === 'prazo' ? 'Aparelho na Troca (opcional)' : 'Aparelhos Entrando (do cliente)'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditIncomingDevices((prev) => [...prev, emptyTradeInDevice()])}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Plus size={13} /> Adicionar aparelho
                  </button>
                </div>

                {editIncomingDevices.map((device, idx) => (
                  <div key={idx} className="border border-neutral-200 bg-neutral-50/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-neutral-700">{idx + 1}</span>
                        </div>
                        <p className="text-xs font-bold text-neutral-700">
                          {deviceFormToProductName(device) || device.model || 'Aparelho sem modelo'}
                        </p>
                      </div>
                      {editIncomingDevices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditIncomingDevices((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover aparelho"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <DeviceForm
                      value={device}
                      onChange={(v) =>
                        setEditIncomingDevices((prev) =>
                          prev.map((d, i) => i === idx ? { ...d, ...v } : d)
                        )
                      }
                      purchasePriceLabel="Valor dado ao cliente (R$)"
                      purchasePriceRequired={false}
                      salePriceLabel="Previsão de revenda (R$) — opcional"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                      <Input
                        label="Número de Série"
                        placeholder="Ex: C02XG2YJHV2Q"
                        value={device.serial}
                        onChange={(e) =>
                          setEditIncomingDevices((prev) =>
                            prev.map((d, i) => i === idx ? { ...d, serial: e.target.value } : d)
                          )
                        }
                        autoComplete="off"
                      />
                      <Input
                        label="E-mail da Conta (iCloud/Google)"
                        placeholder="Ex: joao@icloud.com"
                        value={device.account_email}
                        onChange={(e) =>
                          setEditIncomingDevices((prev) =>
                            prev.map((d, i) => i === idx ? { ...d, account_email: e.target.value } : d)
                          )
                        }
                        autoComplete="off"
                      />
                    </div>
                  </div>
                ))}

                <p className="text-xs text-neutral-500 pl-1">
                  {editForm.sale_type === 'prazo'
                    ? 'O aparelho entra no estoque e o crédito dado ao cliente reduz o valor contratado.'
                    : 'Todos os aparelhos serão adicionados automaticamente ao seu estoque.'
                  }
                </p>
              </div>
            )}

            {/* ── PRAZO: condições a prazo (idêntico ao painel de criação) ── */}
            {editForm.sale_type === 'prazo' && (() => {
              const productPrice = Number(editForm.sale_price_manual) || 0;
              const tradeIn = editIncomingDevices.filter(d => d.model.trim()).reduce((s, d) => s + Number(d.purchase_price || 0), 0);
              const editEntrada = editForm.prazo_has_entrada ? Math.max(0, Number(editForm.prazo_entrada_value) || 0) : 0;
              const financing = Math.max(0, productPrice - tradeIn - editEntrada);
              const count = Math.max(1, Number(editForm.prazo_count) || 1);
              const autoValue = count > 0 ? financing / count : 0;
              const instValue = Number(editForm.prazo_value) > 0 ? Number(editForm.prazo_value) : autoValue;
              return (
                <div className="border-2 border-neutral-200 bg-primary/5 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-primary rounded-full flex-shrink-0" />
                    <p className="text-xs font-black text-neutral-700 uppercase tracking-widest">Condições a Prazo</p>
                  </div>

                  {/* Valor do produto */}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Valor do Produto (R$) *</label>
                    <input type="number" min="0" step="any" inputMode="decimal" required
                      className="w-full bg-white border-2 border-primary/40 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                      value={editForm.sale_price_manual}
                      onChange={(e) => setEditForm((f: any) => ({ ...f, sale_price_manual: e.target.value, total_amount: e.target.value }))}
                      placeholder="Ex: 5000"
                    />
                  </div>

                  {/* Breakdown do Contrato */}
                  {(productPrice > 0 || tradeIn > 0) && (
                    <div className="bg-white border border-neutral-200 rounded-xl p-3.5 space-y-2">
                      <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Breakdown do Contrato</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Valor do produto</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(productPrice)}</span>
                      </div>
                      {tradeIn > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-700">Crédito da troca</span>
                          <span className="font-bold text-neutral-700">− {formatCurrency(tradeIn)}</span>
                        </div>
                      )}
                      {editEntrada > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-700 font-bold">Entrada</span>
                          <span className="font-bold text-amber-700">− {formatCurrency(editEntrada)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t border-neutral-200 pt-2">
                        <span className="text-neutral-700">Base para parcelas</span>
                        <span className="text-neutral-700">{formatCurrency(financing)}</span>
                      </div>
                      {autoValue > 0 && (
                        <p className="text-xs text-neutral-500">
                          Sugestão: {count}x de {formatCurrency(autoValue)}
                          {!Number(editForm.prazo_value) && (
                            <button type="button"
                              onClick={() => setEditForm((f: any) => ({ ...f, prazo_value: String(Math.round(autoValue * 100) / 100) }))}
                              className="ml-2 px-2 py-0.5 bg-primary/10 text-neutral-700 font-bold rounded-full hover:bg-primary/15 transition-colors"
                            >
                              Usar este valor
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Parcelas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Nº de Parcelas</label>
                      <input type="number" min="1" max="60" inputMode="numeric"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
                        value={editForm.prazo_count}
                        onChange={(e) => {
                          const c = e.target.value;
                          const newCount = Math.max(1, Number(c) || 1);
                          const newAuto = financing > 0 && newCount > 0 ? financing / newCount : 0;
                          setEditForm((f: any) => ({ ...f, prazo_count: c, prazo_value: newAuto > 0 && !f._prazo_value_manual ? String(Math.round(newAuto * 100) / 100) : f.prazo_value }));
                        }}
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Valor por Parcela (R$) *</label>
                      <input type="number" min="0" step="any" inputMode="decimal"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
                        value={editForm.prazo_value}
                        onChange={(e) => setEditForm((f: any) => ({ ...f, prazo_value: e.target.value, _prazo_value_manual: true }))}
                        placeholder={autoValue > 0 ? String(Math.round(autoValue * 100) / 100) : '500,00'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-1.5">1º Vencimento *</label>
                      <input type="date"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                        value={editForm.prazo_first_due}
                        onChange={setEF('prazo_first_due')}
                      />
                    </div>
                  </div>

                  {/* Entrada (down payment) */}
                  <div className="border border-neutral-200 rounded-xl p-3.5 space-y-3 bg-white">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editForm.prazo_has_entrada}
                        onChange={(e) => setEditForm((f: any) => ({ ...f, prazo_has_entrada: e.target.checked, prazo_entrada_value: '', prazo_entrada_due: '' }))}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-neutral-700">Cobrar entrada antes das parcelas</span>
                    </label>
                    {editForm.prazo_has_entrada && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Valor da Entrada (R$) *</label>
                          <input type="number" step="any" inputMode="decimal"
                            value={editForm.prazo_entrada_value || ''}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, prazo_entrada_value: e.target.value }))}
                            className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
                            placeholder="Ex: 1000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Vencimento da Entrada *</label>
                          <input type="date"
                            value={editForm.prazo_entrada_due || ''}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, prazo_entrada_due: e.target.value }))}
                            className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Data da operação */}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Data da Operação</label>
                    <input type="datetime-local"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                      value={editForm.sale_date} onChange={setEF('sale_date')}
                    />
                  </div>

                  {/* Resumo do Contrato */}
                  {(instValue > 0 || productPrice > 0) && count > 0 && (
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-black text-neutral-700 uppercase tracking-widest">Resumo do Contrato</p>
                      {productPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Valor do produto</span>
                          <span className="font-bold">{formatCurrency(productPrice)}</span>
                        </div>
                      )}
                      {tradeIn > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-700">Crédito da troca</span>
                          <span className="font-bold text-neutral-700">− {formatCurrency(tradeIn)}</span>
                        </div>
                      )}
                      {editEntrada > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-700 font-bold">Entrada {editForm.prazo_entrada_due ? `(${editForm.prazo_entrada_due.split('-').reverse().join('/')})` : ''}</span>
                          <span className="font-bold text-amber-700">{formatCurrency(editEntrada)}</span>
                        </div>
                      )}
                      {instValue > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Parcelas ({editForm.prazo_count}x){editForm.prazo_first_due ? ` · 1º em ${editForm.prazo_first_due.split('-').reverse().join('/')}` : ''}</span>
                          <span className="font-bold">{editForm.prazo_count}x de {formatCurrency(instValue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t border-neutral-100 pt-2">
                        <span className="font-bold text-neutral-700">Total da operação</span>
                        <span className="text-xl font-black text-neutral-900">
                          {formatCurrency(editEntrada + count * instValue + tradeIn)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 font-medium mt-2">
                        A receita entra no Financeiro conforme entrada e parcelas são marcadas como pagas.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pagamento (apenas venda e troca) */}
            {editForm.sale_type !== 'prazo' && (
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
            )}

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
                const tradeInValue = Number(detailSale.incoming_purchase_price || 0);
                const faturamento = Number(detailSale.total_amount);
                const cashOnly = faturamento - tradeInValue;
                const lucroVenda = dcost !== null ? faturamento - dcost : null;
                // Previsão de revenda do aparelho recebido (salva no incoming_devices_json)
                const storedDevs: any[] = (() => { try { return JSON.parse(detailSale.incoming_devices_json || '[]'); } catch { return []; } })();
                const resaleEstimate = Number(storedDevs[0]?.sale_price || 0);
                const lucroTroca = resaleEstimate > 0 ? resaleEstimate - tradeInValue : null;
                const lucroTotal = lucroVenda !== null ? lucroVenda + (lucroTroca ?? 0) : null;

                return (
                  <div className="space-y-3">
                    {/* Parte 1: Venda */}
                    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                      <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-wider">Parte 1 — Aparelho que saiu</p>
                        <span className="text-[10px] font-bold text-neutral-400">Realizado</span>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Produto</p>
                            <p className="text-sm font-semibold text-neutral-900">{detailSale.product_name}</p>
                          </div>
                          {dcost !== null && (
                            <span className="text-sm font-black text-red-500">− {formatCurrency(dcost)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Faturamento</p>
                            <p className="text-xs text-neutral-500">Preço cheio do produto</p>
                          </div>
                          <span className="text-sm font-black text-neutral-900">+ {formatCurrency(faturamento)}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Recebimento em caixa</p>
                            <p className="text-xs text-neutral-500">{detailSale.payment_method || 'Dinheiro'} (excl. troca)</p>
                          </div>
                          <span className="text-sm font-bold text-neutral-500">{formatCurrency(cashOnly)}</span>
                        </div>
                        {lucroVenda !== null && (
                          <div className={cn('flex items-center justify-between px-4 py-3', lucroVenda >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                            <p className={cn('text-xs font-black uppercase tracking-wide', lucroVenda >= 0 ? 'text-green-700' : 'text-red-600')}>
                              Lucro da venda
                            </p>
                            <span className={cn('text-sm font-black', lucroVenda >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {lucroVenda >= 0 ? '+' : ''}{formatCurrency(lucroVenda)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parte 2: Troca (aparelho recebido) */}
                    {detailSale.incoming_name?.trim() && (
                      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                        <div className="bg-neutral-700 text-white px-4 py-2.5 flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-wider">Parte 2 — Aparelho recebido</p>
                          <span className="text-[10px] font-bold text-neutral-400">
                            {resaleEstimate > 0 ? 'Potencial' : 'Em estoque'}
                          </span>
                        </div>
                        <div className="divide-y divide-neutral-100">
                          <div className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Aparelho</p>
                              <p className="text-sm font-semibold text-neutral-900">{detailSale.incoming_name}</p>
                            </div>
                            <span className="text-sm font-black text-red-500">− {formatCurrency(tradeInValue)}</span>
                          </div>
                          {resaleEstimate > 0 ? (
                            <>
                              <div className="flex items-center justify-between px-4 py-3">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Previsão de revenda</p>
                                <span className="text-sm font-black text-primary">+ {formatCurrency(resaleEstimate)}</span>
                              </div>
                              <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
                                <p className="text-xs font-black text-neutral-700 uppercase tracking-wide">Lucro potencial da troca</p>
                                <span className={cn('text-sm font-black', lucroTroca! >= 0 ? 'text-neutral-900' : 'text-red-600')}>
                                  {lucroTroca! >= 0 ? '+' : ''}{formatCurrency(lucroTroca!)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between px-4 py-3">
                              <p className="text-xs text-neutral-400">Previsão de revenda não definida</p>
                              <span className="text-xs text-neutral-300">—</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Total da operação */}
                    {lucroTotal !== null && (
                      <div className={cn('flex items-center justify-between px-4 py-3.5 rounded-2xl border', lucroTotal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                        <div>
                          <p className={cn('text-xs font-black uppercase tracking-wider', lucroTotal >= 0 ? 'text-green-700' : 'text-red-700')}>
                            {lucroTroca !== null ? 'Lucro total da operação' : 'Lucro da venda'}
                          </p>
                          {lucroTroca !== null && (
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              Venda {formatCurrency(lucroVenda!)} + Troca {formatCurrency(lucroTroca)}
                            </p>
                          )}
                        </div>
                        <span className={cn('text-xl font-black', lucroTotal >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {lucroTotal >= 0 ? '+' : ''}{formatCurrency(lucroTotal)}
                        </span>
                      </div>
                    )}
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
                ['Responsável', detailSale.rep_seller_name],
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

            {/* Prazo installments in detail modal */}
            {detailSale.sale_type === 'prazo' && (() => {
              const dInsts: any[] = (() => { try { return JSON.parse(detailSale.installments_json || '[]'); } catch { return []; } })();
              const dToday = new Date().toISOString().slice(0, 10);
              const dPaid = dInsts.filter((i: any) => i.paid_at).length;
              return (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-black text-neutral-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={12} /> Parcelas a Prazo
                    </p>
                    {dInsts.length > 0 && (
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                        dPaid === dInsts.length ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-neutral-700'
                      )}>
                        {dPaid}/{dInsts.length} recebidas
                      </span>
                    )}
                  </div>

                  {!detailSale.installments_json ? (
                    <div className="flex items-start gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                      <span className="text-neutral-500 flex-shrink-0">⚠️</span>
                      <p className="text-xs text-neutral-800 font-medium">
                        Dados de parcelas não salvos. Execute a migração SQL em <strong>Configurações → Banco de Dados</strong> e recrie esta venda.
                      </p>
                    </div>
                  ) : (
                    <>
                      {dInsts.map((inst: any, i: number) => {
                        const isPaid = !!inst.paid_at;
                        const isOverdue = !isPaid && inst.due < dToday;
                        const markKey = `detail-${detailSale.id}-${i}`;
                        return (
                          <div key={i} className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                            isPaid ? 'bg-green-50 border border-green-200' : isOverdue ? 'bg-red-50 border border-red-200' : 'bg-white border border-neutral-200'
                          )}>
                            <span className={cn('text-xs font-black w-5 flex-shrink-0', isPaid ? 'text-green-700' : isOverdue ? 'text-red-600' : 'text-neutral-700')}>
                              {inst.n}
                            </span>
                            <span className="text-xs text-neutral-500 flex-shrink-0 w-20">{inst.due.split('-').reverse().join('/')}</span>
                            <span className="font-bold text-neutral-800 text-sm flex-1">{formatCurrency(inst.amount)}</span>
                            {isPaid ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} /> {inst.paid_at.split('-').reverse().join('/')}
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  await handleMarkPaid(detailSale, i);
                                  setDetailSale((prev: any) => {
                                    if (!prev) return prev;
                                    const insts = JSON.parse(prev.installments_json || '[]');
                                    const upd = insts.map((x: any, idx: number) => idx === i ? { ...x, paid_at: new Date().toISOString().slice(0, 10) } : x);
                                    return { ...prev, installments_json: JSON.stringify(upd) };
                                  });
                                }}
                                disabled={markingPaid === markKey || markingPaid === `${detailSale.id}-${i}`}
                                className={cn(
                                  'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors text-white',
                                  isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-900 hover:bg-neutral-800',
                                  (markingPaid === markKey || markingPaid === `${detailSale.id}-${i}`) && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                <CheckCircle2 size={11} />
                                {isOverdue ? 'Atrasada — Receber' : 'Receber'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200 text-xs font-bold text-neutral-800">
                        <span>Total do contrato</span>
                        <span>{formatCurrency(dInsts.reduce((s: number, i: any) => s + i.amount, 0))}</span>
                      </div>
                      {dPaid > 0 && (
                        <div className="flex items-center justify-between text-xs text-green-700 font-bold">
                          <span>Já recebido</span>
                          <span>{formatCurrency(dInsts.filter((i: any) => i.paid_at).reduce((s: number, i: any) => s + i.amount, 0))}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {/* Signature status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold',
                detailSale.signature_client ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600')}>
                {detailSale.signature_client ? <CheckCircle2 size={13} /> : <Package size={13} />}
                {detailSale.signature_client ? 'Cliente assinou' : 'Aguardando assinatura do cliente'}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-1 border-t border-neutral-100 space-y-2">
              {/* Primary CTA */}
              <button
                onClick={() => handleGeneratePDF(detailSale)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-700 active:scale-[.98] text-white font-black text-sm transition-all shadow-sm"
              >
                <Download size={17} />
                Gerar PDF do Contrato
              </button>

              {/* Secondary row */}
              <div className="grid grid-cols-2 gap-2">
                {detailSale.sign_token && (detailSale.customer_phone || detailSale.seller_phone) ? (
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
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[.98] text-white font-bold text-sm transition-all"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => handleCopySignLink(detailSale)}
                  className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[.98] text-neutral-700 font-bold text-sm transition-all"
                >
                  <Link2 size={15} />
                  Copiar Link
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Vendas;
