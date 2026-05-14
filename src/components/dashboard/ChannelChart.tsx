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
    <Card className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-neutral-900">Vendas por canal</h3>
        <p className="text-sm text-neutral-500">Distribuição das vendas do período</p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`${value} vendas (${((value / total) * 100).toFixed(1)}%)`, 'Canal']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-neutral-700 truncate max-w-[100px]">
                {item.name}
              </span>
              <span className="text-[10px] text-neutral-400">
                {item.value} vendas ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
