export interface CompanyInfo {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
}

export interface SalePDFData {
  sale_number: string;
  sale_type: string;
  created_at: string;
  // Vendedor (quem vende para a Easy Imports)
  seller_name?: string;
  seller_cpf?: string;
  seller_rg?: string;
  seller_phone?: string;
  seller_address?: string;
  seller_email?: string;
  // Cliente (quem compra da Easy Imports) — para tipo "venda"
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  // Produto
  product_name?: string;
  product_capacity?: string;
  product_color?: string;
  product_condition?: string;
  product_imei?: string;
  product_accessories?: string;
  // Financeiro
  total_amount?: number;
  payment_method?: string;
}

const fmt = (v?: string | null) => v || '______________________________';
const fmtVal = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const BASE_STYLES = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.7;
    color: #111;
    padding: 32px 40px;
    max-width: 760px;
    margin: 0 auto;
  }
  h1 {
    text-align: center;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 900;
    margin-bottom: 4px;
  }
  .doc-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    border-bottom: 2px solid #111;
    padding-bottom: 10px;
    margin-bottom: 18px;
    margin-top: 12px;
  }
  .section {
    margin-bottom: 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }
  .section-title {
    background: #111;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 5px 10px;
  }
  .section-body { padding: 10px 12px; }
  .field-row { display: flex; gap: 24px; margin-bottom: 2px; }
  .field { flex: 1; min-width: 0; }
  .field-label { font-size: 9px; text-transform: uppercase; color: #666; font-weight: 700; letter-spacing: 0.5px; }
  .field-value {
    border-bottom: 1px solid #aaa;
    min-height: 17px;
    font-size: 11px;
    padding: 1px 2px;
    word-break: break-word;
  }
  .declaration-box {
    border: 1px solid #999;
    border-radius: 4px;
    padding: 12px;
    font-size: 11px;
    text-align: justify;
    line-height: 1.8;
    margin: 4px 0;
  }
  .sig-area {
    display: flex;
    gap: 48px;
    margin-top: 36px;
    padding-top: 12px;
  }
  .sig-block { flex: 1; text-align: center; }
  .sig-line {
    border-top: 1.5px solid #111;
    margin-top: 48px;
    padding-top: 5px;
    font-size: 11px;
    font-weight: 700;
  }
  .sig-sub { font-size: 9px; color: #555; margin-top: 2px; }
  .footer {
    margin-top: 24px;
    text-align: center;
    font-size: 9px;
    color: #999;
    border-top: 1px solid #ddd;
    padding-top: 6px;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 15mm; size: A4 portrait; }
  }
`;

function field(label: string, value?: string, full = false) {
  return `
    <div class="field" style="${full ? 'flex:2' : ''}">
      <div class="field-label">${label}</div>
      <div class="field-value">${fmt(value)}</div>
    </div>`;
}

function openWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'width=860,height=960');
  if (!w) { alert('Permita pop-ups para gerar o PDF.'); return; }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  setTimeout(() => w.print(), 600);
}

// ──────────────────────────────────────────────────────────
//  DOCUMENTO DE COMPRA DE PRODUTO USADO
// ──────────────────────────────────────────────────────────
export function generateCompraPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = new Date(sale.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Compra #${sale.sale_number}</title>
  <style>${BASE_STYLES}</style></head><body>

  <h1>Documento de Compra de Produto Usado</h1>
  <div class="doc-meta">
    <span><strong>Nº ${sale.sale_number}</strong></span>
    <span>Data de Emissão: <strong>${dateStr}</strong></span>
  </div>

  <div class="section">
    <div class="section-title">Dados da Compradora</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Razão Social', company.name, true)}
        ${field('CNPJ', company.cnpj)}
      </div>
      <div class="field-row">
        ${field('Telefone', company.phone)}
        ${field('E-mail', company.email, true)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Vendedor</div>
    <div class="section-body">
      <div class="field-row">${field('Nome Completo', sale.seller_name, true)}</div>
      <div class="field-row">
        ${field('CPF', sale.seller_cpf)}
        ${field('RG', sale.seller_rg)}
        ${field('Telefone', sale.seller_phone)}
      </div>
      <div class="field-row">${field('Endereço Completo', sale.seller_address, true)}</div>
      <div class="field-row">${field('E-mail', sale.seller_email, true)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Produto</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Produto / Modelo', sale.product_name, true)}
        ${field('Capacidade', sale.product_capacity)}
      </div>
      <div class="field-row">
        ${field('Cor', sale.product_color)}
        ${field('Estado de Conservação', sale.product_condition)}
      </div>
      <div class="field-row">
        ${field('IMEI', sale.product_imei, true)}
      </div>
      <div class="field-row">
        ${field('Acessórios Inclusos', sale.product_accessories, true)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Condições da Compra</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Valor Pago', fmtVal(sale.total_amount))}
        ${field('Forma de Pagamento', sale.payment_method)}
        ${field('Data do Pagamento', dateStr)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Declaração do Vendedor</div>
    <div class="section-body">
      <div class="declaration-box">
        O vendedor declara, sob responsabilidade civil e criminal, ser o legítimo proprietário do
        produto descrito, garantindo que o mesmo <strong>não é produto de furto, roubo ou receptação</strong>,
        não possui bloqueios ativos (iCloud, Google, operadora) e está livre de qualquer restrição legal.
        Em caso de constatação posterior de irregularidade, o vendedor compromete-se a restituir
        integralmente o valor pago no prazo de <strong>48 horas</strong>.
      </div>
    </div>
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-line">Vendedor</div>
      <div class="sig-sub">${fmt(sale.seller_name)}</div>
      <div class="sig-sub">CPF: ${fmt(sale.seller_cpf)}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${company.name}</div>
      <div class="sig-sub">CNPJ: ${company.cnpj}</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado em ${new Date().toLocaleString('pt-BR')} — Easy Imports Sistema de Gestão
  </div>
</body></html>`;

  openWindow(html, `Compra #${sale.sale_number}`);
}

