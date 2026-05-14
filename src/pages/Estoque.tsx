import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, Filter, Trash2, Edit2, X, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

const CATEGORIES = ['Todas', 'iPhone', 'iPad', 'MacBook', 'Watch', 'AirPods', 'Samsung', 'Xiaomi', 'Games'];

const emptyForm = {
  name: '',
  category: 'iPhone',
  sku: '',
  imei: '',
  purchase_price: '',
  sale_price: '',
  stock_quantity: '1',
  status: 'available'
};

export const Estoque: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getProducts();
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar estoque: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await dataService.addProduct({
        ...formData,
        purchase_price: Number(formData.purchase_price),
        sale_price: Number(formData.sale_price),
        stock_quantity: Number(formData.stock_quantity)
      });
      toast.success('Produto adicionado ao estoque!');
      setIsModalOpen(false);
      setFormData(emptyForm);
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setIsSaving(true);
      await dataService.updateProduct(editingProduct.id, {
        ...editFormData,
        purchase_price: Number(editFormData.purchase_price),
        sale_price: Number(editFormData.sale_price),
        stock_quantity: Number(editFormData.stock_quantity)
      });
      toast.success('Produto atualizado!');
      setIsEditModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name || '',
      category: product.category || 'iPhone',
      sku: product.sku || '',
      imei: product.imei || '',
      purchase_price: String(product.purchase_price || ''),
      sale_price: String(product.sale_price || ''),
      stock_quantity: String(product.stock_quantity || '1'),
      status: product.status || 'available'
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este produto do estoque?')) {
      try {
        await dataService.deleteProduct(id);
        toast.success('Produto removido!');
        fetchProducts();
      } catch (error: any) {
        toast.error('Erro ao remover: ' + error.message);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.imei?.includes(searchTerm);
    const matchesCategory = filterCategory === 'Todas' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const profit = (Number(formData.sale_price) || 0) - (Number(formData.purchase_price) || 0);
  const marginPercent = Number(formData.sale_price) > 0 ? (profit / Number(formData.sale_price)) * 100 : 0;

  const editProfit = (Number(editFormData.sale_price) || 0) - (Number(editFormData.purchase_price) || 0);
  const editMarginPercent = Number(editFormData.sale_price) > 0 ? (editProfit / Number(editFormData.sale_price)) * 100 : 0;

  const hasActiveFilters = filterCategory !== 'Todas' || searchTerm;

  const columns = [
    { header: 'Produto', accessor: (p: any) => (
      <div className="flex flex-col">
        <span className="font-bold text-neutral-900">{p.name}</span>
        <span className="text-xs text-neutral-400">{p.sku || 'Sem SKU'}</span>
      </div>
    )},
    { header: 'IMEI/Serial', accessor: (p: any) => (
      <span className="font-mono text-xs">{p.imei || '-'}</span>
    )},
    { header: 'Venda', accessor: (p: any) => (
      <span className="font-bold text-primary-700">{formatCurrency(p.sale_price)}</span>
    )},
    { header: 'Qtd', accessor: (p: any) => (
      <div className="flex items-center gap-2">
        <span className={p.stock_quantity <= 2 ? 'text-danger font-bold' : ''}>
          {p.stock_quantity}
        </span>
        {p.stock_quantity <= 2 && <Badge variant="danger" size="sm">Baixo</Badge>}
      </div>
    )},
    { header: 'Ações', accessor: (p: any) => (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" iconOnly onClick={() => handleOpenEdit(p)}><Edit2 size={14} /></Button>
        <Button variant="danger" size="sm" iconOnly onClick={() => handleDelete(p.id)}><Trash2 size={14} /></Button>
      </div>
    )},
  ];

  const ProductForm = ({ data, setData, onSubmit, submitLabel }: { data: typeof emptyForm; setData: (d: typeof emptyForm) => void; onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => {
    const p = (Number(data.sale_price) || 0) - (Number(data.purchase_price) || 0);
    const m = Number(data.sale_price) > 0 ? (p / Number(data.sale_price)) * 100 : 0;
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Nome do Produto" placeholder="Ex: iPhone 15 Pro Max 256GB" required value={data.name} onChange={e => setData({...data, name: e.target.value})} />
          </div>
          <Input label="SKU / Código" placeholder="IP15PM-256" value={data.sku} onChange={e => setData({...data, sku: e.target.value})} />
          <Input label="IMEI / Serial" placeholder="Opcional" value={data.imei} onChange={e => setData({...data, imei: e.target.value})} />
          <Input label="Preço de Custo (R$)" type="number" step="0.01" required value={data.purchase_price} onChange={e => setData({...data, purchase_price: e.target.value})} />
          <Input label="Preço de Venda (R$)" type="number" step="0.01" required value={data.sale_price} onChange={e => setData({...data, sale_price: e.target.value})} />
          <Input label="Quantidade em Estoque" type="number" required value={data.stock_quantity} onChange={e => setData({...data, stock_quantity: e.target.value})} />
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
            <select className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
              {CATEGORIES.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {(data.purchase_price && data.sale_price) && (
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-600">Projeção de Margem:</span>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-900">{formatCurrency(p)} de lucro</p>
                <p className="text-xs font-bold text-success">{m.toFixed(1)}% de margem</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} type="button">Cancelar</Button>
          <Button fullWidth loading={isSaving} type="submit">{submitLabel}</Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Estoque</h2>
          <p className="text-neutral-500">Controle de produtos e equipamentos</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Nova Compra / Aparelho
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, SKU ou IMEI..."
            leftIcon={<Search size={20} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Button
            variant={filterCategory !== 'Todas' ? 'primary' : 'secondary'}
            leftIcon={<Filter size={20} />}
            onClick={() => setIsCategoryOpen(v => !v)}
          >
            {filterCategory !== 'Todas' ? filterCategory : 'Filtros'}
            <ChevronDown size={16} className="ml-1" />
          </Button>
          {isCategoryOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-10 py-1 min-w-[160px]">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 transition-colors ${filterCategory === cat ? 'font-bold text-primary' : 'text-neutral-700'}`}
                  onClick={() => { setFilterCategory(cat); setIsCategoryOpen(false); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="secondary" iconOnly onClick={() => { setFilterCategory('Todas'); setSearchTerm(''); }}>
            <X size={20} />
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-sm text-neutral-500">
          Mostrando {filteredProducts.length} de {products.length} produtos
        </p>
      )}

      <Table
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        emptyMessage="Nenhum produto cadastrado no estoque."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Compra de Aparelho" maxWidth="lg">
        <ProductForm data={formData} setData={setFormData} onSubmit={handleSave} submitLabel="Salvar Compra no Estoque" />
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Produto" maxWidth="lg">
        <ProductForm data={editFormData} setData={setEditFormData} onSubmit={handleEditSave} submitLabel="Salvar Alterações" />
      </Modal>
    </div>
  );
};

export default Estoque;
