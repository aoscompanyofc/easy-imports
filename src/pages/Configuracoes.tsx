import React, { useState, useRef, useEffect } from 'react';
import {
  Settings, User, Bell, Shield, Database, Link, Trash2, Save,
  Key, RefreshCw, Camera, Users, Plus, X, Copy, Check, Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { usePermissionsStore, ALL_PAGES, DEFAULT_VENDEDOR_PAGES, PageKey } from '../stores/permissionsStore';
import { dataService } from '../lib/dataService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  vendas: 'Vendas',
  estoque: 'Estoque',
  clientes: 'Clientes',
  leads: 'Leads',
  financeiro: 'Financeiro',
  fornecedores: 'Fornecedores',
  marketing: 'Marketing',
  relatorios: 'Relatórios',
  documentacao: 'Documentação',
  configuracoes: 'Configurações',
};

// Pages that vendedores can be granted access to (admins always have all)
const GRANTABLE_PAGES: PageKey[] = [
  'dashboard', 'vendas', 'estoque', 'clientes', 'leads',
  'financeiro', 'fornecedores', 'marketing', 'relatorios', 'documentacao',
];

const TEAM_SQL = `-- Execute no Supabase Dashboard → SQL Editor

create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  name text not null,
  role text not null default 'vendedor',
  allowed_pages text[] not null default array['dashboard','vendas','estoque','clientes','leads'],
  created_at timestamptz default now(),
  unique(owner_id, email)
);

alter table team_members enable row level security;

create policy "owner_all" on team_members
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "member_read_own" on team_members
  for select using (email = auth.email());`;

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  allowed_pages: string[];
}

const emptyMemberForm = () => ({
  name: '',
  email: '',
  allowedPages: [...DEFAULT_VENDEDOR_PAGES] as PageKey[],
});

