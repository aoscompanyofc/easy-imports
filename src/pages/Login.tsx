import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url !== 'YOUR_SUPABASE_URL' && url.includes('supabase.co') && key && key !== 'YOUR_SUPABASE_ANON_KEY';
};

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signup(email, password, name);
        if (result.needsConfirmation) {
          setEmailSent(true);
        } else {
          toast.success('Conta criada! Bem-vindo ao Easy Imports!');
          navigate('/dashboard');
        }
      } else {
        await login(email, password);
        toast.success('Bem-vindo ao Easy Imports!');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'signup' : 'login'));
    setError('');
    setEmailSent(false);
    setName('');
    setEmail('');
    setPassword('');
  };

  const supabaseEnabled = isSupabaseConfigured();

  if (emailSent) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] text-center animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-black font-bold text-2xl">E</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-900/5">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Verifique seu email</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar sua conta.
            </p>
            <button
              onClick={toggleMode}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-black font-bold text-2xl">E</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span>Easy</span>
              <span className="text-primary">Imports</span>
            </h1>
          </div>
          <p className="text-neutral-500 font-medium">Sistema de Gestão</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-900/5">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">
            {mode === 'login' ? 'Entrar na conta' : 'Criar nova conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <Input
                label="Nome completo"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User size={20} />}
                required
                id="signup-name"
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={20} />}
              required
              id="login-email"
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={20} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              required
              id="login-password"
            />

            {error && (
              <div
                className="flex items-center gap-2 p-3 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm font-semibold animate-in slide-in-from-top-2 duration-300"
                role="alert"
              >
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={isLoading}>
              {mode === 'login' ? 'Entrar no Sistema' : 'Criar conta'}
            </Button>
          </form>

          {supabaseEnabled && (
            <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
              <p className="text-sm text-neutral-500">
                {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary font-semibold hover:underline"
                >
                  {mode === 'login' ? 'Criar conta' : 'Entrar'}
                </button>
              </p>
            </div>
          )}

          {!supabaseEnabled && (
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center mb-4">
                Acesso de Demonstração
              </p>
              <button
                type="button"
                onClick={() => {
                  setEmail('easyimportsbrstore@gmail.com');
                  setPassword('123456');
                }}
                className="w-full text-[11px] text-neutral-600 bg-neutral-50 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Clique para preencher credenciais
              </button>
            </div>
          )}
        </div>

        <p className="text-center mt-10 text-xs text-neutral-400 font-medium">
          © 2026 Easy Imports • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
