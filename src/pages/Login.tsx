import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Bem-vindo ao Easy Imports!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Email ou senha inválidos';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm font-semibold animate-in slide-in-from-top-2 duration-300" role="alert">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
            >
              Entrar no Sistema
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center mb-4">Acesso de Demonstração</p>
            <div className="grid grid-cols-1 gap-2">
              <button 
                type="button"
                onClick={() => { setEmail('easyimportsbrstore@gmail.com'); setPassword('123456'); }}
                className="text-[11px] text-neutral-600 bg-neutral-50 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Clique para preencher credenciais
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-10 text-xs text-neutral-400 font-medium">
          © 2026 Easy Imports • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
