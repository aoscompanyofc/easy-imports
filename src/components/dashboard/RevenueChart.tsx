import React from 'react';
import { Card } from '../ui/Card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency } from '../../lib/formatters';

interface ChartPoint {
  date: string;
  value: number;
}

interface RevenueChartProps {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-lg">
        <p className="text-xs font-bold text-neutral-500 mb-1">{label}</p>
        <p className="text-base font-bold text-neutral-900">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = 'Faturamento do Mês',
  subtitle = 'Vendas brutas por dia',
}) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const formatYAxis = (value: number) => {
    if (maxVal >= 100000) return `R$${(value / 1000).toFixed(0)}k`;
    if (maxVal >= 10000) return `R$${(value / 1000).toFixed(1)}k`;
    if (value === 0) return 'R$0';
    return `R$${value.toLocaleString('pt-BR')}`;
  };

  return (
    <Card className="col-span-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
        <p className="text-sm text-neutral-500">{subtitle}</p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFC107" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              dy={8}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={formatYAxis}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#FFC107"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 5, strokeWidth: 0, fill: '#FFC107' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
