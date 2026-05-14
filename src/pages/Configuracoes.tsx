import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Database, Link, LogOut, Trash2, Save, Key, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { dataService } from '../lib/dataService';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TABS = [
  { id: 'profile', icon: User, label: 'Perfil' },
  { id: 'notifications', icon: Bell, label: 'Notificações' },
  { id: 'security', icon: Shield, label: 'Segurança' },
  { id: 'database', icon: Database, label: 'Dados & Backup' },
  { id: 'integrations', icon: Link, label: 'Integrações' },
];

export const Configuracoes: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuthStore();
  const [isCleaning, setIsCleaning] = useState(false);

  const handleClearData = async () => {
    if (confirm('TEM CERTEZA? Isso apagará todos os dados (Estoque, Vendas, Clientes) PERMANENTEMENTE.')) {
      try {
        setIsCleaning(true);
        await dataService.clearAllData();
        toast.success('Sistema resetado com sucesso!');
        window.location.reload();
      } catch (error: any) {
        toast.error('Erro ao limpar dados: ' + error.message);
      } finally {
        setIsCleaning(false);
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold">
                {user?.avatar || 'JE'}
              </div>
              <div>
                <Button variant="secondary" size="sm">Alterar Foto</Button>
                <p className="text-xs text-neutral-400 mt-2">JPG, GIF ou PNG. Tamanho máximo 2MB.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nome Completo" defaultValue={user?.name} />
              <Input label="Email" defaultValue={user?.email} disabled />
              <Input label="Cargo" defaultValue="Administrador" />
              <Input label="Telefone" defaultValue="(11) 99999-9999" />
            </div>
            <div className="flex justify-end">
              <Button leftIcon={<Save size={18} />}>Salvar Alterações</Button>
            </div>
          </div>
        );
      case 'database':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-danger-light bg-danger-light/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-danger text-white rounded-xl">
                  <Trash2 size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900">Zona de Perigo: Resetar Sistema</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    Isso apagará todos os produtos, vendas, clientes, leads e transações. 
                    Esta ação não pode ser desfeita.
                  </p>
                  <Button variant="danger" loading={isCleaning} onClick={handleClearData} leftIcon={<RefreshCw size={18} />}>
                    Resetar Tudo (Dashboard Zerado)
                  </Button>
                </div>
              </div>
            </Card>
            <Card>
              <h4 className="font-bold text-neutral-900 mb-2">Exportar Dados</h4>
              <p className="text-sm text-neutral-500 mb-4">Baixe um backup completo de todos os seus dados em formato JSON.</p>
              <Button variant="secondary" leftIcon={<Database size={18} />}>Gerar Backup</Button>
            </Card>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="max-w-md space-y-4">
              <Input label="Senha Atual" type="password" />
              <Input label="Nova Senha" type="password" />
              <Input label="Confirmar Nova Senha" type="password" />
              <Button leftIcon={<Key size={18} />}>Atualizar Senha</Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Settings size={48} className="mb-4 opacity-40" />
            <p className="font-medium">Funcionalidade em desenvolvimento</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Configurações</h2>
        <p className="text-neutral-500">Gerencie sua conta e preferências do sistema</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-64 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 font-bold',
                activeTab === tab.id
                  ? 'bg-primary text-neutral-900 shadow-lg shadow-primary/20'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              )}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm min-h-[500px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
