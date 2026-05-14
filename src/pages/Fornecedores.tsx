import React, { useEffect, useState } from 'react';
import { Truck, Plus, Search, Globe, Phone, Mail, Package } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

export const Fornecedores: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    category: 'Eletrônicos',
    country: 'Paraguai'
  });

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getSuppliers();
      setSuppliers(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar fornecedores: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await dataService.addSupplier(formData);
      toast.success('Fornecedor cadastrado!');
      setIsModalOpen(false);
      setFormData({ name: '', contact_name: '', email: '', phone: '', category: 'Eletrônicos', country: 'Paraguai' });
      fetchSuppliers();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { header: 'Fornecedor', accessor: (s: any) => (
      <div className="flex flex-col">
        <span className="font-bold text-neutral-900">{s.name}</span>
        <span className="text-xs text-neutral-400">{s.category}</span>
      </div>
    )},
    { header: 'Contato', accessor: 'contact_name' },
    { header: 'País', accessor: (s: any) => (
      <div className="flex items-center gap-1.5">
        <Globe size={14} className="text-neutral-400" />
        <span>{s.country}</span>
      </div>
    )},
    { header: 'Telefone', accessor: 'phone' },
    { header: 'Email', accessor: 'email' },
    { header: 'Status', accessor: () => <Badge variant="success">Ativo</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Fornecedores</h2>
          <p className="text-neutral-500">Gestão de compras e parceiros</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Novo Fornecedor
        </Button>
      </div>

      <Table 
        columns={columns} 
        data={suppliers} 
        isLoading={isLoading}
        emptyMessage="Nenhum fornecedor cadastrado."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Cadastrar Fornecedor"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Nome da Empresa" 
            placeholder="Ex: Master Eletrônicos" 
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Pessoa de Contato" 
            placeholder="Ex: Ricardo" 
            value={formData.contact_name}
            onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="WhatsApp" 
              placeholder="+595 9..." 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <Input 
              label="País" 
              placeholder="Ex: Paraguai" 
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSaving} type="submit">
              Salvar Fornecedor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Fornecedores;
