import React from 'react';
import { Card } from '../ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChannelData {
  name: string;
  value: number;
  color: string;
}

interface ChannelChartProps {
  data: ChannelData[];
}

export const ChannelChart: React.FC<ChannelChartProps> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-bold text-neutral-900">Vendas por canal</h3>
        <p className="text-xs text-neutral-500">Distribuição das vendas do período</p>
      </div>

      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`${value} venda${value !== 1 ? 's' : ''} (${((value / total) * 100).toFixed(1)}%)`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5 mt-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-neutral-700 truncate">{item.name}</span>
            </div>
            <span className="text-xs text-neutral-400 flex-shrink-0">
              {item.value} ({((item.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
