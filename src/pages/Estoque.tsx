import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, Filter, Trash2, Edit2, X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

const CATEGORIES = ['Todas', 'iPhone', 'iPad', 'MacBook', 'Watch', 'AirPods', 'Samsung', 'Xiaomi', 'Games', 'Outro'];

const emptyForm = {
  name: '',
  category: 'iPhone',
  imei: '',
  purchase_price: '',
  sale_price: '',
};

export const Estoque: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [showSold, setShowSold] = useState(false);

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

  useEffect(() => { fetchProducts(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAdd(true);
      await dataService.addProduct({
        ...addForm,
        purchase_price: Number(addForm.purchase_price),
        sale_price: Number(addForm.sale_price),
        stock_quantity: 1,  // sempre 1 — cada produto é único
        status: 'available',
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
      imei: product.imei || '',
      purchase_price: String(product.purchase_price || ''),
      sale_price: String(product.sale_price || ''),
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

  const applyFilters = (list: any[]) =>
    list.filter(p => {
      const matchSearch =
        !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.imei?.includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'Todas' || p.category === filterCategory;
      return matchSearch && matchCat;
    });

  const available = applyFilters(products.filter(p => p.stock_quantity > 0));
  const sold = applyFilters(products.filter(p => p.stock_quantity <= 0));

  const addProfit = (Number(addForm.sale_price) || 0) - (Number(addForm.purchase_price) || 0);
  const addMargin = Number(addForm.sale_price) > 0 ? (addProfit / Number(addForm.sale_price)) * 100 : 0;
  const editProfit = (Number(editForm.sale_price) || 0) - (Number(editForm.purchase_price) || 0);
  const editMargin = Number(editForm.sale_price) > 0 ? (editProfit / Number(editForm.sale_price)) * 100 : 0;

  const categorySelect = (value: string, onChange: (v: string) => void) => (
    <select
      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {CATEGORIES.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  const ProductCard = ({ p, isSoldView = false }: { p: any; isSoldView?: boolean }) => {
    const profit = p.sale_price - p.purchase_price;
    const margin = p.sale_price > 0 ? (profit / p.sale_price) * 100 : 0;
    return (
      <div className={[
        'flex items-center gap-4 p-4 rounded-2xl border transition-all',
        isSoldView
          ? 'bg-neutral-50 border-neutral-200 opacity-60'
          : 'bg-white border-neutral-200 hover:border-primary/30 hover:shadow-sm',
      ].join(' ')}>
        {/* Icon */}
        <div className={[
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
          isSoldView ? 'bg-neutral-200' : 'bg-primary/10',
        ].join(' ')}>
          {isSoldView
            ? <CheckCircle2 size={22} className="text-neutral-400" />
            : <Package size={22} className="text-primary" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={['font-bold truncate', isSoldView ? 'text-neutral-500' : 'text-neutral-900'].join(' ')}>
              {p.name}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium">{p.category}</span>
            {isSoldView && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500 font-bold">Vendido</span>
            )}
          </div>
          {p.imei && <p className="text-xs text-neutral-400 font-mono mt-0.5">IMEI: {p.imei}</p>}
          <div className="flex items-center gap-4 mt-1 text-xs text-neutral-400">
            <span>Custo: <strong className="text-neutral-600">{formatCurrency(p.purchase_price)}</strong></span>
            <span>Venda: <strong className="text-primary-700">{formatCurrency(p.sale_price)}</strong></span>
            {!isSoldView && <span>Lucro: <strong className="text-green-600">{formatCurrency(profit)} ({margin.toFixed(0)}%)</strong></span>}
          </div>
        </div>

        {/* Actions */}
        {!isSoldView && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleOpenEdit(p)}
              className="p-2 rounded-xl border border-neutral-200 text-neutral-500 hover:text-primary hover:border-primary/30 transition-colors"
              title="Editar"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="p-2 rounded-xl border border-neutral-200 text-neutral-500 hover:text-red-500 hover:border-red-300 transition-colors"
              title="Remover"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
        {isSoldView && (
          <button
            onClick={() => handleDelete(p.id)}
            className="p-2 rounded-xl border border-neutral-200 text-neutral-300 hover:text-red-400 hover:border-red-300 transition-colors flex-shrink-0"
            title="Remover do histórico"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Estoque</h2>
          <p className="text-neutral-500">
            <strong>{available.length}</strong> disponível{available.length !== 1 ? 'is' : ''} ·{' '}
            <span className="text-neutral-400">{sold.length} vendido{sold.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => { setAddForm(emptyForm); setIsAddModalOpen(true); }}>
          Adicionar Aparelho
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, IMEI ou categoria..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
        </div>
        <div className="relative">
          <Button
            variant={filterCategory !== 'Todas' ? 'primary' : 'secondary'}
            leftIcon={<Filter size={18} />}
            onClick={() => setIsCategoryOpen(v => !v)}
          >
            {filterCategory !== 'Todas' ? filterCategory : 'Categoria'}
            <ChevronDown size={14} className="ml-1" />
          </Button>
          {isCategoryOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${filterCategory === cat ? 'font-bold text-primary' : 'text-neutral-700'}`}
                  onClick={() => { setFilterCategory(cat); setIsCategoryOpen(false); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        {(searchTerm || filterCategory !== 'Todas') && (
          <button
            onClick={() => { setSearchTerm(''); setFilterCategory('Todas'); }}
            className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Available products */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : available.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center gap-4 bg-white rounded-2xl border border-neutral-200">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
            <Package size={28} className="text-neutral-300" />
          </div>
          <div>
            <p className="font-bold text-neutral-700">Estoque vazio</p>
            <p className="text-sm text-neutral-400 mt-1">Adicione aparelhos ao estoque para começar a vender.</p>
          </div>
          <Button leftIcon={<Plus size={16} />} size="sm" onClick={() => setIsAddModalOpen(true)}>
            Adicionar Aparelho
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {available.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      )}

      {/* Sold products toggle */}
      {sold.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowSold(v => !v)}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <ChevronDown size={16} className={showSold ? 'rotate-180 transition-transform' : 'transition-transform'} />
            {showSold ? 'Ocultar' : 'Ver'} histórico de vendidos ({sold.length} aparelho{sold.length !== 1 ? 's' : ''})
          </button>
          {showSold && (
            <div className="space-y-3">
              {sold.map(p => <ProductCard key={p.id} p={p} isSoldView />)}
            </div>
          )}
        </div>
      )}

      {/* MODAL ADICIONAR */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Aparelho ao Estoque" maxWidth="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome do Produto"
                placeholder="Ex: iPhone 15 Pro Max 256GB Titânio"
                required
                autoComplete="off"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <Input
              label="IMEI / Serial"
              placeholder="Opcional mas recomendado"
              autoComplete="off"
              value={addForm.imei}
              onChange={e => setAddForm(f => ({ ...f, imei: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
              {categorySelect(addForm.category, v => setAddForm(f => ({ ...f, category: v })))}
            </div>
            <Input
              label="Preço de Custo (R$)"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0,00"
              value={addForm.purchase_price}
              onChange={e => setAddForm(f => ({ ...f, purchase_price: e.target.value }))}
            />
            <Input
              label="Preço de Venda (R$) — opcional"
              type="number"
              step="0.01"
              min="0"
              placeholder="Definir na hora da venda"
              value={addForm.sale_price}
              onChange={e => setAddForm(f => ({ ...f, sale_price: e.target.value }))}
            />
          </div>

          {addForm.purchase_price && addForm.sale_price && (
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-600">Margem de lucro:</span>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-900">{formatCurrency(addProfit)}</p>
                <p className="text-xs font-bold text-green-600">{addMargin.toFixed(1)}% de margem</p>
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2">
            Cada aparelho é cadastrado como uma unidade única. Ao ser vendido, sai automaticamente do estoque.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setIsAddModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingAdd} type="submit">Salvar no Estoque</Button>
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
                required
                autoComplete="off"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <Input
              label="IMEI / Serial"
              autoComplete="off"
              value={editForm.imei}
              onChange={e => setEditForm(f => ({ ...f, imei: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
              {categorySelect(editForm.category, v => setEditForm(f => ({ ...f, category: v })))}
            </div>
            <Input
              label="Preço de Custo (R$)"
              type="number"
              step="0.01"
              min="0"
              required
              value={editForm.purchase_price}
              onChange={e => setEditForm(f => ({ ...f, purchase_price: e.target.value }))}
            />
            <Input
              label="Preço de Venda (R$) — opcional"
              type="number"
              step="0.01"
              min="0"
              placeholder="Definir na hora da venda"
              value={editForm.sale_price}
              onChange={e => setEditForm(f => ({ ...f, sale_price: e.target.value }))}
            />
          </div>

          {editForm.purchase_price && editForm.sale_price && (
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-600">Margem de lucro:</span>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-900">{formatCurrency(editProfit)}</p>
                <p className="text-xs font-bold text-green-600">{editMargin.toFixed(1)}% de margem</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setIsEditModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingEdit} type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Estoque;