// ──────────────────────────────────────────────────────────
//  RECIBO DE VENDA
// ──────────────────────────────────────────────────────────
export function generateVendaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = new Date(sale.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Venda #${sale.sale_number}</title>
  <style>${BASE_STYLES}</style></head><body>

  <h1>Recibo de Venda</h1>
  <div class="doc-meta">
    <span><strong>Nº ${sale.sale_number}</strong></span>
    <span>Data: <strong>${dateStr}</strong></span>
  </div>

  <div class="section">
    <div class="section-title">Dados da Loja Vendedora</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Razão Social', company.name, true)}
        ${field('CNPJ', company.cnpj)}
      </div>
      <div class="field-row">
        ${field('Telefone', company.phone)}
        ${field('E-mail', company.email, true)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Comprador</div>
    <div class="section-body">
      <div class="field-row">${field('Nome Completo', sale.customer_name, true)}</div>
      <div class="field-row">
        ${field('CPF', sale.customer_cpf)}
        ${field('Telefone', sale.customer_phone)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Produto Vendido</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Produto / Modelo', sale.product_name, true)}
        ${field('Capacidade', sale.product_capacity)}
      </div>
      <div class="field-row">
        ${field('Cor', sale.product_color)}
        ${field('Estado', sale.product_condition)}
      </div>
      <div class="field-row">${field('IMEI', sale.product_imei, true)}</div>
      <div class="field-row">${field('Acessórios Inclusos', sale.product_accessories, true)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Condições da Venda</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Valor Total', fmtVal(sale.total_amount))}
        ${field('Forma de Pagamento', sale.payment_method)}
        ${field('Data', dateStr)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Declaração</div>
    <div class="section-body">
      <div class="declaration-box">
        O comprador declara ter recebido o produto descrito acima em perfeito estado de funcionamento,
        de acordo com as condições acordadas, e que está ciente de se tratar de produto usado.
        A loja garante que o aparelho está <strong>livre de bloqueios (iCloud, Google, operadora)</strong>
        no momento da venda. Após a entrega, qualquer problema decorrente de mau uso é de
        responsabilidade do comprador.
      </div>
    </div>
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-line">Comprador</div>
      <div class="sig-sub">${fmt(sale.customer_name)}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${company.name}</div>
      <div class="sig-sub">CNPJ: ${company.cnpj}</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado em ${new Date().toLocaleString('pt-BR')} — Easy Imports Sistema de Gestão
  </div>
</body></html>`;

  openWindow(html, `Venda #${sale.sale_number}`);
}

// ──────────────────────────────────────────────────────────
//  DOCUMENTO DE TROCA
// ──────────────────────────────────────────────────────────
export function generateTrocaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = new Date(sale.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Troca #${sale.sale_number}</title>
  <style>${BASE_STYLES}</style></head><body>

  <h1>Documento de Troca de Produto</h1>
  <div class="doc-meta">
    <span><strong>Nº ${sale.sale_number}</strong></span>
    <span>Data: <strong>${dateStr}</strong></span>
  </div>

  <div class="section">
    <div class="section-title">Dados da Loja</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Razão Social', company.name, true)}
        ${field('CNPJ', company.cnpj)}
      </div>
      <div class="field-row">
        ${field('Telefone', company.phone)}
        ${field('E-mail', company.email, true)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Cliente</div>
    <div class="section-body">
      <div class="field-row">${field('Nome Completo', sale.customer_name || sale.seller_name, true)}</div>
      <div class="field-row">
        ${field('CPF', sale.customer_cpf || sale.seller_cpf)}
        ${field('Telefone', sale.customer_phone || sale.seller_phone)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Produto Entregue pela Loja</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Produto / Modelo', sale.product_name, true)}
        ${field('Capacidade', sale.product_capacity)}
      </div>
      <div class="field-row">
        ${field('Cor', sale.product_color)}
        ${field('Estado', sale.product_condition)}
      </div>
      <div class="field-row">${field('IMEI', sale.product_imei, true)}</div>
      <div class="field-row">${field('Acessórios', sale.product_accessories, true)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Produto Recebido pelo Cliente (entregue à loja)</div>
    <div class="section-body">
      <div class="field-row">${field('Produto / Modelo', undefined, true)}</div>
      <div class="field-row">
        ${field('Capacidade')}
        ${field('Cor')}
        ${field('Estado')}
      </div>
      <div class="field-row">${field('IMEI', undefined, true)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Condições Financeiras</div>
    <div class="section-body">
      <div class="field-row">
        ${field('Valor do Produto da Loja', fmtVal(sale.total_amount))}
        ${field('Valor do Produto do Cliente')}
      </div>
      <div class="field-row">
        ${field('Diferença Paga')}
        ${field('Forma de Pagamento', sale.payment_method)}
        ${field('Data', dateStr)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Declaração</div>
    <div class="section-body">
      <div class="declaration-box">
        Ambas as partes declaram estar de acordo com as condições da troca acima descritas.
        O cliente declara que o produto entregue à loja é de sua legítima propriedade, livre de bloqueios
        e restrições legais. A loja garante que o produto entregue ao cliente está funcionando
        corretamente e livre de bloqueios (iCloud, Google, operadora) no ato da entrega.
      </div>
    </div>
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-line">Cliente</div>
      <div class="sig-sub">${fmt(sale.customer_name || sale.seller_name)}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${company.name}</div>
      <div class="sig-sub">CNPJ: ${company.cnpj}</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado em ${new Date().toLocaleString('pt-BR')} — Easy Imports Sistema de Gestão
  </div>
</body></html>`;

  openWindow(html, `Troca #${sale.sale_number}`);
}

export function generatePDF(sale: SalePDFData, company: CompanyInfo) {
  if (sale.sale_type === 'compra') return generateCompraPDF(sale, company);
  if (sale.sale_type === 'troca') return generateTrocaPDF(sale, company);
  return generateVendaPDF(sale, company);
}
