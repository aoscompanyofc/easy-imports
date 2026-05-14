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
  status: 'available',
};

export const Estoque: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAdd(true);
      await dataService.addProduct({
        ...addForm,
        purchase_price: Number(addForm.purchase_price),
        sale_price: Number(addForm.sale_price),
        stock_quantity: Number(addForm.stock_quantity),
      });
      toast.success('Produto adicionado ao estoque!');
      setIsAddModalOpen(false);
      setAddForm(emptyForm);
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSavingAdd(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      setIsSavingEdit(true);
      await dataService.updateProduct(editingId, {
        ...editForm,
        purchase_price: Number(editForm.purchase_price),
        sale_price: Number(editForm.sale_price),
        stock_quantity: Number(editForm.stock_quantity),
      });
      toast.success('Produto atualizado!');
      setIsEditModalOpen(false);
      setEditingId(null);
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name || '',
      category: product.category || 'iPhone',
      sku: product.sku || '',
      imei: product.imei || '',
      purchase_price: String(product.purchase_price || ''),
      sale_price: String(product.sale_price || ''),
      stock_quantity: String(product.stock_quantity || '1'),
      status: product.status || 'available',
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

  const addProfit = (Number(addForm.sale_price) || 0) - (Number(addForm.purchase_price) || 0);
  const addMargin = Number(addForm.sale_price) > 0 ? (addProfit / Number(addForm.sale_price)) * 100 : 0;

  const editProfit = (Number(editForm.sale_price) || 0) - (Number(editForm.purchase_price) || 0);
  const editMargin = Number(editForm.sale_price) > 0 ? (editProfit / Number(editForm.sale_price)) * 100 : 0;

  const hasActiveFilters = filterCategory !== 'Todas' || searchTerm;

  const columns = [
    {
      header: 'Produto', accessor: (p: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900">{p.name}</span>
          <span className="text-xs text-neutral-400">{p.category}</span>
        </div>
      )
    },
    { header: 'IMEI/Serial', accessor: (p: any) => <span className="font-mono text-xs">{p.imei || '-'}</span> },
    { header: 'Custo', accessor: (p: any) => <span className="text-sm text-neutral-500">{formatCurrency(p.purchase_price)}</span> },
    { header: 'Venda', accessor: (p: any) => <span className="font-bold text-primary-700">{formatCurrency(p.sale_price)}</span> },
    {
      header: 'Qtd', accessor: (p: any) => (
        <div className="flex items-center gap-2">
          <span className={p.stock_quantity <= 2 ? 'text-danger font-bold' : ''}>{p.stock_quantity}</span>
          {p.stock_quantity <= 2 && <Badge variant="danger" size="sm">Baixo</Badge>}
        </div>
      )
    },
    {
      header: 'Ações', accessor: (p: any) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" iconOnly onClick={() => handleOpenEdit(p)}><Edit2 size={14} /></Button>
          <Button variant="danger" size="sm" iconOnly onClick={() => handleDelete(p.id)}><Trash2 size={14} /></Button>
        </div>
      )
    },
  ];

  const categorySelectJSX = (value: string, onChange: (v: string) => void) => (
    <select
      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {CATEGORIES.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Estoque</h2>
          <p className="text-neutral-500">Controle de produtos e equipamentos</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => { setAddForm(emptyForm); setIsAddModalOpen(true); }}>
          Nova Compra / Aparelho
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, categoria ou IMEI..."
            leftIcon={<Search size={20} />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoComplete="off"
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

      {/* MODAL ADICIONAR */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Registrar Compra de Aparelho" maxWidth="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome do Produto"
                placeholder="Ex: iPhone 15 Pro Max 256GB"
                required
                autoComplete="off"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <Input
              label="SKU / Código"
              placeholder="IP15PM-256"
              autoComplete="off"
              value={addForm.sku}
              onChange={e => setAddForm(f => ({ ...f, sku: e.target.value }))}
            />
            <Input
              label="IMEI / Serial"
              placeholder="Opcional"
              autoComplete="off"
              value={addForm.imei}
              onChange={e => setAddForm(f => ({ ...f, imei: e.target.value }))}
            />
            <Input
              label="Preço de Custo (R$)"
              type="number"
              step="0.01"
              required
              value={addForm.purchase_price}
              onChange={e => setAddForm(f => ({ ...f, purchase_price: e.target.value }))}
            />
            <Input
              label="Preço de Venda (R$)"
              type="number"
              step="0.01"
              required
              value={addForm.sale_price}
              onChange={e => setAddForm(f => ({ ...f, sale_price: e.target.value }))}
            />
            <Input
              label="Quantidade em Estoque"
              type="number"
              min="1"
              required
              value={addForm.stock_quantity}
              onChange={e => setAddForm(f => ({ ...f, stock_quantity: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
              {categorySelectJSX(addForm.category, v => setAddForm(f => ({ ...f, category: v })))}
            </div>
          </div>
          {addForm.purchase_price && addForm.sale_price && (
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Projeção de Margem:</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-900">{formatCurrency(addProfit)} de lucro</p>
                  <p className="text-xs font-bold text-success">{addMargin.toFixed(1)}% de margem</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsAddModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingAdd} type="submit">Salvar Compra no Estoque</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Produto" maxWidth="lg">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome do Produto"
                placeholder="Ex: iPhone 15 Pro Max 256GB"
                required
                autoComplete="off"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <Input
              label="SKU / Código"
              placeholder="IP15PM-256"
              autoComplete="off"
              value={editForm.sku}
              onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))}
            />
            <Input
              label="IMEI / Serial"
              placeholder="Opcional"
              autoComplete="off"
              value={editForm.imei}
              onChange={e => setEditForm(f => ({ ...f, imei: e.target.value }))}
            />
            <Input
              label="Preço de Custo (R$)"
              type="number"
              step="0.01"
              required
              value={editForm.purchase_price}
              onChange={e => setEditForm(f => ({ ...f, purchase_price: e.target.value }))}
            />
            <Input
              label="Preço de Venda (R$)"
              type="number"
              step="0.01"
              required
              value={editForm.sale_price}
              onChange={e => setEditForm(f => ({ ...f, sale_price: e.target.value }))}
            />
            <Input
              label="Quantidade em Estoque"
              type="number"
              min="1"
              required
              value={editForm.stock_quantity}
              onChange={e => setEditForm(f => ({ ...f, stock_quantity: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
              {categorySelectJSX(editForm.category, v => setEditForm(f => ({ ...f, category: v })))}
            </div>
          </div>
          {editForm.purchase_price && editForm.sale_price && (
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Projeção de Margem:</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-900">{formatCurrency(editProfit)} de lucro</p>
                  <p className="text-xs font-bold text-success">{editMargin.toFixed(1)}% de margem</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsEditModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingEdit} type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Estoque;
