import React from 'react';
import { Card } from '../ui/Card';
import { formatCurrency, formatRelativeTime } from '../../lib/formatters';
import { Button } from '../ui/Button';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RealSale {
  id: string;
  customer_name?: string;
  product_name?: string;
  total_amount?: number;
  created_at?: string;
  customers?: { name?: string };
}

interface RecentSalesProps {
  sales: RealSale[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const RecentSales: React.FC<RecentSalesProps> = ({ sales }) => {
  const navigate = useNavigate();
  const displaySales = sales.slice(0, 5);

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-900">Últimas vendas</h3>
      </div>

      {displaySales.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-4">
          <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-7 h-7 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-600">Nenhuma venda registrada</p>
            <p className="text-xs text-neutral-400 mt-1">As vendas aparecerão aqui assim que você registrá-las.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-neutral-100">
          {displaySales.map((sale) => {
            const customerName = sale.customer_name || sale.customers?.name || 'Cliente';
            const productName = sale.product_name || 'Produto';
            const value = Number(sale.total_amount || 0);
            const timestamp = sale.created_at || new Date().toISOString();
            const initials = getInitials(customerName);

            return (
              <div key={sale.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-900 border border-primary-100">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-900">{customerName}</span>
                    <span className="text-xs text-neutral-500">{productName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-neutral-900 block">
                    {formatCurrency(value)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {formatRelativeTime(timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Button variant="secondary" fullWidth size="sm" onClick={() => navigate('/vendas')}>
          Ver todas as vendas
        </Button>
      </div>
    </Card>
  );
};
