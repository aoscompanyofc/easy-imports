import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Phone, Mail, Trash2, User2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

export const Clientes: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    city: '',
    notes: ''
  });

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getCustomers();
      setCustomers(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await dataService.addCustomer(formData);
      toast.success('Cliente cadastrado com sucesso!');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', cpf: '', city: '', notes: '' });
      fetchCustomers();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja remover o cliente "${name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await dataService.deleteCustomer(id);
        toast.success('Cliente removido!');
        fetchCustomers();
      } catch (error: any) {
        toast.error('Erro ao remover: ' + error.message);
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Cliente', accessor: (c: any) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-sm font-bold text-primary-900">
          {c.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
        </div>
        <div>
          <span className="font-bold text-neutral-900 block">{c.name}</span>
          <span className="text-xs text-neutral-400">{c.city || 'Sem cidade'}</span>
        </div>
      </div>
    )},
    { header: 'Telefone', accessor: (c: any) => (
      <div className="flex items-center gap-1.5 text-sm">
        <Phone size={13} className="text-neutral-400" />
        <span>{c.phone || '-'}</span>
      </div>
    )},
    { header: 'Email', accessor: (c: any) => (
      <div className="flex items-center gap-1.5 text-sm">
        <Mail size={13} className="text-neutral-400" />
        <span>{c.email || '-'}</span>
      </div>
    )},
    { header: 'Cadastro', accessor: (c: any) => formatDate(c.created_at) },
    { header: 'Status', accessor: () => <Badge variant="success">Ativo</Badge> },
    { header: 'Ações', accessor: (c: any) => (
      <Button variant="danger" size="sm" iconOnly onClick={() => handleDelete(c.id, c.name)}>
        <Trash2 size={14} />
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Clientes</h2>
          <p className="text-neutral-500">Base de clientes e histórico de compras</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            leftIcon={<Search size={20} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente cadastrado ainda."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Novo Cliente" maxWidth="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome Completo"
                placeholder="Ex: Ricardo Santos"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <Input
              label="WhatsApp"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="cliente@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
            />
            <Input
              label="Cidade"
              placeholder="Ex: São Paulo"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Observações</label>
              <textarea
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all resize-none"
                rows={3}
                placeholder="Informações adicionais sobre o cliente..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit">Salvar Cliente</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Clientes;
