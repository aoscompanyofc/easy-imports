import React, { useEffect, useState } from 'react';
import { Plus, Search, Phone, Mail, Trash2, Edit2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';

type FormData = { name: string; email: string; phone: string; cpf: string; city: string; notes: string };
const emptyForm = (): FormData => ({ name: '', email: '', phone: '', cpf: '', city: '', notes: '' });

// Definido FORA do componente pai para não remontear a cada render
const CustomerForm = ({ data, onChange }: { data: FormData; onChange: (d: FormData) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="md:col-span-2">
      <Input
        label="Nome Completo *"
        placeholder="Ex: Ricardo Santos"
        required
        value={data.name}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
        autoComplete="off"
      />
    </div>
    <Input
      label="WhatsApp"
      placeholder="(11) 99999-9999"
      value={data.phone}
      onChange={(e) => onChange({ ...data, phone: e.target.value })}
      autoComplete="off"
    />
    <Input
      label="Email"
      type="email"
      placeholder="cliente@email.com"
      value={data.email}
      onChange={(e) => onChange({ ...data, email: e.target.value })}
      autoComplete="off"
    />
    <Input
      label="CPF"
      placeholder="000.000.000-00"
      value={data.cpf}
      onChange={(e) => onChange({ ...data, cpf: e.target.value })}
      autoComplete="off"
    />
    <Input
      label="Cidade"
      placeholder="Ex: São Paulo"
      value={data.city}
      onChange={(e) => onChange({ ...data, city: e.target.value })}
      autoComplete="off"
    />
    <div className="md:col-span-2">
      <label className="block text-sm font-bold text-neutral-700 mb-1.5">Observações</label>
      <textarea
        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all resize-none"
        rows={3}
        placeholder="Informações adicionais sobre o cliente..."
        value={data.notes}
        onChange={(e) => onChange({ ...data, notes: e.target.value })}
      />
    </div>
  </div>
);

export const Clientes: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm());

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm());

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

  useEffect(() => { fetchCustomers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Informe o nome do cliente.'); return; }
    try {
      setIsSaving(true);
      await dataService.addCustomer(formData);
      toast.success('Cliente cadastrado com sucesso!');
      setIsAddOpen(false);
      setFormData(emptyForm());
      fetchCustomers();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (customer: any) => {
    setEditingId(customer.id);
    setEditForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: customer.cpf || '',
      city: customer.city || '',
      notes: customer.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.name.trim()) { toast.error('O nome não pode ficar vazio.'); return; }
    try {
      setIsEditSaving(true);
      await dataService.updateCustomer(editingId, editForm);
      toast.success('Cliente atualizado!');
      setIsEditOpen(false);
      setEditingId(null);
      fetchCustomers();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsEditSaving(false);
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
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.includes(searchTerm)
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
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" iconOnly onClick={() => handleOpenEdit(c)} title="Editar">
          <Edit2 size={14} />
        </Button>
        <Button variant="danger" size="sm" iconOnly onClick={() => handleDelete(c.id, c.name)} title="Remover">
          <Trash2 size={14} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Clientes</h2>
          <p className="text-neutral-500">Base de clientes e histórico de compras</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => { setFormData(emptyForm()); setIsAddOpen(true); }}>
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, telefone, email ou CPF..."
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

      {/* Modal Adicionar */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Cadastrar Novo Cliente" maxWidth="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <CustomerForm data={formData} onChange={setFormData} />
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsAddOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit">Salvar Cliente</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Cliente" maxWidth="lg">
        <form onSubmit={handleEditSave} className="space-y-4">
          <CustomerForm data={editForm} onChange={setEditForm} />
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsEditOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isEditSaving} type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Clientes;
