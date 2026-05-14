import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, Filter, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

export const Estoque: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'iPhone',
    sku: '',
    imei: '',
    purchase_price: '',
    sale_price: '',
    stock_quantity: '1',
    status: 'available'
  });

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
      setFormData({ name: '', category: 'iPhone', sku: '', imei: '', purchase_price: '', sale_price: '', stock_quantity: '1', status: 'available' });
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
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

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.imei?.includes(searchTerm)
  );

  const profit = (Number(formData.sale_price) || 0) - (Number(formData.purchase_price) || 0);
  const marginPercent = Number(formData.sale_price) > 0 ? (profit / Number(formData.sale_price)) * 100 : 0;

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
        <Button variant="secondary" size="sm" iconOnly onClick={() => toast('Em breve: Editar produto')}><Edit2 size={14} /></Button>
        <Button variant="danger" size="sm" iconOnly onClick={() => handleDelete(p.id)}><Trash2 size={14} /></Button>
      </div>
    )},
  ];

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
        <Button variant="secondary" leftIcon={<Filter size={20} />}>
          Filtros
        </Button>
      </div>

      <Table 
        columns={columns} 
        data={filteredProducts} 
        isLoading={isLoading}
        emptyMessage="Nenhum produto cadastrado no estoque."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registrar Compra de Aparelho"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input 
                label="Nome do Produto" 
                placeholder="Ex: iPhone 15 Pro Max 256GB" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <Input 
              label="SKU / Código" 
              placeholder="IP15PM-256"
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value})}
            />
            <Input 
              label="IMEI / Serial" 
              placeholder="Opcional"
              value={formData.imei}
              onChange={(e) => setFormData({...formData, imei: e.target.value})}
            />
            <Input 
              label="Preço de Custo (R$)" 
              type="number" 
              step="0.01" 
              required
              value={formData.purchase_price}
              onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
            />
            <Input 
              label="Preço de Venda (R$)" 
              type="number" 
              step="0.01" 
              required
              value={formData.sale_price}
              onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
            />
            <Input 
              label="Quantidade em Estoque" 
              type="number" 
              required
              value={formData.stock_quantity}
              onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
            />
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
              <select 
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="iPhone">iPhone</option>
                <option value="iPad">iPad</option>
                <option value="MacBook">MacBook</option>
                <option value="Watch">Apple Watch</option>
                <option value="AirPods">AirPods</option>
                <option value="Samsung">Samsung</option>
                <option value="Xiaomi">Xiaomi</option>
                <option value="Games">Games</option>
              </select>
            </div>
          </div>

          {(formData.purchase_price && formData.sale_price) && (
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Projeção de Margem:</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-900">
                    {formatCurrency(profit)} de lucro
                  </p>
                  <p className="text-xs font-bold text-success">
                    {marginPercent.toFixed(1)}% de margem
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSaving} type="submit">
              Salvar Compra no Estoque
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Estoque;
