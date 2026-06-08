import React from 'react';
import { Card } from '../ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart2, PieChart as PieChartIcon } from 'lucide-react';

interface ChannelData {
  name: string;
  value: number;
  color: string;
}

interface ChannelChartProps {
  data: ChannelData[];
  view?: 'pie' | 'bar';
  onToggleView?: () => void;
}

export const ChannelChart: React.FC<ChannelChartProps> = ({ data, view = 'pie', onToggleView }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900">Vendas por canal</h3>
          <p className="text-xs text-neutral-500">Distribuição das vendas do período</p>
        </div>
        {onToggleView && (
          <button
            onClick={onToggleView}
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"
            title={view === 'pie' ? 'Ver como barras' : 'Ver como pizza'}
          >
            {view === 'pie' ? <BarChart2 size={14} /> : <PieChartIcon size={14} />}
          </button>
        )}
      </div>

      {view === 'pie' ? (
        <>
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
        </>
      ) : (
        <div className="space-y-2.5">
          {data.map(d => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="font-semibold text-neutral-700">{d.name}</span>
                  </div>
                  <span className="font-black text-neutral-900">{pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                </div>
                <p className="text-[10px] text-neutral-400 text-right">{d.value} venda{d.value !== 1 ? 's' : ''}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