export const Configuracoes: React.FC = () => {
  const { user } = useAuthStore();
  const { name, cargo, avatar, telefone, setName, setCargo, setAvatar, setTelefone } = useProfileStore();
  const { isAdmin } = usePermissionsStore();

  const TABS = [
    { id: 'profile', icon: User, label: 'Perfil' },
    { id: 'notifications', icon: Bell, label: 'Notificações' },
    { id: 'security', icon: Shield, label: 'Segurança' },
    { id: 'database', icon: Database, label: 'Dados & Backup' },
    { id: 'integrations', icon: Link, label: 'Integrações' },
    ...(isAdmin ? [{ id: 'equipe', icon: Users, label: 'Equipe' }] : []),
  ];

  const [activeTab, setActiveTab] = useState('profile');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Local form state (separate from store so edits are staged)
  const [profileName, setProfileName] = useState(name);
  const [profileCargo, setProfileCargo] = useState(cargo);
  const [profileTelefone, setProfileTelefone] = useState(telefone);

  // Sync local state when store changes externally
  useEffect(() => { setProfileName(name); }, [name]);
  useEffect(() => { setProfileCargo(cargo); }, [cargo]);
  useEffect(() => { setProfileTelefone(telefone); }, [telefone]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── Team state ───────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamTableExists, setTeamTableExists] = useState<boolean | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMemberForm());
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const initials = (profileName || user?.name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ─── Handlers ─────────────────────────────────────────────────────────
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
      setAvatar(dataUrl);
      toast.success('Foto atualizada!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setName(profileName.trim() || user?.name || '');
      setCargo(profileCargo.trim() || 'Administrador');
      setTelefone(profileTelefone.trim());
      await new Promise((res) => setTimeout(res, 300));
      toast.success('Perfil salvo com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar perfil: ' + error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem!'); return; }
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres!'); return; }
    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao atualizar senha: ' + error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleGenerateBackup = async () => {
    try {
      setIsGeneratingBackup(true);
      const [products, sales, customers, leads, transactions] = await Promise.all([
        dataService.getProducts(), dataService.getSales(), dataService.getCustomers(),
        dataService.getLeads(), dataService.getTransactions(),
      ]);
      const backup = { exportedAt: new Date().toISOString(), products, sales, customers, leads, transactions };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `easy-imports-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup gerado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao gerar backup: ' + error.message);
    } finally {
      setIsGeneratingBackup(false);
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

  // ─── Team handlers ─────────────────────────────────────────────────────
  const loadTeam = async () => {
    setIsLoadingTeam(true);
    try {
      const members = await dataService.getTeamMembers();
      setTeamMembers(members as TeamMember[]);
      setTeamTableExists(true);
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
        setTeamTableExists(false);
      } else {
        setTeamTableExists(false);
      }
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'equipe' && isAdmin) loadTeam();
  }, [activeTab, isAdmin]);

  const handleTogglePage = (page: PageKey) => {
    setMemberForm((prev) => ({
      ...prev,
      allowedPages: prev.allowedPages.includes(page)
        ? prev.allowedPages.filter((p) => p !== page)
        : [...prev.allowedPages, page],
    }));
  };

  const handleAddMember = async () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      toast.error('Nome e email são obrigatórios.');
      return;
    }
    if (memberForm.allowedPages.length === 0) {
      toast.error('Selecione pelo menos uma página.');
      return;
    }
    try {
      setIsSavingMember(true);
      await dataService.addTeamMember({
        name: memberForm.name.trim(),
        email: memberForm.email.trim().toLowerCase(),
        role: 'vendedor',
        allowed_pages: memberForm.allowedPages,
      });
      toast.success('Membro adicionado! Compartilhe o email e uma senha para o acesso.');
      setShowAddMember(false);
      setMemberForm(emptyMemberForm());
      loadTeam();
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        toast.error('Esse email já está cadastrado na equipe.');
      } else {
        toast.error('Erro ao adicionar membro: ' + error.message);
      }
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleDeleteMember = async (id: string, memberName: string) => {
    if (!confirm(`Remover ${memberName} da equipe?`)) return;
    try {
      await dataService.deleteTeamMember(id);
      toast.success('Membro removido.');
      loadTeam();
    } catch (error: any) {
      toast.error('Erro ao remover membro: ' + error.message);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(TEAM_SQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  // ─── Tab content ───────────────────────────────────────────────────────
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
                  {avatar
                    ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
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
                onChange={(e) => setProfileName(e.target.value)}
                autoComplete="off"
              />
              <Input label="Email" defaultValue={user?.email} disabled />
              <Input
                label="Cargo"
                value={profileCargo}
                onChange={(e) => setProfileCargo(e.target.value)}
                autoComplete="off"
              />
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={profileTelefone}
                onChange={(e) => setProfileTelefone(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end">
              <Button leftIcon={<Save size={18} />} loading={isSavingProfile} onClick={handleSaveProfile}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
              <Input label="Senha Atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <Input label="Nova Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <Input label="Confirmar Nova Senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <Button type="submit" leftIcon={<Key size={18} />} loading={isUpdatingPassword}>
                Atualizar Senha
              </Button>
            </form>
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
                    Isso apagará todos os produtos, vendas, clientes, leads e transações. Esta ação não pode ser desfeita.
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
              <Button variant="secondary" leftIcon={<Database size={18} />} loading={isGeneratingBackup} onClick={handleGenerateBackup}>
                Gerar Backup
              </Button>
            </Card>
          </div>
        );

      case 'equipe':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Setup card if table doesn't exist */}
            {teamTableExists === false && (
              <Card className="border-amber-200 bg-amber-50">
                <h4 className="font-bold text-neutral-900 mb-1">Configuração necessária</h4>
                <p className="text-sm text-neutral-600 mb-3">
                  Execute o SQL abaixo no <strong>Supabase Dashboard → SQL Editor</strong> para ativar o gerenciamento de equipe.
                </p>
                <div className="relative">
                  <pre className="text-xs bg-neutral-900 text-green-400 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-5">
                    {TEAM_SQL}
                  </pre>
                  <button
                    onClick={copySQL}
                    className="absolute top-3 right-3 flex items-center gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copiedSQL ? <Check size={12} /> : <Copy size={12} />}
                    {copiedSQL ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <Button variant="secondary" size="sm" className="mt-3" onClick={loadTeam}>
                  Verificar novamente
                </Button>
              </Card>
            )}

            {teamTableExists && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-900">Membros da Equipe</h4>
                    <p className="text-sm text-neutral-500">Adicione vendedores e defina quais páginas eles podem acessar.</p>
                  </div>
                  <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddMember(true)}>
                    Adicionar Membro
                  </Button>
                </div>

                {isLoadingTeam ? (
                  <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <Card className="py-12 text-center space-y-3">
                    <Users size={40} className="mx-auto text-neutral-300" />
                    <p className="font-medium text-neutral-500">Nenhum membro cadastrado ainda.</p>
                    <p className="text-sm text-neutral-400">Adicione vendedores para dar acesso limitado ao sistema.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => {
                      const memberInitials = member.name
                        .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <Card key={member.id} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-neutral-900 flex-shrink-0">
                            {memberInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-neutral-900">{member.name}</p>
                              <span className="px-2 py-0.5 bg-primary/15 text-primary-900 text-xs font-bold rounded-full capitalize">
                                {member.role}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-500 truncate">{member.email}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(member.allowed_pages || []).map((page) => (
                                <span key={page} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] rounded font-medium">
                                  {PAGE_LABELS[page as PageKey] || page}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            className="p-2 text-neutral-400 hover:text-danger hover:bg-danger-light rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 size={18} />
                          </button>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Info box */}
            <Card className="bg-neutral-50 border-neutral-200">
              <h5 className="font-bold text-neutral-700 text-sm mb-2">Como funciona?</h5>
              <ol className="text-sm text-neutral-500 space-y-1 list-decimal list-inside">
                <li>Adicione um membro com o email e as páginas que ele pode acessar.</li>
                <li>Compartilhe o link do sistema e uma senha com ele via WhatsApp.</li>
                <li>No primeiro acesso, ele cria a conta com o email cadastrado aqui.</li>
                <li>O sistema detecta automaticamente o perfil e restringe o acesso.</li>
              </ol>
            </Card>
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

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => { setShowAddMember(false); setMemberForm(emptyMemberForm()); }}
        title="Adicionar Membro da Equipe"
        maxWidth="lg"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome Completo"
              placeholder="Maria Silva"
              value={memberForm.name}
              onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="off"
            />
            <Input
              label="Email"
              type="email"
              placeholder="maria@email.com"
              value={memberForm.email}
              onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-neutral-700 mb-3">Páginas com Acesso</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GRANTABLE_PAGES.map((page) => {
                const checked = memberForm.allowedPages.includes(page);
                return (
                  <label
                    key={page}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none',
                      checked
                        ? 'border-primary bg-primary/10 text-neutral-900 font-semibold'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => handleTogglePage(page)}
                    />
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      checked ? 'border-primary bg-primary' : 'border-neutral-300'
                    )}>
                      {checked && <Check size={10} className="text-neutral-900" strokeWidth={3} />}
                    </div>
                    <span className="text-sm">{PAGE_LABELS[page]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>Como dar acesso:</strong> Após adicionar, compartilhe o link do sistema + o email cadastrado + uma senha de sua escolha com o membro. No primeiro acesso, o sistema criará a conta automaticamente.
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setShowAddMember(false); setMemberForm(emptyMemberForm()); }}>
              Cancelar
            </Button>
            <Button leftIcon={<Plus size={18} />} loading={isSavingMember} onClick={handleAddMember}>
              Adicionar Membro
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Configuracoes;
