import React, { useEffect, useRef, useState } from 'react';
import { Package, Plus, Search, Filter, Trash2, Edit2, X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { DeviceForm, emptyDeviceForm, deviceFormToProductName, type DeviceFormData } from '../components/ui/DeviceForm';
import { formatCurrency, formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

const FILTER_CATEGORIES = ['Todas', 'iPhone', 'iPad', 'MacBook', 'Watch', 'AirPods', 'Acessórios', 'Capas & Cases', 'Smartphones', 'Games', 'Outro'];

// Strips repeated capacity/color suffixes from a product name and appends them once.
// e.g. "iPhone 16 Pro Max 256GB Titânio Deserto 256GB Titânio Deserto" → "iPhone 16 Pro Max 256GB Titânio Deserto"
function deduplicateName(name: string, capacity: string, color: string): string {
  let n = name.trim();
  const cap = capacity.trim();
  const col = color.trim();
  if (!cap && !col) return n;

  // Repeatedly peel color then capacity off the end until nothing changes
  let prev = '';
  while (prev !== n) {
    prev = n;
    const nl = n.toLowerCase();
    if (col && nl.endsWith(' ' + col.toLowerCase())) n = n.slice(0, -(col.length + 1)).trim();
    if (cap && nl.endsWith(' ' + cap.toLowerCase())) n = n.slice(0, -(cap.length + 1)).trim();
  }
  // n is now the bare model — rebuild with one occurrence of each
  return [n, cap, col].filter(Boolean).join(' ');
}

export const Estoque: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [showSold, setShowSold] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<DeviceFormData>(emptyDeviceForm());
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<DeviceFormData>(emptyDeviceForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const autoFixedRef = useRef(false); // run dedup only once per session

  const fetchProducts = async (skipAutoFix = false) => {
    try {
      setIsLoading(true);
      const data = await dataService.getProducts();
      setProducts(data || []);

      // Auto-fix duplicate names on first load
      if (!skipAutoFix && !autoFixedRef.current && data && data.length > 0) {
        autoFixedRef.current = true;
        const toFix = data.filter((p: any) => {
          const cap = (p.product_capacity || '').trim();
          const col = (p.product_color || '').trim();
          if (!cap && !col) return false;
          return deduplicateName(p.name || '', cap, col) !== (p.name || '').trim();
        });

        if (toFix.length > 0) {
          for (const p of toFix) {
            const cap = (p.product_capacity || '').trim();
            const col = (p.product_color || '').trim();
            const cleanName = deduplicateName(p.name || '', cap, col);
            await dataService.updateProduct(p.id, {
              name: cleanName,
              category: p.category,
              imei: p.imei,
              purchase_price: p.purchase_price,
              sale_price: p.sale_price,
              stock_quantity: p.stock_quantity,
              status: p.status,
              product_capacity: cap,
              product_color: col,
              product_condition: p.product_condition,
              product_warranty: p.product_warranty,
              product_origin: p.product_origin,
              entry_date: p.entry_date,
            });
          }
          toast.success(`${toFix.length} nome${toFix.length !== 1 ? 's' : ''} duplicado${toFix.length !== 1 ? 's' : ''} corrigido${toFix.length !== 1 ? 's' : ''}!`);
          // Reload with corrected names (skipAutoFix=true to avoid loop)
          const updated = await dataService.getProducts();
          setProducts(updated || []);
        }
      }
    } catch (error: any) {
      toast.error('Erro ao carregar estoque: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = deviceFormToProductName(addForm);
    if (!name && !addForm.model) { toast.error('Selecione ou informe o modelo.'); return; }
    try {
      setIsSavingAdd(true);
      const batteryNote = addForm.battery_health ? ` · Bateria: ${addForm.battery_health}` : '';
      await dataService.addProduct({
        name: name || addForm.model,
        category: addForm.category,
        imei: addForm.imei,
        purchase_price: Number(addForm.purchase_price),
        sale_price: Number(addForm.sale_price) || 0,
        stock_quantity: 1,
        status: 'available',
        product_capacity: addForm.capacity !== '—' ? addForm.capacity : '',
        product_color: addForm.color,
        product_condition: addForm.condition + batteryNote,
        product_warranty: addForm.warranty || 'Sem garantia',
        product_origin: addForm.origin || '',
        entry_date: addForm.entry_date || new Date().toISOString().split('T')[0],
      });
      toast.success('Aparelho adicionado ao estoque!');
      setIsAddModalOpen(false);
      setAddForm(emptyDeviceForm());
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
      const batteryNote = editForm.battery_health ? ` · Bateria: ${editForm.battery_health}` : '';
      await dataService.updateProduct(editingId, {
        name: deviceFormToProductName(editForm) || editForm.model,
        category: editForm.category,
        imei: editForm.imei,
        purchase_price: Number(editForm.purchase_price),
        sale_price: Number(editForm.sale_price) || 0,
        product_capacity: editForm.capacity !== '—' ? editForm.capacity : '',
        product_color: editForm.color,
        product_condition: editForm.condition + batteryNote,
        product_warranty: editForm.warranty || 'Sem garantia',
        product_origin: editForm.origin || '',
        entry_date: editForm.entry_date || new Date().toISOString().split('T')[0],
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

    // deviceFormToProductName joins [model, capacity, color] with spaces.
    // Strip capacity and color suffixes to recover the bare model name.
    let modelName = product.name || '';
    const cap = (product.product_capacity || '').trim();
    const col = (product.product_color || '').trim();
    if (col && modelName.endsWith(` ${col}`)) modelName = modelName.slice(0, -(col.length + 1));
    if (cap && modelName.endsWith(` ${cap}`)) modelName = modelName.slice(0, -(cap.length + 1));
    modelName = modelName.trim();

    setEditForm({
      category: product.category || 'iPhone',
      model: modelName,
      capacity: cap,
      color: col,
      condition: (product.product_condition || 'Seminovo — Excelente').replace(/ · Bateria:.*/, ''),
      battery_health: (product.product_condition || '').match(/Bateria: (.+)/)?.[1] || '',
      warranty: product.product_warranty || 'Sem garantia',
      origin: product.product_origin || '',
      entry_date: product.entry_date || new Date().toISOString().split('T')[0],
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

  const ProductCard = ({ p, isSoldView = false }: { p: any; isSoldView?: boolean }) => {
    const profit = p.sale_price - p.purchase_price;
    const margin = p.sale_price > 0 ? (profit / p.sale_price) * 100 : 0;
    return (
      <div className={[
        'flex items-center gap-3 px-3 py-2 rounded-xl border transition-all',
        isSoldView
          ? 'bg-neutral-50 border-neutral-200 opacity-55'
          : 'bg-white border-neutral-200 hover:border-primary/30 hover:shadow-sm',
      ].join(' ')}>
        {/* Icon */}
        <div className={[
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isSoldView ? 'bg-neutral-200' : 'bg-primary/10',
        ].join(' ')}>
          {isSoldView
            ? <CheckCircle2 size={15} className="text-neutral-400" />
            : <Package size={15} className="text-primary" />}
        </div>

        {/* Name + meta — single compact line */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className={['text-sm font-bold truncate', isSoldView ? 'text-neutral-500' : 'text-neutral-900'].join(' ')}>
            {p.name}
          </span>
          {p.imei && (
            <span className="text-xs text-neutral-400 font-mono">IMEI: {p.imei}</span>
          )}
          <span className="text-[11px] px-1.5 py-px rounded-full bg-neutral-100 text-neutral-500 font-medium leading-tight">{p.category}</span>
          {isSoldView && (
            <span className="text-[11px] px-1.5 py-px rounded-full bg-neutral-200 text-neutral-500 font-bold leading-tight">Vendido</span>
          )}
          {p.product_warranty && p.product_warranty !== 'Sem garantia' && (
            <span className="text-[11px] px-1.5 py-px rounded-full bg-green-100 text-green-700 font-bold leading-tight">
              {p.product_warranty}
            </span>
          )}
          <span className="text-xs text-neutral-400">Custo: <strong className="text-neutral-600">{formatCurrency(p.purchase_price)}</strong></span>
          <span className="text-xs text-neutral-400">Venda: <strong className={p.sale_price > 0 ? 'text-primary-700' : 'text-neutral-400'}>{formatCurrency(p.sale_price)}</strong></span>
          {!isSoldView && p.sale_price > 0 && (
            <span className="text-xs text-neutral-400">Lucro: <strong className={profit >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(profit)} ({margin.toFixed(0)}%)</strong></span>
          )}
          {p.product_origin && (
            <span className="text-xs text-neutral-400">Origem: <strong className="text-blue-600">{p.product_origin}</strong></span>
          )}
          {p.entry_date && (
            <span className="text-xs text-neutral-400">Entrada: <strong className="text-neutral-600">{formatDate(p.entry_date)}</strong></span>
          )}
        </div>

        {/* Actions */}
        {!isSoldView && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleOpenEdit(p)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-primary hover:border-primary/30 transition-colors"
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-300 transition-colors"
              title="Remover"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        {isSoldView && (
          <button
            onClick={() => handleDelete(p.id)}
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-300 hover:text-red-400 hover:border-red-300 transition-colors flex-shrink-0"
            title="Remover do histórico"
          >
            <Trash2 size={13} />
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
        <Button leftIcon={<Plus size={20} />} onClick={() => { setAddForm(emptyDeviceForm()); setIsAddModalOpen(true); }}>
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
              {FILTER_CATEGORIES.map(cat => (
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
        <div className="space-y-1.5">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-neutral-100 rounded-xl animate-pulse" />)}
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
        <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              {sold.map(p => <ProductCard key={p.id} p={p} isSoldView />)}
            </div>
          )}
        </div>
      )}

      {/* MODAL ADICIONAR */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Aparelho ao Estoque" maxWidth="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <DeviceForm value={addForm} onChange={setAddForm} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsAddModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingAdd} type="submit">Salvar no Estoque</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Aparelho" maxWidth="lg">
        <form onSubmit={handleEditSave} className="space-y-4">
          <DeviceForm value={editForm} onChange={setEditForm} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsEditModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingEdit} type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Estoque;
