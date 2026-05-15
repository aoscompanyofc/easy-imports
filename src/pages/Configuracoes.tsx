import React, { useState, useRef, useEffect } from 'react';
import {
  Settings, User, Bell, Shield, Database, Link, Trash2, Save,
  Key, RefreshCw, Camera, Users, Plus, X, Copy, Check, Loader2,
  Eye, EyeOff, MessageCircle, Shuffle, Calendar, Unlink,
} from 'lucide-react';
import {
  getClientId, setClientId, isConnected, connect, disconnect,
} from '../lib/googleCalendar';
import { createClient } from '@supabase/supabase-js';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { SignaturePad } from '../components/ui/SignaturePad';
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
  password: '',
  role: 'Vendedor',
  allowedPages: [...DEFAULT_VENDEDOR_PAGES] as PageKey[],
});

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Temporary Supabase client for creating users without affecting admin session
function makeTempClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const Configuracoes: React.FC = () => {
  const { user } = useAuthStore();
  const { name, cargo, avatar, telefone, cnpj, signature, setName, setCargo, setAvatar, setTelefone, setCnpj, setSignature } = useProfileStore();
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
  const [profileCnpj, setProfileCnpj] = useState(cnpj);

  // Sync local state when store changes externally
  useEffect(() => { setProfileName(name); }, [name]);
  useEffect(() => { setProfileCargo(cargo); }, [cargo]);
  useEffect(() => { setProfileTelefone(telefone); }, [telefone]);
  useEffect(() => { setProfileCnpj(cnpj); }, [cnpj]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ─── Google Calendar state ────────────────────────────────────────────
  const [gcClientId, setGcClientId] = useState(getClientId());
  const [gcConnected, setGcConnected] = useState(isConnected());
  const [isConnectingGC, setIsConnectingGC] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── Team state ───────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamTableExists, setTeamTableExists] = useState<boolean | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMemberForm());
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string } | null>(null);

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
      // Each setter syncs to Supabase automatically via profileStore
      setName(profileName.trim() || user?.name || '');
      setCargo(profileCargo.trim() || 'Administrador');
      setTelefone(profileTelefone.trim());
      setCnpj(profileCnpj.trim());
      await new Promise((res) => setTimeout(res, 400));
      toast.success('Perfil salvo e sincronizado!');
    } catch (error: any) {
      toast.error('Erro ao salvar perfil: ' + error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Informe a senha atual.'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem!'); return; }
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres!'); return; }
    try {
      setIsUpdatingPassword(true);
      // Re-authenticate with current password before allowing change
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (signInError) { toast.error('Senha atual incorreta.'); return; }
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
    const name = memberForm.name.trim();
    const email = memberForm.email.trim().toLowerCase();
    const password = memberForm.password.trim();

    if (!name || !email) { toast.error('Nome e email são obrigatórios.'); return; }
    if (!password || password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres.'); return; }
    if (memberForm.allowedPages.length === 0) { toast.error('Selecione pelo menos uma página.'); return; }

    try {
      setIsSavingMember(true);

      // 1. Create Supabase auth account using isolated client (doesn't affect admin session)
      const tempClient = makeTempClient();
      const { error: signUpError } = await tempClient.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      // Ignore "already registered" — just update permissions below
      if (signUpError && !signUpError.message?.toLowerCase().includes('already registered')) {
        throw new Error(signUpError.message);
      }

      // 2. Save permissions to team_members
      await dataService.addTeamMember({
        name,
        email,
        role: memberForm.role.trim() || 'Vendedor',
        allowed_pages: memberForm.allowedPages,
      });

      // 3. Show credentials screen
      setCreatedCredentials({ name, email, password });
      setMemberForm(emptyMemberForm());
      loadTeam();
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        toast.error('Esse email já está cadastrado na equipe.');
      } else {
        toast.error('Erro: ' + error.message);
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
              <Input
                label="CNPJ da Empresa"
                placeholder="00.000.000/0001-00"
                value={profileCnpj}
                onChange={(e) => setProfileCnpj(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Signature section */}
            <div className="pt-2">
              <p className="text-sm font-bold text-neutral-700 mb-1">Sua Assinatura</p>
              <p className="text-xs text-neutral-400 mb-3">Desenhe sua assinatura abaixo. Ela será inserida automaticamente em todos os documentos PDF gerados.</p>
              <SignaturePad
                value={signature}
                onChange={(sig) => { setSignature(sig); }}
                height={130}
                placeholder="Desenhe sua assinatura aqui"
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

      case 'integrations':
        return (
          <div className="space-y-6">
            {/* Google Calendar */}
            <Card>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-neutral-900">Google Agenda</h3>
                  <p className="text-sm text-neutral-500">Cria um evento automático no seu Google Calendar a cada venda registrada.</p>
                </div>
                <span className={[
                  'px-3 py-1 rounded-full text-xs font-bold flex-shrink-0',
                  gcConnected ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500',
                ].join(' ')}>
                  {gcConnected ? '● Conectado' : '○ Desconectado'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Client ID do Google</label>
                  <input
                    type="text"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                    placeholder="000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    value={gcClientId}
                    onChange={(e) => setGcClientId(e.target.value)}
                    disabled={gcConnected}
                  />
                  <p className="text-xs text-neutral-400 mt-1.5">
                    Crie em{' '}
                    <span className="font-mono text-blue-600">console.cloud.google.com</span>
                    {' '}→ APIs e Serviços → Credenciais → Criar credencial → ID do cliente OAuth 2.0 → tipo <strong>Aplicativo da Web</strong>.
                    Adicione <code className="bg-neutral-100 px-1 rounded">{window.location.origin}</code> em "Origens JavaScript autorizadas".
                  </p>
                </div>

                <div className="flex gap-3">
                  {gcConnected ? (
                    <Button
                      variant="secondary"
                      leftIcon={<Unlink size={16} />}
                      onClick={async () => {
                        await disconnect();
                        setGcConnected(false);
                        toast.success('Google Agenda desconectado.');
                      }}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      leftIcon={<Calendar size={16} />}
                      loading={isConnectingGC}
                      disabled={!gcClientId.trim()}
                      onClick={async () => {
                        if (!gcClientId.trim()) { toast.error('Informe o Client ID primeiro.'); return; }
                        setIsConnectingGC(true);
                        try {
                          setClientId(gcClientId.trim());
                          await connect(gcClientId.trim());
                          setGcConnected(true);
                          toast.success('Google Agenda conectado com sucesso!');
                        } catch (e: any) {
                          toast.error('Erro ao conectar: ' + e.message);
                        } finally {
                          setIsConnectingGC(false);
                        }
                      }}
                    >
                      Conectar ao Google Agenda
                    </Button>
                  )}
                </div>

                {/* How it works */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm text-blue-800">
                  <p className="font-bold text-blue-900">Como funciona</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Conecte com sua conta Google clicando no botão acima.</li>
                    <li>A cada venda ou troca registrada, um evento é criado automaticamente no seu Google Calendar.</li>
                    <li>O evento contém: cliente, produto, IMEI, valor, forma de pagamento e link de assinatura.</li>
                    <li>O token expira em 1h — reconecte quando necessário (ou mantenha a aba aberta).</li>
                  </ol>
                </div>
              </div>
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
        onClose={() => { setShowAddMember(false); setMemberForm(emptyMemberForm()); setCreatedCredentials(null); setShowPassword(false); }}
        title={createdCredentials ? '✅ Acesso criado com sucesso!' : 'Adicionar Colaborador'}
        maxWidth="lg"
      >
        {createdCredentials ? (
          /* ── Credentials screen ── */
          <div className="space-y-5">
            <p className="text-sm text-neutral-600">
              A conta de <strong>{createdCredentials.name}</strong> foi criada. Compartilhe as credenciais abaixo:
            </p>

            <div className="bg-neutral-900 rounded-2xl p-5 space-y-3 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-0.5">Link do sistema</p>
                  <p className="text-sm font-mono">{window.location.origin}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success('Link copiado!'); }}
                  className="p-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 transition-colors flex-shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="border-t border-neutral-700" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-sm font-mono">{createdCredentials.email}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdCredentials.email); toast.success('Email copiado!'); }}
                  className="p-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 transition-colors flex-shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="border-t border-neutral-700" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-0.5">Senha</p>
                  <p className="text-sm font-mono">{createdCredentials.password}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdCredentials.password); toast.success('Senha copiada!'); }}
                  className="p-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 transition-colors flex-shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const msg = `Olá ${createdCredentials.name}! 👋\n\nSeu acesso ao Easy Imports foi criado:\n\n🔗 Link: ${window.location.origin}\n📧 Email: ${createdCredentials.email}\n🔑 Senha: ${createdCredentials.password}\n\nGuarde bem sua senha!`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors"
              >
                <MessageCircle size={18} />
                Enviar pelo WhatsApp
              </button>
              <Button
                variant="secondary"
                onClick={() => {
                  const msg = `Link: ${window.location.origin}\nEmail: ${createdCredentials.email}\nSenha: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(msg);
                  toast.success('Credenciais copiadas!');
                }}
              >
                <Copy size={16} />
              </Button>
            </div>

            <Button fullWidth onClick={() => { setCreatedCredentials(null); setShowAddMember(false); }}>
              Fechar
            </Button>
          </div>
        ) : (
          /* ── Add form ── */
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                placeholder="Ex: João Silva"
                value={memberForm.name}
                onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="off"
              />
              <Input
                label="Email"
                type="email"
                placeholder="joao@email.com"
                value={memberForm.email}
                onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="off"
              />
            </div>

            {/* Role / function — free text */}
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Cargo / Função</label>
              <input
                type="text"
                placeholder="Ex: Vendedor, Estagiário, Gestor de Tráfego, Marketing…"
                value={memberForm.role}
                onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}
                autoComplete="off"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
              <p className="text-xs text-neutral-400 mt-1">Digite o cargo desta pessoa na empresa.</p>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Senha de Acesso</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={memberForm.password}
                    onChange={(e) => setMemberForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberForm((f) => ({ ...f, password: generatePassword() }))}
                  className="px-3 py-2.5 border border-neutral-200 rounded-xl text-neutral-500 hover:text-primary hover:border-primary/30 transition-colors"
                  title="Gerar senha aleatória"
                >
                  <Shuffle size={16} />
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-1">Você vai compartilhar essa senha com o colaborador.</p>
            </div>

            {/* Pages access */}
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
                        checked ? 'border-primary bg-primary/10 text-neutral-900 font-semibold' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      )}
                    >
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => handleTogglePage(page)} />
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors', checked ? 'border-primary bg-primary' : 'border-neutral-300')}>
                        {checked && <Check size={10} className="text-neutral-900" strokeWidth={3} />}
                      </div>
                      <span className="text-sm">{PAGE_LABELS[page]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setShowAddMember(false); setMemberForm(emptyMemberForm()); }}>
                Cancelar
              </Button>
              <Button leftIcon={<Plus size={18} />} loading={isSavingMember} onClick={handleAddMember}>
                Criar Acesso
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Configuracoes;
