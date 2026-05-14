import React from 'react';
import { Card } from '../ui/Card';

interface Product {
  id: string;
  name: string;
  salesCount: number;
}

interface TopProductsProps {
  products: Product[];
}

export const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  const maxSales = products[0]?.salesCount || 1;

  return (
    <Card className="h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-900">Top 5 produtos do mês</h3>
      </div>

      <div className="space-y-6">
        {products.map((product, index) => (
          <div key={product.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-900">
                  #{index + 1}
                </div>
                <span className="text-sm font-semibold text-neutral-800 truncate max-w-[200px]">
                  {product.name}
                </span>
              </div>
              <span className="text-sm font-bold text-neutral-900">{product.salesCount} vendas</span>
            </div>
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${(product.salesCount / maxSales) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
