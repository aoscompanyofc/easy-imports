import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Erro desconhecido' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => window.location.reload();
  handleHome = () => { window.location.href = '/dashboard'; };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-neutral-100 p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="text-amber-500" size={48} />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Algo deu errado</h1>
          <p className="text-sm text-neutral-500 mb-2">
            Esta tela teve um problema, mas seus dados estão salvos. Tente novamente ou volte ao início.
          </p>
          <p className="text-xs text-neutral-400 mb-6 break-words font-mono">{this.state.message}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={this.handleReload}
              className="flex-1 py-3 rounded-xl bg-primary hover:brightness-95 text-neutral-900 font-bold transition"
            >
              Recarregar
            </button>
            <button
              onClick={this.handleHome}
              className="flex-1 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold transition"
            >
              Ir para o Início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
