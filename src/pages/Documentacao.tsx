import React, { useEffect, useState } from 'react';
import { FileText, Plus, Download, Trash2, Link2, FolderOpen, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { dataService } from '../lib/dataService';
import { formatDate } from '../lib/formatters';
import { generatePDF, type SalePDFData } from '../lib/pdfGenerator';
import { getCompanyInfo } from './Vendas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useProfileStore } from '../stores/profileStore';

const CATEGORIES = ['Vendas', 'Trocas', 'Compras', 'Procedimentos', 'Manuais', 'Financeiro', 'Marketing', 'Contratos', 'Importação', 'Outros'];

const CATEGORY_COLORS: Record<string, string> = {
  Vendas: 'bg-green-100 text-green-700',
  Trocas: 'bg-purple-100 text-purple-700',
  Compras: 'bg-blue-100 text-blue-700',
  Procedimentos: 'bg-indigo-100 text-indigo-700',
  Manuais: 'bg-teal-100 text-teal-700',
  Financeiro: 'bg-emerald-100 text-emerald-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Contratos: 'bg-amber-100 text-amber-700',
  Importação: 'bg-cyan-100 text-cyan-700',
  Outros: 'bg-neutral-100 text-neutral-600',
};

const emptyForm = () => ({ title: '', category: 'Procedimentos', file_url: '' });

export const Documentacao: React.FC = () => {
  const { signature: adminSignature } = useProfileStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filterCategory, setFilterCategory] = useState('');

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const [docsData, salesData] = await Promise.all([
        dataService.getDocuments(),
        dataService.getSales(),
      ]);
      
      const salesDocs = (salesData || []).map((sale: any) => ({
        id: `sale-${sale.id}`,
        title: `${(sale.sale_type || 'venda').toUpperCase()} ${sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`} — ${sale.customer_name || sale.seller_name || 'Cliente'}`,
        category: sale.sale_type === 'venda' ? 'Vendas' : sale.sale_type === 'troca' ? 'Trocas' : 'Compras',
        created_at: sale.created_at,
        isSale: true,
        saleData: sale
      }));

      // Sort all combined by created_at desc
      const combined = [...(docsData || []), ...salesDocs].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(combined);
    } catch (error: any) {
      toast.error('Erro ao carregar documentos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Informe o título do documento.'); return; }
    try {
      setIsSaving(true);
      await dataService.addDocument({ title: form.title.trim(), category: form.category, file_url: form.file_url.trim() });
      toast.success('Documento adicionado!');
      setIsModalOpen(false);
      setForm(emptyForm());
      fetchDocuments();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remover "${title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await dataService.deleteDocument(id);
      toast.success('Documento removido.');
      fetchDocuments();
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  const handleOpen = (doc: any) => {
    if (doc.isSale) {
      const sale = doc.saleData;
      const pdfData: SalePDFData = {
        sale_number: sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`,
        sale_type: sale.sale_type || 'venda',
        created_at: sale.created_at,
        seller_name: sale.seller_name || sale.customer_name,
        seller_cpf: sale.seller_cpf,
        seller_rg: sale.seller_rg,
        seller_phone: sale.seller_phone,
        seller_address: sale.seller_address,
        seller_email: sale.seller_email,
        customer_name: sale.customer_name || sale.customers?.name,
        customer_phone: sale.customer_phone,
        customer_cpf: sale.customer_cpf,
        customer_city: sale.customer_city || sale.customers?.city || '',
        product_name: sale.product_name,
        product_capacity: sale.product_capacity,
        product_color: sale.product_color,
        product_condition: sale.product_condition,
        product_imei: sale.product_imei,
        product_accessories: sale.product_accessories,
        total_amount: Number(sale.total_amount),
        payment_method: sale.payment_method,
        installments: sale.installments || 1,
        incoming_name: sale.incoming_name || undefined,
        incoming_imei: sale.incoming_imei || undefined,
        incoming_serial: sale.incoming_serial || undefined,
        incoming_email: sale.incoming_email || undefined,
        incoming_capacity: sale.incoming_capacity || undefined,
        incoming_color: sale.incoming_color || undefined,
        incoming_condition: sale.incoming_condition || undefined,
        incoming_battery_health: sale.incoming_battery_health || undefined,
        incoming_purchase_price: sale.incoming_purchase_price || undefined,
        signature_admin: adminSignature || undefined,
        signature_client: sale.signature_client || undefined,
      };
      generatePDF(pdfData, getCompanyInfo());
      return;
    }

    if (!doc.file_url) {
      toast('Este documento não tem link anexado.', { icon: 'ℹ️' });
      return;
    }
    const url = doc.file_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL inválida. Apenas links http:// ou https:// são permitidos.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filtered = filterCategory
    ? documents.filter((d) => d.category === filterCategory)
    : documents;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Documentação</h2>
          <p className="text-neutral-500">{documents.length} documento{documents.length !== 1 ? 's' : ''} cadastrado{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button leftIcon={<Plus size={20} />} onClick={() => { setForm(emptyForm()); setIsModalOpen(true); }}>
          Adicionar Documento
        </Button>
      </div>

      {/* Category filter pills */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory('')}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-bold transition-colors',
              filterCategory === '' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            ].join(' ')}
          >
            Todos ({documents.length})
          </button>
          {CATEGORIES.filter((c) => documents.some((d) => d.category === c)).map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
                className={[
                  'px-4 py-1.5 rounded-full text-sm font-bold transition-colors',
                  filterCategory === cat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                ].join(' ')}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
            <FolderOpen size={28} className="text-neutral-300" />
          </div>
          <div>
            <p className="font-bold text-neutral-700">
              {documents.length === 0 ? 'Nenhum documento ainda' : 'Nenhum documento nesta categoria'}
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              {documents.length === 0
                ? 'Adicione procedimentos, manuais, contratos ou qualquer arquivo com link.'
                : 'Selecione outra categoria ou remova o filtro.'}
            </p>
          </div>
          {documents.length === 0 && (
            <Button size="sm" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              Adicionar primeiro documento
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
          {(() => {
            const groupedDocuments = filtered.reduce((groups, doc) => {
              const d = new Date(doc.created_at);
              if (isNaN(d.getTime())) return groups;
              const monthKey = format(d, 'yyyy-MM');
              const dayKey = format(d, 'yyyy-MM-dd');

              if (!groups[monthKey]) groups[monthKey] = { label: format(d, 'MMMM yyyy', { locale: ptBR }), days: {} };
              if (!groups[monthKey].days[dayKey]) groups[monthKey].days[dayKey] = { label: format(d, "dd 'de' MMMM", { locale: ptBR }), docs: [] };
              
              groups[monthKey].days[dayKey].docs.push(doc);
              return groups;
            }, {} as any);

            const sortedMonths = Object.keys(groupedDocuments).sort((a, b) => b.localeCompare(a));

            return sortedMonths.map(monthKey => {
              const month = groupedDocuments[monthKey];
              const sortedDays = Object.keys(month.days).sort((a, b) => b.localeCompare(a));
              return (
                <div key={monthKey} className="animate-in fade-in duration-300">
                  <h3 className="text-xl font-black text-neutral-900 capitalize mb-4 flex items-center gap-2">
                    <Calendar className="text-neutral-400" size={24} />
                    {month.label}
                  </h3>
                  <div className="space-y-4">
                    {sortedDays.map(dayKey => {
                      const day = month.days[dayKey];
                      return (
                        <div key={dayKey} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="bg-neutral-50/80 border-b border-neutral-100 px-5 py-3 flex items-center">
                            <p className="font-bold text-neutral-600 text-sm">{day.label}</p>
                          </div>
                          <div className="divide-y divide-neutral-100">
                            {day.docs.map((doc: any) => (
                              <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors group">
                                <div className="p-2.5 bg-neutral-100 rounded-xl flex-shrink-0">
                                  <FileText size={18} className="text-neutral-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-neutral-900 truncate">{doc.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className={['px-2 py-0.5 rounded-full text-[10px] font-bold', CATEGORY_COLORS[doc.category] || CATEGORY_COLORS['Outros']].join(' ')}>
                                      {doc.category}
                                    </span>
                                    {doc.file_url && (
                                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                                        <Link2 size={10} /> Link anexado
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {(doc.file_url || doc.isSale) && (
                                    <button
                                      onClick={() => handleOpen(doc)}
                                      className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                      title={doc.isSale ? "Gerar PDF" : "Abrir link"}
                                    >
                                      <Download size={15} />
                                    </button>
                                  )}
                                  {!doc.isSale && (
                                    <button
                                      onClick={() => handleDelete(doc.id, doc.title)}
                                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Remover"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Documento">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Título *"
            placeholder="Ex: Tabela de Preços Maio 2026"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            autoComplete="off"
          />
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Input
              label="Link do arquivo (URL)"
              type="url"
              placeholder="https://drive.google.com/... ou qualquer link"
              value={form.file_url}
              onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
              leftIcon={<Link2 size={16} />}
              autoComplete="off"
            />
            <p className="text-xs text-neutral-400 mt-1">Cole o link do Google Drive, Dropbox, OneDrive, ou qualquer URL pública.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <Button fullWidth loading={isSaving} type="submit" leftIcon={<Plus size={16} />}>
              Salvar Documento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Documentacao;
