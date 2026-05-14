import React, { useEffect, useState } from 'react';
import { Truck, Plus, Globe, Package, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { DeviceForm, emptyDeviceForm, deviceFormToProductName, type DeviceFormData } from '../components/ui/DeviceForm';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

const emptySupplierForm = () => ({
  name: '', contact_name: '', email: '', phone: '', category: 'Eletrônicos', country: 'Paraguai',
});

export const Fornecedores: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm());

  // Purchase modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [deviceForm, setDeviceForm] = useState<DeviceFormData>(emptyDeviceForm());
  const [deviceList, setDeviceList] = useState<DeviceFormData[]>([]);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [suppliersData, productsData] = await Promise.all([
        dataService.getSuppliers(),
        dataService.getProducts(),
      ]);
      setSuppliers(suppliersData || []);
      setProducts((productsData || []).filter((p: any) => p.supplier_id));
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSupplier(true);
      await dataService.addSupplier(supplierForm);
      toast.success('Fornecedor cadastrado!');
      setIsSupplierModalOpen(false);
      setSupplierForm(emptySupplierForm());
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleAddDevice = () => {
    if (!deviceForm.model.trim()) { toast.error('Selecione ou informe o modelo do aparelho.'); return; }
    if (!deviceForm.purchase_price) { toast.error('Informe o preço de custo.'); return; }
    setDeviceList(prev => [...prev, { ...deviceForm }]);
    setDeviceForm(emptyDeviceForm());
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseSupplier) { toast.error('Selecione um fornecedor.'); return; }
    if (deviceList.length === 0) { toast.error('Adicione pelo menos um aparelho.'); return; }
    try {
      setIsSavingPurchase(true);
      for (const device of deviceList) {
        const batteryNote = device.battery_health ? ` · Bateria: ${device.battery_health}` : '';
        await dataService.addProduct({
          name: deviceFormToProductName(device) || device.model,
          category: device.category,
          imei: device.imei,
          purchase_price: Number(device.purchase_price),
          sale_price: Number(device.sale_price) || 0,
          stock_quantity: 1,
          status: 'available',
          supplier_id: purchaseSupplier,
          product_capacity: device.capacity,
          product_color: device.color,
          product_condition: device.condition + batteryNote,
        });
      }
      const n = deviceList.length;
      toast.success(`${n} aparelho${n > 1 ? 's' : ''} adicionado${n > 1 ? 's' : ''} ao estoque!`);
      setIsPurchaseModalOpen(false);
      setPurchaseSupplier('');
      setDeviceList([]);
      setDeviceForm(emptyDeviceForm());
      setActiveTab('purchases');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const openPurchaseForSupplier = (supplierId: string) => {
    setPurchaseSupplier(supplierId);
    setDeviceList([]);
    setDeviceForm(emptyDeviceForm());
    setIsPurchaseModalOpen(true);
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Remover o fornecedor "${name}"? Os aparelhos já importados permanecerão no estoque.`)) return;
    try {
      await dataService.deleteSupplier(id);
      toast.success('Fornecedor removido.');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" do estoque? Esta ação não pode ser desfeita.`)) return;
    try {
      await dataService.deleteProduct(id);
      toast.success('Aparelho removido do estoque.');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  // Group products by supplier
  const bySupplier: Record<string, any[]> = products.reduce((acc, p) => {
    const key = p.supplier_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Fornecedores</h2>
          <p className="text-neutral-500">Gestão de compras e parceiros</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" leftIcon={<Plus size={18} />} onClick={() => setIsSupplierModalOpen(true)}>
            Novo Fornecedor
          </Button>
          <Button leftIcon={<Package size={18} />} onClick={() => openPurchaseForSupplier('')}>
            Nova Compra
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        {(['suppliers', 'purchases'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-bold transition-all',
              activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {tab === 'suppliers' ? 'Fornecedores' : `Compras${products.length > 0 ? ` (${products.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ─── TAB: Fornecedores ─── */}
      {activeTab === 'suppliers' && (
        isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />)}</div>
        ) : suppliers.length === 0 ? (
          <Card className="py-16 text-center space-y-3">
            <Truck size={40} className="mx-auto text-neutral-300" />
            <p className="font-bold text-neutral-500">Nenhum fornecedor cadastrado.</p>
            <Button size="sm" leftIcon={<Plus size={16} />} onClick={() => setIsSupplierModalOpen(true)}>
              Cadastrar Fornecedor
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {suppliers.map(s => {
              const purchases = bySupplier[s.id] || [];
              return (
                <div key={s.id} className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Truck size={22} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900">{s.name}</p>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5 flex-wrap">
                      {s.country && <span className="flex items-center gap-1"><Globe size={11} />{s.country}</span>}
                      {s.contact_name && <span>{s.contact_name}</span>}
                      {s.phone && <span>{s.phone}</span>}
                      {purchases.length > 0 && (
                        <span className="text-green-600 font-bold">
                          {purchases.length} aparelho{purchases.length !== 1 ? 's' : ''} comprados
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openPurchaseForSupplier(s.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary-900 text-sm font-bold transition-colors"
                    >
                      <Package size={16} />
                      Registrar Compra
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(s.id, s.name)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 border border-neutral-200 transition-colors"
                      title="Remover fornecedor"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─── TAB: Compras ─── */}
      {activeTab === 'purchases' && (
        isLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}</div>
        ) : Object.keys(bySupplier).length === 0 ? (
          <Card className="py-16 text-center space-y-3">
            <Package size={40} className="mx-auto text-neutral-300" />
            <p className="font-bold text-neutral-500">Nenhuma compra registrada ainda.</p>
            <Button size="sm" leftIcon={<Plus size={16} />} onClick={() => openPurchaseForSupplier('')}>
              Registrar Compra
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(bySupplier).map(([supplierId, items]) => {
              const supplier = suppliers.find(s => s.id === supplierId);
              const totalCost = items.reduce((acc, p) => acc + Number(p.purchase_price || 0), 0);
              const available = items.filter(p => p.stock_quantity > 0).length;
              const sold = items.filter(p => p.stock_quantity <= 0).length;
              return (
                <div key={supplierId} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Truck size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900">{supplier?.name || 'Fornecedor'}</p>
                      <p className="text-xs text-neutral-400">
                        {items.length} aparelho{items.length !== 1 ? 's' : ''} · Custo total: <strong className="text-neutral-700">{formatCurrency(totalCost)}</strong>
                      </p>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <p className="text-green-600 font-bold">{available} em estoque</p>
                      <p className="text-neutral-400">{sold} vendido{sold !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-neutral-50">
                    {items.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm group">
                        <div className={['w-2 h-2 rounded-full flex-shrink-0', p.stock_quantity > 0 ? 'bg-green-400' : 'bg-neutral-300'].join(' ')} />
                        <span className="flex-1 font-medium text-neutral-800 truncate">{p.name}</span>
                        {p.imei && <span className="text-xs text-neutral-400 font-mono hidden md:block">IMEI: {p.imei}</span>}
                        <span className="font-bold text-neutral-700 flex-shrink-0">{formatCurrency(p.purchase_price)}</span>
                        <span className={['px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0', p.stock_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'].join(' ')}>
                          {p.stock_quantity > 0 ? 'Em estoque' : 'Vendido'}
                        </span>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          title="Remover do estoque"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-neutral-100">
                    <button
                      onClick={() => openPurchaseForSupplier(supplierId)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      + Adicionar mais aparelhos desta compra
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─── MODAL: Novo Fornecedor ─── */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Cadastrar Fornecedor">
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <Input label="Nome da Empresa *" placeholder="Ex: Master Eletrônicos" required value={supplierForm.name} onChange={e => setSupplierForm(f => ({...f, name: e.target.value}))} />
          <Input label="Pessoa de Contato" placeholder="Ex: Ricardo" value={supplierForm.contact_name} onChange={e => setSupplierForm(f => ({...f, contact_name: e.target.value}))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="WhatsApp" placeholder="+595 9..." value={supplierForm.phone} onChange={e => setSupplierForm(f => ({...f, phone: e.target.value}))} />
            <Input label="País" placeholder="Ex: Paraguai" value={supplierForm.country} onChange={e => setSupplierForm(f => ({...f, country: e.target.value}))} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setIsSupplierModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSavingSupplier} type="submit">Salvar Fornecedor</Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: Nova Compra ─── */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => { setIsPurchaseModalOpen(false); setDeviceList([]); setDeviceForm(emptyDeviceForm()); }}
        title="Registrar Compra"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Supplier + date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Fornecedor *</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={purchaseSupplier}
                onChange={e => setPurchaseSupplier(e.target.value)}
              >
                <option value="">Selecione um fornecedor...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} — {s.country}</option>)}
              </select>
              {suppliers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Nenhum fornecedor.{' '}
                  <button type="button" className="underline font-bold" onClick={() => { setIsPurchaseModalOpen(false); setIsSupplierModalOpen(true); }}>
                    Cadastrar agora.
                  </button>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Data da Compra</label>
              <input
                type="date"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          {/* Add device sub-form */}
          <div className="bg-neutral-50 rounded-2xl p-4 space-y-4 border border-neutral-200">
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Adicionar Aparelho</p>
            <DeviceForm value={deviceForm} onChange={setDeviceForm} salePriceLabel="Preço de Venda (R$) — opcional" />
            <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={handleAddDevice}>
              Adicionar Aparelho à Compra
            </Button>
          </div>

          {/* Batch list */}
          {deviceList.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-neutral-700">{deviceList.length} aparelho{deviceList.length > 1 ? 's' : ''} nesta compra:</p>
              {deviceList.map((d, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3">
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-sm truncate">{deviceFormToProductName(d) || d.model}</p>
                    <p className="text-xs text-neutral-400">{d.imei ? `IMEI: ${d.imei} · ` : ''}{formatCurrency(Number(d.purchase_price))}</p>
                  </div>
                  <button type="button" onClick={() => setDeviceList(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-sm font-bold text-neutral-600">Total da compra:</span>
                <span className="text-xl font-black text-primary-900">
                  {formatCurrency(deviceList.reduce((a, d) => a + Number(d.purchase_price || 0), 0))}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" fullWidth type="button"
              onClick={() => { setIsPurchaseModalOpen(false); setDeviceList([]); setDeviceForm(emptyDeviceForm()); }}>
              Cancelar
            </Button>
            <Button fullWidth loading={isSavingPurchase} type="button"
              onClick={handleConfirmPurchase} leftIcon={<Package size={18} />}>
              Confirmar → Enviar ao Estoque
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Fornecedores;
