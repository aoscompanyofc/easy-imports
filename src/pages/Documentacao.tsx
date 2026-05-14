import React, { useEffect, useState } from 'react';
import { FileText, Plus, Search, File, Download, Trash2, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';
import { formatDate } from '../lib/formatters';
import toast from 'react-hot-toast';

export const Documentacao: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Procedimentos',
    file_url: 'https://placeholder.com/doc.pdf'
  });

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getDocuments();
      setDocuments(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar documentos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await dataService.addDocument(formData);
      toast.success('Documento registrado!');
      setIsModalOpen(false);
      setFormData({ title: '', category: 'Procedimentos', file_url: 'https://placeholder.com/doc.pdf' });
      fetchDocuments();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { header: 'Documento', accessor: (d: any) => (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neutral-100 rounded-lg text-neutral-400">
          <FileText size={18} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900">{d.title}</span>
          <span className="text-xs text-neutral-400">{d.category}</span>
        </div>
      </div>
    )},
    { header: 'Data de Upload', accessor: (d: any) => formatDate(d.created_at) },
    { header: 'Ações', accessor: () => (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" iconOnly><Download size={14} /></Button>
        <Button variant="danger" size="sm" iconOnly><Trash2 size={14} /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Documentação</h2>
          <p className="text-neutral-500">Procedimentos, manuais e arquivos</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Novo Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Manuais Apple', 'Procedimentos Venda', 'Controle Financeiro', 'Importação'].map((cat) => (
          <Card key={cat} className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <File size={24} />
              </div>
              <span className="text-xs font-bold text-neutral-400">12 arquivos</span>
            </div>
            <h4 className="font-bold text-neutral-900 group-hover:text-primary transition-colors">{cat}</h4>
          </Card>
        ))}
      </div>

      <Table 
        columns={columns} 
        data={documents} 
        isLoading={isLoading}
        emptyMessage="Nenhum documento cadastrado."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Upload de Documento"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Título do Documento" 
            placeholder="Ex: Tabela de Preços Maio" 
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
            <select 
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="Procedimentos">Procedimentos</option>
              <option value="Manuais">Manuais</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Marketing">Marketing</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          <div className="p-8 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Download size={32} />
            <span className="text-sm font-medium">Arraste ou clique para upload</span>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSaving} type="submit">
              Salvar Documento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Documentacao;
