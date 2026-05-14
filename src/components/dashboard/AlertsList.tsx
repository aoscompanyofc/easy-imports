import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { AlertTriangle, PackageX, Package, MessageCircle, Calendar, ChevronRight, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dataService } from '../../lib/dataService';
import { differenceInDays, differenceInHours } from 'date-fns';
import { formatCurrency } from '../../lib/formatters';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AlertItem {
  id: string;
  text: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  icon: React.ElementType;
}

export const AlertsList: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const buildAlerts = async () => {
      try {
        setIsLoading(true);
        const [products, leads, transactions] = await Promise.all([
          dataService.getProducts(),
          dataService.getLeads(),
          dataService.getTransactions()
        ]);

        const generatedAlerts: AlertItem[] = [];
        const now = new Date();

        // Product alerts — items sitting for too long
        if (products && products.length > 0) {
          const stale60 = products.filter(p => {
            const created = p.created_at ? new Date(p.created_at) : null;
            return created && differenceInDays(now, created) > 60 && (p.stock_quantity || 0) > 0;
          }).length;

          const stale30 = products.filter(p => {
            const created = p.created_at ? new Date(p.created_at) : null;
            return created && differenceInDays(now, created) > 30 && differenceInDays(now, created) <= 60 && (p.stock_quantity || 0) > 0;
          }).length;

          const outOfStock = products.filter(p => (p.stock_quantity || 0) <= 0).length;
          const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 2).length;

          if (stale60 > 0) {
            generatedAlerts.push({
              id: 'stale60',
              text: `${stale60} aparelho${stale60 > 1 ? 's' : ''} parado${stale60 > 1 ? 's' : ''} há mais de 60 dias`,
              type: 'danger',
              icon: PackageX,
            });
          }
          if (stale30 > 0) {
            generatedAlerts.push({
              id: 'stale30',
              text: `${stale30} aparelho${stale30 > 1 ? 's' : ''} parado${stale30 > 1 ? 's' : ''} há mais de 30 dias`,
              type: 'warning',
              icon: Package,
            });
          }
          if (outOfStock > 0) {
            generatedAlerts.push({
              id: 'outOfStock',
              text: `${outOfStock} produto${outOfStock > 1 ? 's' : ''} esgotado${outOfStock > 1 ? 's' : ''}`,
              type: 'danger',
              icon: PackageX,
            });
          }
          if (lowStock > 0) {
            generatedAlerts.push({
              id: 'lowStock',
              text: `${lowStock} produto${lowStock > 1 ? 's' : ''} com estoque baixo (≤2 unidades)`,
              type: 'warning',
              icon: Package,
            });
          }
        }

        // Leads alerts — leads without response
        if (leads && leads.length > 0) {
          const staleLeads = leads.filter(l => {
            const created = l.created_at ? new Date(l.created_at) : null;
            return created && differenceInHours(now, created) > 24 && (l.status === 'new' || l.status === 'novo');
          }).length;

          if (staleLeads > 0) {
            generatedAlerts.push({
              id: 'staleLeads',
              text: `${staleLeads} lead${staleLeads > 1 ? 's' : ''} sem resposta há mais de 24h`,
              type: 'warning',
              icon: MessageCircle,
            });
          }
        }

        // Transaction alerts — upcoming expenses
        if (transactions && transactions.length > 0) {
          const upcomingExpenses = transactions
            .filter(t => {
              if (t.type !== 'expense') return false;
              const txDate = t.date ? new Date(t.date) : null;
              if (!txDate) return false;
              const diff = differenceInDays(txDate, now);
              return diff >= 0 && diff <= 3;
            })
            .reduce((acc, t) => acc + Number(t.amount || 0), 0);

          if (upcomingExpenses > 0) {
            generatedAlerts.push({
              id: 'upcomingExpenses',
              text: `${formatCurrency(upcomingExpenses)} a pagar nos próximos 3 dias`,
              type: 'info',
              icon: Calendar,
            });
          }
        }

        setAlerts(generatedAlerts);
      } catch (error) {
        console.error('AlertsList error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    buildAlerts();
  }, []);

  const typeStyles = {
    danger: 'text-danger bg-danger-light',
    warning: 'text-warning bg-warning-light',
    info: 'text-info bg-info-light',
    success: 'text-success bg-success-light',
  };

  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-bold text-neutral-900">Atenção</h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
          <div className="w-14 h-14 bg-success-light rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-600">Tudo em dia!</p>
            <p className="text-xs text-neutral-400 mt-1">Nenhum alerta no momento.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              className="w-full flex items-center justify-between py-4 hover:bg-neutral-50 transition-colors group first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-4 text-left">
                <div className={cn('p-2.5 rounded-lg', typeStyles[alert.type])}>
                  <alert.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-neutral-700">{alert.text}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
