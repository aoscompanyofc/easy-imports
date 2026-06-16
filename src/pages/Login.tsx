import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo ao Easy Imports!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro';
      setLoginError(message);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (!signupName.trim()) { setSignupError('Informe seu nome.'); return; }
    if (signupPassword.length < 6) { setSignupError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (signupPassword !== signupConfirm) { setSignupError('As senhas não coincidem.'); return; }
    setIsSignupLoading(true);
    try {
      const result = await signup(signupEmail, signupPassword, signupName.trim());
      if (result.needsConfirmation) {
        setSignupDone(true);
      } else {
        toast.success('Conta criada! Bem-vindo ao Easy Imports!');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao criar a conta';
      setSignupError(message);
    } finally {
      setIsSignupLoading(false);
    }
  };

  const supabaseEnabled = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/favicon.png" alt="Easy Imports" className="w-12 h-12 object-contain" />
            <h1 className="text-4xl font-bold tracking-tight">
              <span>Easy</span>
              <span className="text-primary">Imports</span>
            </h1>
          </div>
          <p className="text-neutral-500 font-medium">Sistema de Gestão</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-900/5">
          {/* Tabs */}
          {supabaseEnabled && (
            <div className="flex mb-6 bg-neutral-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setTab('login'); setLoginError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'login' ? 'bg-white shadow text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setSignupError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'signup' ? 'bg-white shadow text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* ── LOGIN ── */}
          {(tab === 'login' || !supabaseEnabled) && (
            <>
              {!supabaseEnabled && (
                <h2 className="text-lg font-bold text-neutral-900 mb-6">Entrar na conta</h2>
              )}
              <form onSubmit={handleLogin} className="space-y-5">
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
                  placeholder="••••••"
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
                {loginError && (
                  <div className="flex items-center gap-2 p-3 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm font-semibold animate-in slide-in-from-top-2 duration-300" role="alert">
                    <AlertCircle size={18} />
                    {loginError}
                  </div>
                )}
                <Button type="submit" fullWidth size="lg" loading={isLoginLoading}>
                  Entrar no Sistema
                </Button>
              </form>

              {!supabaseEnabled && (
                <div className="mt-6 pt-6 border-t border-neutral-100">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center mb-4">
                    Acesso de Demonstração
                  </p>
                  <button
                    type="button"
                    onClick={() => { setEmail('easyimportsbrstore@gmail.com'); setPassword('123456'); }}
                    className="w-full text-[11px] text-neutral-600 bg-neutral-50 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    Clique para preencher credenciais
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── SIGNUP ── */}
          {tab === 'signup' && supabaseEnabled && (
            <>
              {signupDone ? (
                <div className="text-center py-4">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                      <CheckCircle size={36} className="text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">Verifique seu e-mail</h3>
                  <p className="text-sm text-neutral-500 mb-6">
                    Enviamos um link de confirmação para <strong>{signupEmail}</strong>. Clique no link para ativar sua conta e depois faça login.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setSignupDone(false); }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Ir para o login →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <Input
                    label="Seu nome"
                    type="text"
                    placeholder="João Silva"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    leftIcon={<User size={20} />}
                    required
                    id="signup-name"
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    leftIcon={<Mail size={20} />}
                    required
                    id="signup-email"
                  />
                  <Input
                    label="Senha"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    leftIcon={<Lock size={20} />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showSignupPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    }
                    required
                    id="signup-password"
                  />
                  <Input
                    label="Confirmar senha"
                    type="password"
                    placeholder="Repita a senha"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    leftIcon={<Lock size={20} />}
                    required
                    id="signup-confirm"
                  />
                  {signupError && (
                    <div className="flex items-center gap-2 p-3 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm font-semibold animate-in slide-in-from-top-2 duration-300" role="alert">
                      <AlertCircle size={18} />
                      {signupError}
                    </div>
                  )}
                  <Button type="submit" fullWidth size="lg" loading={isSignupLoading}>
                    Criar minha conta
                  </Button>
                  <p className="text-[11px] text-neutral-400 text-center">
                    Ao criar sua conta você terá um dashboard isolado com seus dados.
                  </p>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center mt-10 text-xs text-neutral-400 font-medium">
          © 2026 Easy Imports • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
