import React, { useEffect, useState } from 'react';
import { Plus, Search, MessageCircle, MoreVertical, GripVertical, Calendar, User as UserIcon, Trash2, X } from 'lucide-react';
import { formatDate } from '../lib/formatters';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STAGES = [
  { id: 'new', title: 'Novos', color: 'bg-info-light text-info' },
  { id: 'contacting', title: 'Em Contato', color: 'bg-warning-light text-warning' },
  { id: 'interested', title: 'Interessados', color: 'bg-primary-50 text-primary-900' },
  { id: 'negotiating', title: 'Negociação', color: 'bg-secondary-light text-secondary' },
  { id: 'closed', title: 'Ganhos', color: 'bg-success-light text-success' },
];

export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Instagram',
    notes: '',
    status: 'new'
  });

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const data = await dataService.getLeads();
      setLeads(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar leads: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await dataService.addLead(formData);
      toast.success('Novo lead adicionado!');
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', source: 'Instagram', notes: '', status: 'new' });
      fetchLeads();
    } catch (error: any) {
      toast.error('Erro ao salvar lead: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const moveLead = async (id: string, newStatus: string) => {
    try {
      await dataService.updateLead(id, { status: newStatus });
      fetchLeads();
      toast.success('Lead movido com sucesso');
    } catch (error: any) {
      toast.error('Erro ao mover lead: ' + error.message);
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (confirm(`Deseja remover o lead "${name}"?`)) {
      try {
        await dataService.deleteLead(id);
        toast.success('Lead removido!');
        fetchLeads();
      } catch (error: any) {
        toast.error('Erro ao remover lead: ' + error.message);
      }
    }
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(l => {
      if (l.status !== stageId) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(searchTerm) ||
        l.email?.toLowerCase().includes(q) ||
        l.source?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q)
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">CRM de Leads</h2>
          <p className="text-neutral-500">Gestão do funil de vendas</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => setIsModalOpen(true)}>
          Novo Lead
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Buscar lead por nome, telefone, origem..."
            leftIcon={<Search size={20} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="p-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[calc(100vh-300px)]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-[300px] flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider', stage.color)}>
                  {stage.title}
                </span>
                <span className="text-xs font-bold text-neutral-400">
                  {getLeadsByStage(stage.id).length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-neutral-100/50 p-2 rounded-xl min-h-[500px]">
              {getLeadsByStage(stage.id).map((lead) => (
                <Card 
                  key={lead.id} 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow group relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500">
                        <UserIcon size={16} />
                      </div>
                      <h4 className="font-bold text-neutral-900 text-sm">{lead.name}</h4>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id, lead.name); }}
                      className="text-neutral-300 hover:text-danger transition-colors"
                      title="Remover lead"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <MessageCircle size={14} />
                      <span>{lead.phone || lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Calendar size={14} />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="neutral" size="sm">{lead.source}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {STAGES.map((s) => s.id !== lead.status && (
                        <button
                          key={s.id}
                          onClick={() => moveLead(lead.id, s.id)}
                          className="w-5 h-5 rounded bg-white border border-neutral-200 flex items-center justify-center text-[10px] hover:bg-primary hover:border-primary transition-colors"
                          title={`Mover para ${s.title}`}
                        >
                          {s.title[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
              {getLeadsByStage(stage.id).length === 0 && !isLoading && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs font-medium">
                  Nenhum lead nesta etapa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Cadastrar Novo Lead"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Nome Completo" 
            placeholder="Ex: João da Silva" 
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="WhatsApp" 
              placeholder="(11) 99999-9999" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <Input 
              label="Email" 
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Origem</label>
            <select 
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={formData.source}
              onChange={(e) => setFormData({...formData, source: e.target.value})}
            >
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Google">Google</option>
              <option value="Indicação">Indicação</option>
              <option value="Facebook">Facebook</option>
            </select>
          </div>
          <Input 
            label="Notas / Interesse" 
            placeholder="Ex: Interessado no iPhone 15 Pro"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button fullWidth loading={isSaving} type="submit">
              Criar Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
