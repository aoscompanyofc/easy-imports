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

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="text-amber-500" size={48} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
          <p className="text-sm text-gray-500 mb-6 break-words">{this.state.message}</p>
          <button
            onClick={this.handleReload}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-semibold transition"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
