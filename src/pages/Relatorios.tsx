import React, { useState } from 'react';
import { BarChart3, Download, FileText, Calendar, Filter, ArrowUpRight, TrendingUp, PieChart, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Relatorios: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customReportType, setCustomReportType] = useState('Vendas');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const handleExport = (type: string) => {
    setIsExporting(true);
    toast.loading(`Gerando relatório de ${type}...`);
    
    setTimeout(() => {
      toast.dismiss();
      setIsExporting(false);
      toast.success(`Relatório de ${type} exportado com sucesso!`);
      
      const content = "Data,Venda,Custo,Lucro\n2026-05-01,1500,1000,500";
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `relatorio_${type.toLowerCase()}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 2000);
  };

  const reports = [
    { title: 'Vendas Mensais', description: 'Resumo detalhado de todas as vendas do mês atual.', icon: BarChart3, color: 'text-primary' },
    { title: 'Estoque & Custo', description: 'Valoração do estoque atual e projeção de faturamento.', icon: FileText, color: 'text-info' },
    { title: 'Lucratividade', description: 'Análise de margens por categoria e produto.', icon: TrendingUp, color: 'text-success' },
    { title: 'Performance Leads', description: 'Taxas de conversão e custo por aquisição.', icon: PieChart, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Relatórios</h2>
          <p className="text-neutral-500">Análise de performance e exportação de dados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Calendar size={20} />}>
            Maio 2026
          </Button>
          <Button variant="secondary" leftIcon={<Filter size={20} />}>
            Filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2">
          <span className="text-xs font-bold text-neutral-400 uppercase">Crescimento Mensal</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-neutral-900">+24.5%</span>
            <Badge variant="success" size="sm">+12% vs abr</Badge>
          </div>
          <p className="text-xs text-neutral-500">Baseado no faturamento bruto</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="group hover:border-primary transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('p-3 bg-neutral-50 rounded-xl group-hover:bg-primary/10 transition-colors', report.color)}>
                  <report.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">{report.title}</h4>
                  <p className="text-sm text-neutral-500">{report.description}</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                iconOnly
                onClick={() => handleExport(report.title)}
                disabled={isExporting}
              >
                <Download size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-neutral-200">
        <div className="p-4 bg-primary/5 text-primary rounded-full">
          <ArrowUpRight size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-neutral-900">Personalizar Relatório</h3>
          <p className="text-neutral-500 max-w-md mx-auto">
            Precisa de uma análise específica? Selecione os campos e gere um relatório personalizado agora.
          </p>
        </div>
        <Button onClick={() => setIsCustomModalOpen(true)}>Criar Relatório Customizado</Button>
      </Card>

      <Modal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} title="Criar Relatório Customizado">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Tipo de Relatório</label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
              value={customReportType}
              onChange={e => setCustomReportType(e.target.value)}
            >
              <option value="Vendas">Vendas</option>
              <option value="Estoque">Estoque & Custo</option>
              <option value="Lucratividade">Lucratividade</option>
              <option value="Clientes">Clientes</option>
              <option value="Leads">Leads & Conversão</option>
              <option value="Financeiro">Financeiro Completo</option>
            </select>
          </div>
          <Input label="Data inicial" type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} />
          <Input label="Data final" type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} />
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" fullWidth onClick={() => setIsCustomModalOpen(false)}>Cancelar</Button>
            <Button
              fullWidth
              leftIcon={<Download size={18} />}
              loading={isGeneratingCustom}
              onClick={() => {
                setIsGeneratingCustom(true);
                setTimeout(() => {
                  const from = customDateFrom || 'início';
                  const to = customDateTo || 'hoje';
                  const content = `Relatório Customizado: ${customReportType}\nPeríodo: ${from} até ${to}\nGerado em: ${new Date().toLocaleString('pt-BR')}\n\nDados exportados com sucesso.`;
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `relatorio_${customReportType.toLowerCase()}_customizado.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setIsGeneratingCustom(false);
                  setIsCustomModalOpen(false);
                  toast.success(`Relatório de ${customReportType} exportado!`);
                }, 1500);
              }}
            >
              Gerar e Exportar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Relatorios;
