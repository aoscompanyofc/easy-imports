import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Search, Calendar, User, Package, CheckCircle2, DollarSign, Trash2, Paperclip, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate, formatDateTime } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

export const Vendas: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sale Form State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 16));

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [salesData, custData, prodData] = await Promise.all([
        dataService.getSales(),
        dataService.getCustomers(),
        dataService.getProducts()
      ]);
      setSales(salesData || []);
      setCustomers(custData || []);
      setProducts((prodData || []).filter((p: any) => p.stock_quantity > 0 && !p.deleted));
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedProduct) {
      toast.error('Selecione um cliente e um produto');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    if (quantity > product.stock_quantity) {
      toast.error(`Estoque insuficiente. Disponível: ${product.stock_quantity}`);
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);

    try {
      setIsSaving(true);
      await dataService.addSale(
        {
          customer_id: selectedCustomer,
          customer_name: customer?.name || 'Cliente',
          product_name: product.name,
          total_amount: product.sale_price * quantity,
          payment_method: paymentMethod,
          status: 'completed',
          created_at: new Date(saleDate).toISOString()
        },
        [{ product_id: selectedProduct, quantity, unit_price: product.sale_price }]
      );

      toast.success('✅ Venda registrada com sucesso!');
      setIsModalOpen(false);
      setSelectedProduct('');
      setSelectedCustomer('');
      setQuantity(1);
      setSaleDate(new Date().toISOString().slice(0, 16));
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao realizar venda: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (confirm('Deseja realmente cancelar e remover esta venda? Os valores e o estoque não serão estornados automaticamente nesta versão.')) {
      try {
        await dataService.deleteSale(id);
        toast.success('Venda removida com sucesso!');
        fetchData();
      } catch (error: any) {
        toast.error('Erro ao remover venda: ' + error.message);
      }
    }
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const saleTotal = selectedProductData ? selectedProductData.sale_price * quantity : 0;
  const saleCost = selectedProductData ? (selectedProductData.purchase_price || 0) * quantity : 0;
  const saleProfit = saleTotal - saleCost;
  const saleMargin = saleTotal > 0 ? (saleProfit / saleTotal) * 100 : 0;

  const hasActiveFilters = searchTerm || dateFrom || dateTo;

  const filteredSales = sales.filter(s => {
    const matchesSearch = !searchTerm || s.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFrom = !dateFrom || new Date(s.created_at) >= new Date(dateFrom);
    const matchesTo = !dateTo || new Date(s.created_at) <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesFrom && matchesTo;
  });

  const columns = [
    { header: 'ID', accessor: (s: any) => <span className="text-xs font-mono text-neutral-400">#{s.id?.slice(0, 8)}</span> },
    { header: 'Cliente', accessor: (s: any) => <span className="font-bold">{s.customers?.name || 'Cliente Avulso'}</span> },
    { header: 'Data', accessor: (s: any) => formatDate(s.created_at) },
    { header: 'Pagamento', accessor: 'payment_method' },
    { header: 'Total', accessor: (s: any) => <span className="font-bold text-primary-700">{formatCurrency(s.total_amount)}</span> },
    { header: 'Status', accessor: () => <Badge variant="success">Finalizado</Badge> },
    { header: 'Ações', accessor: (s: any) => (
      <Button variant="danger" size="sm" iconOnly onClick={() => handleDeleteSale(s.id)}>
        <Trash2 size={14} />
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Vendas</h2>
          <p className="text-neutral-500">Gestão de pedidos e faturamento</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Nova Venda
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar venda por cliente ou ID..."
            leftIcon={<Search size={20} />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant={dateFrom || dateTo ? 'primary' : 'secondary'}
          leftIcon={<Calendar size={20} />}
          onClick={() => setIsPeriodModalOpen(true)}
        >
          {dateFrom || dateTo ? 'Período ativo' : 'Filtrar Período'}
        </Button>
        {hasActiveFilters && (
          <Button variant="secondary" iconOnly onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}>
            <X size={20} />
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-sm text-neutral-500">
          Mostrando {filteredSales.length} de {sales.length} vendas
        </p>
      )}

      <Table columns={columns} data={filteredSales} isLoading={isLoading} emptyMessage="Nenhuma venda registrada ainda." />

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
            <Button fullWidth onClick={() => { setIsPeriodModalOpen(false); toast.success('Período aplicado!'); }}>
              Aplicar Filtro
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nova Venda" maxWidth="lg">
        <form onSubmit={handleCreateSale} className="space-y-5">
          {/* Customer */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-2">
              <User size={16} /> Cliente
            </label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
            >
              <option value="">Selecione o cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-warning mt-1">⚠️ Nenhum cliente cadastrado. <a href="/clientes" className="underline">Cadastre um cliente primeiro.</a></p>
            )}
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-2">
              <Package size={16} /> Produto em Estoque
            </label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
            >
              <option value="">Selecione o produto disponível...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.sale_price)} ({p.stock_quantity} em estoque)
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p className="text-xs text-warning mt-1">⚠️ Nenhum produto em estoque. <a href="/estoque" className="underline">Cadastre produtos primeiro.</a></p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantidade"
              type="number"
              min="1"
              max={selectedProductData?.stock_quantity || 999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Método de Pagamento</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>
          </div>

          {/* Date Field for Retroactive Sales */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-2">
              <Calendar size={16} /> Data e Hora da Venda
            </label>
            <input
              type="datetime-local"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
            />
            <p className="text-[11px] text-neutral-400 mt-1">Você pode inserir uma data passada para vendas retroativas.</p>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5 flex items-center gap-2">
              <Paperclip size={16} /> Anexar Documento / Recibo
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer bg-neutral-50 border border-neutral-200 border-dashed rounded-lg px-4 py-2.5 text-sm text-center text-neutral-500 hover:bg-neutral-100 transition-all">
                <span>Clique para anexar arquivo PDF/Imagem</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => {
                  if(e.target.files && e.target.files[0]) toast.success('Documento anexado localmente.');
                }} />
              </label>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Opcional. Ex: Comprovante de Pix, Recibo assinado.</p>
          </div>

          {/* Sale Preview */}
          {selectedProduct && (
            <Card className="bg-primary-50/30 border-primary-100 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Total da Venda:</span>
                <span className="text-2xl font-bold text-primary-900">{formatCurrency(saleTotal)}</span>
              </div>
              {saleCost > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Custo do Produto:</span>
                    <span className="text-danger font-semibold">- {formatCurrency(saleCost)}</span>
                  </div>
                  <div className="h-px bg-primary-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-700">Lucro desta venda:</span>
                    <span className="font-bold text-success">{formatCurrency(saleProfit)} ({saleMargin.toFixed(1)}%)</span>
                  </div>
                </>
              )}
            </Card>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit" leftIcon={<CheckCircle2 size={20} />}>
              Finalizar Venda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vendas;
