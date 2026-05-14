import React from 'react';
import { Card } from '../ui/Card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { ChartData } from '../../types';
import { formatCurrency } from '../../lib/formatters';

interface RevenueChartProps {
  data: ChartData[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <Card className="col-span-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-900">Faturamento dos últimos 30 dias</h3>
        <p className="text-sm text-neutral-500">Acompanhamento diário de vendas brutas</p>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFC107" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
              labelStyle={{ fontWeight: 600, color: '#1A1A1A', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#FFC107"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#FFC107' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
