import React, { useState, useRef } from 'react';
import { Settings, User, Bell, Shield, Database, Link, Trash2, Save, Key, RefreshCw, Camera } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { dataService } from '../lib/dataService';
import { supabase } from '../lib/supabase';
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const [avatarSrc, setAvatarSrc] = useState<string>(() => localStorage.getItem('user_avatar') || '');
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileCargo, setProfileCargo] = useState(localStorage.getItem('user_cargo') || 'Administrador');
  const [profileTelefone, setProfileTelefone] = useState(localStorage.getItem('user_telefone') || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarSrc(dataUrl);
      localStorage.setItem('user_avatar', dataUrl);
      toast.success('Foto atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      localStorage.setItem('user_cargo', profileCargo);
      localStorage.setItem('user_telefone', profileTelefone);
      await new Promise(res => setTimeout(res, 400));
      toast.success('Perfil salvo com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar perfil: ' + error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGenerateBackup = async () => {
    try {
      setIsGeneratingBackup(true);
      const [products, sales, customers, leads, transactions] = await Promise.all([
        dataService.getProducts(),
        dataService.getSales(),
        dataService.getCustomers(),
        dataService.getLeads(),
        dataService.getTransactions(),
      ]);
      const backup = {
        exportedAt: new Date().toISOString(),
        products,
        sales,
        customers,
        leads,
        transactions,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `easy-imports-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup gerado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao gerar backup: ' + error.message);
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem!');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres!');
      return;
    }
    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao atualizar senha: ' + error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
            <input
              ref={photoInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handlePhotoChange}
            />
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary flex items-center justify-center text-3xl font-bold flex-shrink-0">
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                    : <span>{initials}</span>
                  }
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <div>
                <Button variant="secondary" size="sm" onClick={() => photoInputRef.current?.click()}>
                  Alterar Foto
                </Button>
                <p className="text-xs text-neutral-400 mt-2">JPG, PNG ou GIF. Máximo 2MB.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
              />
              <Input label="Email" defaultValue={user?.email} disabled />
              <Input
                label="Cargo"
                value={profileCargo}
                onChange={e => setProfileCargo(e.target.value)}
              />
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={profileTelefone}
                onChange={e => setProfileTelefone(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button leftIcon={<Save size={18} />} loading={isSavingProfile} onClick={handleSaveProfile}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        );
      case 'database':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-danger-light bg-danger-light/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-danger text-white rounded-xl flex-shrink-0">
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
              <p className="text-sm text-neutral-500 mb-4">
                Baixe um backup completo de todos os seus dados em formato JSON.
              </p>
              <Button
                variant="secondary"
                leftIcon={<Database size={18} />}
                loading={isGeneratingBackup}
                onClick={handleGenerateBackup}
              >
                Gerar Backup
              </Button>
            </Card>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
              <Input
                label="Senha Atual"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="Nova Senha"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" leftIcon={<Key size={18} />} loading={isUpdatingPassword}>
                Atualizar Senha
              </Button>
            </form>
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

        <div className="flex-1 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm min-h-[500px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
