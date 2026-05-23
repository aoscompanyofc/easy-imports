import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Search, Filter, Trash2, Edit2, X, ChevronDown, CheckCircle2, Download, AlertTriangle, ChevronRight, Calendar, Tag, Cpu, Shield, MapPin, Hash } from 'lucide-react';
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
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [filterCondition, setFilterCondition] = useState('Todas');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const CONDITION_OPTIONS = ['Todas', 'Novo', 'Seminovo'];
  const [showFilters, setShowFilters] = useState(false);

  const exportCSV = (list: any[]) => {
    const header = ['Nome','Categoria','Condição','IMEI','Custo','Preço Venda','Garantia','Entrada'];
    const rows = list.map(p => [
      p.name, p.category, p.product_condition, p.imei || '',
      p.purchase_price, p.sale_price, p.product_warranty || '', p.entry_date || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `estoque_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

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
      // Sort: oldest entry_date first (ascending), then by created_at ascending as fallback
      const sorted = [...(data || [])].sort((a, b) => {
        const da = a.entry_date || a.created_at?.slice(0, 10) || '';
        const db = b.entry_date || b.created_at?.slice(0, 10) || '';
        return da.localeCompare(db);
      });
      setProducts(sorted);

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

  const STALE_DAYS = 45;
  const [detailProduct, setDetailProduct] = useState<any | null>(null);

  const applyFilters = (list: any[]) =>
    list.filter(p => {
      const matchSearch =
        !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.imei?.includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'Todas' || p.category === filterCategory;
      const matchDateFrom = !filterDateFrom || (p.entry_date && p.entry_date >= filterDateFrom);
      const matchDateTo   = !filterDateTo   || (p.entry_date && p.entry_date <= filterDateTo);
      const matchCondition = filterCondition === 'Todas' || (p.product_condition || '').toLowerCase().startsWith(filterCondition.toLowerCase());
      const price = Number(p.sale_price) || 0;
      const matchPriceMin = !filterPriceMin || price >= Number(filterPriceMin);
      const matchPriceMax = !filterPriceMax || price <= Number(filterPriceMax);
      return matchSearch && matchCat && matchDateFrom && matchDateTo && matchCondition && matchPriceMin && matchPriceMax;
    });

  const available = applyFilters(products.filter(p => p.stock_quantity > 0));
  const sold = applyFilters(products.filter(p => p.stock_quantity <= 0));
  const activeFilterCount = [
    filterCategory !== 'Todas', filterCondition !== 'Todas',
    !!(filterDateFrom || filterDateTo), !!(filterPriceMin || filterPriceMax),
  ].filter(Boolean).length;
  const hasAnyFilter = !!(searchTerm || filterCategory !== 'Todas' || filterDateFrom || filterDateTo || filterCondition !== 'Todas' || filterPriceMin || filterPriceMax);

  // ── Detail side panel ─────────────────────────────────────────────────────
  const DetailPanel = ({ p }: { p: any }) => {
    const profit = (Number(p.sale_price) || 0) - (Number(p.purchase_price) || 0);
    const margin = Number(p.sale_price) > 0 ? (profit / Number(p.sale_price)) * 100 : 0;
    const entryDate = p.entry_date ? new Date(p.entry_date + 'T12:00') : null;
    const daysInStock = entryDate ? Math.floor((Date.now() - entryDate.getTime()) / 86400000) : 0;
    const isStale = daysInStock >= STALE_DAYS;
    const condBase = (p.product_condition || '').replace(/ · Bateria:.*/, '');
    const battery = (p.product_condition || '').match(/Bateria: (.+)/)?.[1];

    const InfoRow = ({ icon, label, value, valueClass = '' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) => (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 last:border-0">
        <div className="w-5 flex-shrink-0 text-neutral-400">{icon}</div>
        <p className="text-xs text-neutral-400 w-24 flex-shrink-0">{label}</p>
        <p className={`text-sm font-semibold text-neutral-800 flex-1 ${valueClass}`}>{value || '—'}</p>
      </div>
    );

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex bg-neutral-900/40 backdrop-blur-md" onClick={() => setDetailProduct(null)}>
        <div className="hidden sm:flex flex-1" />
        <div className="w-full sm:max-w-sm bg-white h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-4 flex items-start gap-3 z-10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-base text-neutral-900 leading-tight">{p.name}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{p.category}</p>
            </div>
            <button onClick={() => setDetailProduct(null)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Price summary */}
          <div className="grid grid-cols-3 gap-0 border-b border-neutral-100">
            <div className="p-4 text-center border-r border-neutral-100">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Custo</p>
              <p className="text-base font-black text-neutral-700 mt-1">{formatCurrency(Number(p.purchase_price))}</p>
            </div>
            <div className="p-4 text-center border-r border-neutral-100">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Venda</p>
              <p className="text-base font-black text-neutral-900 mt-1">{Number(p.sale_price) > 0 ? formatCurrency(Number(p.sale_price)) : '—'}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lucro</p>
              <p className={`text-base font-black mt-1 ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {Number(p.sale_price) > 0 ? `${formatCurrency(profit)} (${margin.toFixed(0)}%)` : '—'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="bg-neutral-50 rounded-none">
              {p.imei && <InfoRow icon={<Hash size={14} />} label={p.imei.length === 15 && /^\d+$/.test(p.imei) ? 'IMEI' : 'Nº de Série'} value={p.imei} valueClass="font-mono text-xs" />}
              {condBase && <InfoRow icon={<Tag size={14} />} label="Condição" value={condBase} />}
              {battery && <InfoRow icon={<Cpu size={14} />} label="Bateria" value={battery} />}
              {p.product_warranty && p.product_warranty !== 'Sem garantia' && <InfoRow icon={<Shield size={14} />} label="Garantia" value={p.product_warranty} valueClass="text-green-700" />}
              {p.product_origin && <InfoRow icon={<MapPin size={14} />} label="Origem" value={p.product_origin} />}
              {entryDate && (
                <InfoRow
                  icon={<Calendar size={14} />}
                  label="Entrada"
                  value={entryDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                />
              )}
              <InfoRow
                icon={<AlertTriangle size={14} />}
                label="Dias parado"
                value={`${daysInStock} dia${daysInStock !== 1 ? 's' : ''}${isStale ? ' ⚠️' : ''}`}
                valueClass={isStale ? 'text-primary' : ''}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="sticky bottom-0 bg-white border-t border-neutral-100 px-5 py-4 flex gap-3">
            <button
              onClick={() => { setDetailProduct(null); handleOpenEdit(p); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors"
            >
              <Edit2 size={15} /> Editar
            </button>
            <button
              onClick={() => { setDetailProduct(null); handleDelete(p.id); }}
              className="w-12 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ── Table row ──────────────────────────────────────────────────────────────
  const ProductRow = ({ p, isSoldView = false }: { p: any; isSoldView?: boolean }) => {
    const profit = (Number(p.sale_price) || 0) - (Number(p.purchase_price) || 0);
    const margin = Number(p.sale_price) > 0 ? (profit / Number(p.sale_price)) * 100 : 0;
    const entryDate = p.entry_date ? new Date(p.entry_date + 'T12:00') : null;
    const daysInStock = entryDate ? Math.floor((Date.now() - entryDate.getTime()) / 86400000) : 0;
    const isStale = !isSoldView && daysInStock >= STALE_DAYS;

    return (
      <tr
        className={[
          'group border-b border-neutral-100 last:border-0 transition-colors cursor-pointer',
          isSoldView ? 'opacity-50 hover:opacity-70 bg-neutral-50' : isStale ? 'bg-primary/5 hover:bg-primary/10' : 'bg-white hover:bg-neutral-50',
        ].join(' ')}
        onClick={() => !isSoldView && setDetailProduct(p)}
      >
        {/* Data de entrada */}
        <td className="pl-4 pr-1 py-3 whitespace-nowrap">
          <div className={`inline-flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[52px] ${isSoldView ? 'bg-neutral-300' : 'bg-neutral-900'}`}>
            {entryDate ? (
              <>
                <span className={`text-[11px] font-black tabular-nums leading-none ${isSoldView ? 'text-neutral-600' : 'text-white'}`}>
                  {String(entryDate.getDate()).padStart(2,'0')}/{String(entryDate.getMonth()+1).padStart(2,'0')}
                </span>
                <span className={`text-[9px] font-bold tabular-nums leading-none mt-0.5 ${isSoldView ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {entryDate.getFullYear()}
                </span>
              </>
            ) : (
              <span className="text-[9px] text-neutral-400 font-bold">—</span>
            )}
          </div>
        </td>

        {/* Nome */}
        <td className="pl-2 pr-2 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${isSoldView ? 'bg-neutral-300' : isStale ? 'bg-neutral-400' : 'bg-primary'}`} />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${isSoldView ? 'text-neutral-500' : 'text-neutral-900'}`}>{p.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-px rounded">{p.category}</span>
                {p.imei && <span className="text-[10px] font-mono text-neutral-400">{p.imei.length === 15 && /^\d+$/.test(p.imei) ? 'IMEI' : 'S/N'}: {p.imei}</span>}
                {isSoldView && <span className="text-[10px] font-bold text-neutral-400 bg-neutral-200 px-1.5 py-px rounded">Vendido</span>}
                {isStale && <span className="text-[10px] font-bold text-neutral-900 bg-primary/10 px-1.5 py-px rounded flex items-center gap-0.5"><AlertTriangle size={9} />{daysInStock}d</span>}
              </div>
            </div>
          </div>
        </td>

        {/* Custo */}
        <td className="px-3 py-3 text-right whitespace-nowrap">
          <span className="text-sm font-semibold text-neutral-500">{formatCurrency(Number(p.purchase_price))}</span>
        </td>

        {/* Venda */}
        <td className="px-3 py-3 text-right whitespace-nowrap">
          <span className={`text-sm font-bold ${Number(p.sale_price) > 0 ? 'text-neutral-900' : 'text-neutral-300'}`}>
            {Number(p.sale_price) > 0 ? formatCurrency(Number(p.sale_price)) : '—'}
          </span>
        </td>

        {/* Lucro */}
        <td className="px-3 py-3 text-right whitespace-nowrap">
          {Number(p.sale_price) > 0 ? (
            <div className="text-right">
              <span className={`text-sm font-black ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(profit)}</span>
              <span className="text-[10px] text-neutral-400 ml-1">({margin.toFixed(0)}%)</span>
            </div>
          ) : (
            <span className="text-neutral-300 text-sm">—</span>
          )}
        </td>

        {/* Dias */}
        <td className="px-3 py-3 text-center whitespace-nowrap">
          {entryDate ? (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isStale ? 'bg-primary/10 text-neutral-900' : 'bg-neutral-100 text-neutral-500'}`}>
              {daysInStock}d
            </span>
          ) : <span className="text-neutral-300 text-xs">—</span>}
        </td>

        {/* Condição */}
        <td className="px-3 py-3 text-center whitespace-nowrap">
          {(() => {
            const cond = (p.product_condition || '').replace(/ · Bateria:.*/, '').trim();
            const lower = cond.toLowerCase();
            const isNovo = lower.startsWith('novo');
            const isSemi = lower.startsWith('seminovo');
            if (!cond) return <span className="text-neutral-300 text-xs">—</span>;
            return (
              <span className={`text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap ${
                isNovo ? 'bg-neutral-900 text-white' :
                isSemi ? 'bg-neutral-200 text-neutral-700' :
                'bg-neutral-100 text-neutral-500'
              }`}>
                {isNovo ? 'Novo' : isSemi ? 'Seminovo' : cond.split(' ')[0]}
              </span>
            );
          })()}
        </td>

        {/* Ações */}
        {!isSoldView && (
          <td className="pr-4 pl-2 py-3">
            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); handleOpenEdit(p); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Editar"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remover"
              >
                <Trash2 size={13} />
              </button>
              <ChevronRight size={13} className="text-neutral-300 ml-0.5" />
            </div>
          </td>
        )}
        {isSoldView && (
          <td className="pr-4 pl-2 py-3">
            <button
              onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Remover do histórico"
            >
              <Trash2 size={13} />
            </button>
          </td>
        )}
      </tr>
    );
  };

  // ── Mobile card (one per product) ─────────────────────────────────────────
  const ProductMobileCard = ({ p, isSoldView = false }: { p: any; isSoldView?: boolean }) => {
    const profit = (Number(p.sale_price) || 0) - (Number(p.purchase_price) || 0);
    const entryDate = p.entry_date ? new Date(p.entry_date + 'T12:00') : null;
    const daysInStock = entryDate ? Math.floor((Date.now() - entryDate.getTime()) / 86400000) : 0;
    const isStale = !isSoldView && daysInStock >= STALE_DAYS;
    const condBase = (p.product_condition || '').replace(/ · Bateria:.*/, '').trim();
    const condLower = condBase.toLowerCase();
    const isNovo = condLower.startsWith('novo');
    const isSemi = condLower.startsWith('seminovo');

    return (
      <div
        onClick={() => !isSoldView && setDetailProduct(p)}
        className={[
          'flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 transition-colors',
          isSoldView ? 'opacity-60 bg-neutral-50/80' : isStale ? 'bg-primary/5' : 'bg-white',
          !isSoldView ? 'cursor-pointer active:bg-neutral-50' : '',
        ].join(' ')}
      >
        {/* Date badge */}
        <div className={`rounded-xl px-2 py-1.5 min-w-[44px] text-center flex-shrink-0 ${isSoldView ? 'bg-neutral-300' : 'bg-neutral-900'}`}>
          {entryDate ? (
            <>
              <div className={`text-[11px] font-black tabular-nums leading-none ${isSoldView ? 'text-neutral-600' : 'text-white'}`}>
                {String(entryDate.getDate()).padStart(2,'0')}/{String(entryDate.getMonth()+1).padStart(2,'0')}
              </div>
              <div className={`text-[9px] font-bold tabular-nums leading-none mt-0.5 ${isSoldView ? 'text-neutral-400' : 'text-neutral-400'}`}>
                {entryDate.getFullYear()}
              </div>
            </>
          ) : (
            <span className="text-[9px] text-neutral-400 font-bold">—</span>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight ${isSoldView ? 'text-neutral-500' : 'text-neutral-900'}`}>{p.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">{p.category}</span>
            {condBase && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                isNovo ? 'bg-neutral-900 text-white' : isSemi ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-100 text-neutral-500'
              }`}>
                {isNovo ? 'Novo' : isSemi ? 'Seminovo' : condBase.split(' ')[0]}
              </span>
            )}
            {isStale && (
              <span className="text-[10px] font-bold text-neutral-900 bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertTriangle size={9} /> {daysInStock}d
              </span>
            )}
            {isSoldView && <span className="text-[10px] font-bold text-neutral-400 bg-neutral-200 px-1.5 py-0.5 rounded">Vendido</span>}
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          {Number(p.sale_price) > 0 ? (
            <>
              <p className={`text-sm font-black ${isSoldView ? 'text-neutral-500' : 'text-neutral-900'}`}>
                {formatCurrency(Number(p.sale_price))}
              </p>
              <p className={`text-[10px] font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-neutral-500">{formatCurrency(Number(p.purchase_price))}</p>
              <p className="text-[10px] text-neutral-300">Sem preço venda</p>
            </>
          )}
        </div>
        {!isSoldView && <ChevronRight size={14} className="text-neutral-300 flex-shrink-0 ml-1" />}
      </div>
    );
  };

  const TableHeader = () => (
    <thead>
      <tr className="border-b-2 border-neutral-100">
        <th className="pl-4 pr-1 py-2.5 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest">Entrada</th>
        <th className="pl-2 pr-2 py-2.5 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest">Aparelho</th>
        <th className="px-3 py-2.5 text-right text-[10px] font-black text-neutral-400 uppercase tracking-widest">Custo</th>
        <th className="px-3 py-2.5 text-right text-[10px] font-black text-neutral-400 uppercase tracking-widest">Venda</th>
        <th className="px-3 py-2.5 text-right text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lucro</th>
        <th className="px-3 py-2.5 text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest">Dias</th>
        <th className="px-3 py-2.5 text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest">Condição</th>
        <th className="pr-4 pl-2 py-2.5" />
      </tr>
    </thead>
  );

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

      {/* Summary stats */}
      {available.length > 0 && (() => {
        const totalCost = available.reduce((sum, p) => sum + (Number(p.purchase_price) || 0), 0);
        const totalSale = available.reduce((sum, p) => sum + (Number(p.sale_price) || 0), 0);
        const totalProfit = totalSale - totalCost;
        const itemsWithPrice = available.filter(p => Number(p.sale_price) > 0).length;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Em estoque</p>
              <p className="text-2xl font-black text-neutral-900 mt-1">{available.length}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">aparelho{available.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Custo total</p>
              <p className="text-xl font-black text-red-600 mt-1">{formatCurrency(totalCost)}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">investido</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-4">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">Previsão de venda</p>
              <p className="text-xl font-black text-neutral-900 mt-1">{formatCurrency(totalSale)}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{itemsWithPrice} com preço definido</p>
            </div>
            <div className={[
              'border rounded-2xl p-4',
              totalProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100',
            ].join(' ')}>
              <p className={['text-[10px] font-black uppercase tracking-wide', totalProfit >= 0 ? 'text-green-600' : 'text-red-500'].join(' ')}>
                Lucro potencial
              </p>
              <p className={['text-xl font-black mt-1', totalProfit >= 0 ? 'text-green-600' : 'text-red-600'].join(' ')}>
                {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">se tudo vender</p>
            </div>
          </div>
        );
      })()}

      {/* ── Barra de busca ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, IMEI ou categoria..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
        </div>
        {/* Filtros — mobile only */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={[
            'md:hidden relative flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-bold transition-colors flex-shrink-0',
            showFilters || activeFilterCount > 0
              ? 'bg-neutral-900 border-neutral-900 text-white'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600',
          ].join(' ')}
        >
          <Filter size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[9px] font-black text-neutral-900 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {hasAnyFilter && (
          <button
            onClick={() => { setSearchTerm(''); setFilterCategory('Todas'); setFilterDateFrom(''); setFilterDateTo(''); setFilterCondition('Todas'); setFilterPriceMin(''); setFilterPriceMax(''); setShowFilters(false); }}
            className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Painel de filtros — mobile ─────────────────────────────────── */}
      {showFilters && (
        <div className="md:hidden space-y-4 p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm">
          {/* Categoria */}
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Categoria</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {FILTER_CATEGORIES.map(cat => (
                <button key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={['flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors',
                    filterCategory === cat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'].join(' ')}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Condição */}
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Condição</p>
            <div className="flex gap-2">
              {CONDITION_OPTIONS.map(opt => (
                <button key={opt}
                  onClick={() => setFilterCondition(opt)}
                  className={['flex-1 text-xs font-bold py-2 rounded-xl transition-colors',
                    filterCondition === opt ? 'bg-primary text-neutral-900' : 'bg-neutral-100 text-neutral-600'].join(' ')}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          {/* Data de entrada */}
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Data de entrada</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/25" />
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
          </div>
          {/* Preço */}
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Faixa de preço (R$)</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Mínimo" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/25" />
              <input type="number" placeholder="Máximo" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
          </div>
          {/* Export */}
          <button onClick={() => exportCSV(available)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      )}

      {/* ── Filtros avançados — desktop ────────────────────────────────── */}
      <div className="hidden md:flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
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
              <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
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
          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-xl bg-neutral-50 px-3 py-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0">Entrada</span>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="A partir de"
              className="text-xs outline-none bg-transparent text-neutral-600 cursor-pointer w-[116px]" />
            <span className="text-neutral-300 text-xs flex-shrink-0">—</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="Até"
              className="text-xs outline-none bg-transparent text-neutral-600 cursor-pointer w-[116px]" />
          </div>
          {hasAnyFilter && (
            <button
              onClick={() => { setSearchTerm(''); setFilterCategory('Todas'); setFilterDateFrom(''); setFilterDateTo(''); setFilterCondition('Todas'); setFilterPriceMin(''); setFilterPriceMax(''); }}
              className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Condição</span>
            {CONDITION_OPTIONS.map(opt => (
              <button key={opt}
                onClick={() => setFilterCondition(opt)}
                className={['text-xs font-bold px-2 py-0.5 rounded-lg transition-colors', filterCondition === opt ? 'bg-primary text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'].join(' ')}>
                {opt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">R$</span>
            <input type="number" placeholder="Mín" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
              className="w-20 text-xs outline-none bg-transparent text-neutral-600 placeholder:text-neutral-300" />
            <span className="text-neutral-300 text-xs">—</span>
            <input type="number" placeholder="Máx" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
              className="w-20 text-xs outline-none bg-transparent text-neutral-600 placeholder:text-neutral-300" />
          </div>
          <button onClick={() => exportCSV(available)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:border-primary/30 hover:text-neutral-900 transition-colors">
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Detail panel */}
      {detailProduct && <DetailPanel p={detailProduct} />}

      {/* Available products — table */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-neutral-50 border-b border-neutral-100 animate-pulse" />)}
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
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-neutral-100">
            {available.map(p => <ProductMobileCard key={p.id} p={p} />)}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[72px]" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-16" />
                <col className="w-24" />
                <col className="w-20" />
              </colgroup>
              <TableHeader />
              <tbody>
                {available.map(p => <ProductRow key={p.id} p={p} />)}
              </tbody>
            </table>
          </div>
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
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              {/* Mobile */}
              <div className="md:hidden divide-y divide-neutral-100">
                {sold.map(p => <ProductMobileCard key={p.id} p={p} isSoldView />)}
              </div>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[72px]" />
                    <col className="w-auto" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-32" />
                    <col className="w-16" />
                    <col className="w-24" />
                    <col className="w-20" />
                  </colgroup>
                  <TableHeader />
                  <tbody>
                    {sold.map(p => <ProductRow key={p.id} p={p} isSoldView />)}
                  </tbody>
                </table>
              </div>
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
