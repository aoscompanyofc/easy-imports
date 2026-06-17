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
  seller_name?: string;
  seller_cpf?: string;
  seller_rg?: string;
  seller_phone?: string;
  seller_address?: string;
  seller_email?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  customer_city?: string;
  // Aparelho que SAI (da Easy Imports para o cliente)
  product_name?: string;
  product_capacity?: string;
  product_color?: string;
  product_condition?: string;
  product_imei?: string;
  product_accessories?: string;
  total_amount?: number;
  payment_method?: string;
  installments?: number;
  // Aparelho que ENTRA (do cliente — troca)
  incoming_name?: string;
  incoming_imei?: string;
  incoming_serial?: string;
  incoming_email?: string;
  incoming_capacity?: string;
  incoming_color?: string;
  incoming_condition?: string;
  incoming_battery_health?: string;
  incoming_purchase_price?: number;
  signature_admin?: string;
  signature_client?: string;
  // 'novo' = garantia do fabricante (1 ano) | 'seminovo' = 90 dias Easy Imports
  // Quando informado, sobrepõe a detecção automática pela condição do aparelho
  pdf_type?: string;
  // JSON array de parcelas para venda a prazo
  installments_json?: string;
  // Array of outgoing products for multi-product sales
  outgoing_items?: Array<{
    name: string;
    imei?: string;
    capacity?: string;
    color?: string;
    condition?: string;
    price: number;
  }>;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt  = (v?: string | null) => v?.trim() || '';
const fmtMoney = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
const fmtPayment = (method?: string, parcelas?: number, total?: number) => {
  if (method === 'Cartão de Crédito' && parcelas && parcelas > 1)
    return `Cartão de Crédito — ${parcelas}× de ${fmtMoney((total ?? 0) / parcelas)}`;
  return fmt(method);
};

// ─── Logo SVG inline ──────────────────────────────────────────────────────────
const LOGO = `
<svg width="170" height="52" viewBox="0 0 170 52" xmlns="http://www.w3.org/2000/svg">
  <rect x="0"  y="0"  width="11" height="40" fill="#F5C200"/>
  <rect x="15" y="0"  width="15" height="12" fill="#F5C200"/>
  <rect x="15" y="14" width="11" height="11" fill="#F5C200"/>
  <rect x="15" y="28" width="15" height="12" fill="#F5C200"/>
  <text x="35" y="40" font-family="Arial Black,Impact,sans-serif" font-size="41" font-weight="900" fill="#111">ASY</text>
  <text x="1"  y="51" font-family="Arial,Helvetica,sans-serif" font-size="8.5" font-weight="700" fill="#111" letter-spacing="5.2">IMPORTS</text>
</svg>`;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@page { size: A4 portrait; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 210mm;
  height: 297mm;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #111;
  background: #fff;
  padding: 12mm 14mm 10mm;
  display: flex;
  flex-direction: column;
  line-height: 1.45;
}

/* HEADER */
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2.5px solid #111;
  padding-bottom: 9px;
  margin-bottom: 14px;
  flex-shrink: 0;
}
.hdr-right { text-align: right; }
.hdr-right h1 {
  font-size: 13.5pt;
  font-weight: 900;
  letter-spacing: 0.5px;
  line-height: 1.1;
  color: #111;
}
.hdr-right .sub { font-size: 7.5pt; color: #777; margin-top: 3px; }
.hdr-right .meta { font-size: 8pt; color: #444; margin-top: 4px; }
.hdr-right .meta strong { color: #111; }

/* SECTIONS — flex-grow to fill page */
.sections {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.sec { display: flex; flex-direction: column; }
.sec-t {
  background: #111;
  color: #F5C200;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  padding: 4px 11px;
  margin-bottom: 8px;
}
.sec-b { padding: 0 3px; flex: 1; display: flex; flex-direction: column; gap: 8px; }

/* FIELDS */
.row { display: flex; gap: 12px; }
.f  { flex: 1; display: flex; flex-direction: column; }
.f2 { flex: 2; }
.f3 { flex: 3; }
.f4 { flex: 4; }

.f label {
  font-size: 6.5pt;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
}
.ul {
  border-bottom: 1px solid #bbb;
  min-height: 18px;
  padding-bottom: 2px;
  font-size: 9pt;
  color: #111;
  font-weight: 600;
}

/* CHECKBOXES */
.ck-row { display: flex; align-items: center; gap: 14px; padding-top: 2px; }
.ck-lbl { font-size: 7pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; }
.ck { display: flex; align-items: center; gap: 5px; font-size: 8pt; color: #333; }
.ck-box {
  width: 11px; height: 11px;
  border: 1px solid #666;
  display: inline-block;
  flex-shrink: 0;
  border-radius: 2px;
}
.ck-box.filled {
  background: #F5C200;
  border-color: #d4a800;
  text-align: center;
  line-height: 11px;
  font-size: 9px;
  font-weight: 900;
  color: #111;
}

/* SPLIT (dois aparelhos lado a lado) */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.split-box { border: 1px solid #e0e0e0; border-radius: 3px; overflow: hidden; }
.split-t {
  background: #111;
  color: #F5C200;
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  padding: 4px 10px;
}
.split-b { padding: 8px 10px; display: flex; flex-direction: column; gap: 7px; }

/* GARANTIA */
.g-wrap { display: flex; gap: 16px; }
.g-txt { flex: 1; font-size: 8.5pt; line-height: 1.65; color: #111; }
.g-list-wrap { flex: 0 0 42%; }
.g-nc-t { font-size: 8pt; font-weight: 700; color: #111; margin-bottom: 5px; }
.g-list { margin: 0; padding-left: 16px; list-style-type: disc; }
.g-list li { font-size: 8.5pt; color: #111; line-height: 1.7; }

/* ACERTO FINANCEIRO (troca) */
.fin-cb-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

/* ASSINATURAS */
.sig-area {
  margin-top: auto;
  flex-shrink: 0;
}
.sig-area-hdr {
  background: #111;
  color: #F5C200;
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  padding: 4px 11px;
  margin-bottom: 14px;
}
.sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; padding: 0 3px; }
.sig-role {
  font-size: 6.5pt;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  margin-top: 5px;
}
.sig-line { border-bottom: 1.5px solid #333; margin-bottom: 4px; }
.sig-sub { font-size: 7.5pt; color: #666; margin-top: 2px; }
.sig-img { max-height: 55px; max-width: 190px; display: block; margin: 0 0 6px; }

/* FOOTER */
.ftr {
  border-top: 1px solid #e0e0e0;
  margin-top: 10px;
  padding-top: 5px;
  text-align: center;
  font-size: 6pt;
  color: #bbb;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* TABELA DE PARCELAS */
.inst-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2px 0;
  font-size: 7.5pt;
}
.inst-table thead tr {
  background: #111;
  color: #F5C200;
}
.inst-table thead th {
  padding: 4px 7px;
  text-align: left;
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
}
.inst-table thead th.r { text-align: right; }
.inst-table tbody tr:nth-child(even) { background: #f7f7f7; }
.inst-table tbody td {
  padding: 3px 7px;
  border-bottom: 1px solid #efefef;
  color: #111;
}
.inst-table tbody td.r { text-align: right; font-weight: 700; }
.inst-table tbody td.paid { color: #2d6a4f; font-weight: 700; }
.inst-table tfoot td {
  padding: 5px 7px;
  border-top: 2px solid #111;
  font-weight: 900;
  font-size: 8.5pt;
}
.inst-table tfoot td.r { text-align: right; color: #111; }

/* PIX BOX */
.pix-box {
  border: 1.5px solid #F5C200;
  background: #fffde7;
  border-radius: 4px;
  padding: 6px 10px;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.pix-icon { font-size: 13pt; flex-shrink: 0; }
.pix-txt { font-size: 7.5pt; }
.pix-txt strong { font-size: 8.5pt; color: #111; }
`;

// ─── helpers de renderização ──────────────────────────────────────────────────
function field(label: string, value?: string, flex = 'f') {
  const val = value?.trim()
    ? `<span style="color:#111;font-weight:600;">${value}</span>`
    : '';
  return `<div class="f ${flex}"><label>${label}</label><div class="ul">${val}</div></div>`;
}

function checkbox(label: string, checked = false) {
  const box = checked
    ? `<span class="ck-box filled">✓</span>`
    : `<span class="ck-box"></span>`;
  return `<span class="ck">${box} ${label}</span>`;
}

function sigBlock(role: string, sub: string, img?: string) {
  const imgTag = img
    ? `<img class="sig-img" src="${img}" alt="assinatura"/>`
    : `<div style="height:55px;"></div>`;
  return `
    <div>
      ${imgTag}
      <div class="sig-line"></div>
      <div class="sig-role">${role}</div>
      <div class="sig-sub">${sub}</div>
    </div>`;
}

const WARRANTY_EXCLUSIONS = [
  'Quedas e impactos','Mau uso',
  'Tela quebrada','Oxidação',
  'Danos por água','Danos por terceiros',
  'Violação técnica','Atualizações indevidas',
];

function warrantyBlock() {
  const items = WARRANTY_EXCLUSIONS.map(i => `<li>${i}</li>`).join('');
  return `
    <div class="g-list-wrap">
      <div class="g-nc-t">A garantia NÃO cobre:</div>
      <ul class="g-list">${items}</ul>
    </div>`;
}

function warrantyBlockNovo() {
  return `
    <div class="g-list-wrap">
      <div class="g-nc-t">Garantia do Fabricante:</div>
      <ul class="g-list">
        <li>12 meses (Apple) ou conforme fabricante</li>
        <li>Defeitos internos de fabricação</li>
        <li>Suporte pela assistência autorizada</li>
      </ul>
      <div class="g-nc-t" style="margin-top:10px;">NÃO cobre:</div>
      <ul class="g-list">
        <li>Quedas e impactos</li>
        <li>Danos por água</li>
        <li>Mau uso ou violação</li>
      </ul>
    </div>`;
}

// Pre-opened window set by generatePDF when called from an async context
// (avoids popup blocker since window must be opened in a synchronous event handler)
let _preOpenedWin: Window | null | undefined = undefined;

function openAndPrint(html: string, title: string) {
  const w = _preOpenedWin ?? window.open('', '_blank', 'width=920,height=1060');
  _preOpenedWin = undefined;
  if (!w) { alert('Permita pop-ups no navegador para gerar o documento.'); return; }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  setTimeout(() => w.print(), 700);
}

function page(title: string, number: string, date: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>${title} ${number}</title>
<style>${CSS}</style></head><body>

<div class="hdr">
  <div>${LOGO}</div>
  <div class="hdr-right">
    <h1>${title}</h1>
    <div class="sub">Documento oficial — Válido somente com ambas as assinaturas</div>
    <div class="meta">Nº <strong>${number}</strong> &nbsp;·&nbsp; Emitido em: <strong>${date}</strong></div>
  </div>
</div>

<div class="sections">
${body}
</div>

<div class="ftr">Easy Imports &nbsp;·&nbsp; Não aceito com rasuras ou alterações &nbsp;·&nbsp; Garantia de 90 dias conforme art. 26 do CDC</div>
</body></html>`;
}

// ─── CONTRATO DE VENDA ────────────────────────────────────────────────────────
export function generateVendaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);
  const cond  = (sale.product_condition || '').toLowerCase();
  const isNovo    = (c: string) => c === 'novo' || c.startsWith('novo ') || c.startsWith('novo(');
  const isSemi    = (c: string) => c.includes('seminovo');
  const isBom     = (c: string) => c.includes('bom') && !c.includes('seminovo');
  const isUsado   = (c: string) => c.includes('usado') || (c.includes('defeito'));


  const body = `
<div class="sec">
  <div class="sec-t">Dados do Cliente</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', sale.customer_name, 'f4')}
      ${field('CPF / CNPJ', sale.customer_cpf, 'f2')}
      ${field('Telefone / WhatsApp', sale.customer_phone, 'f2')}
    </div>
    <div class="row">
      ${field('Endereço', sale.customer_city, 'f4')}
    </div>
  </div>
</div>

${sale.outgoing_items && sale.outgoing_items.length > 1 ? `
<div class="sec">
  <div class="sec-t">Aparelhos / Produtos</div>
  <div class="sec-b">
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
      <thead>
        <tr style="background:#f5f5f5;border-bottom:1.5px solid #222;">
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Modelo</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">IMEI/Serial</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Capacidade</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Cor</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Estado</th>
          <th style="text-align:right;padding:4px 6px;font-weight:700;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${sale.outgoing_items!.map((item, i) => `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:4px 6px;">${item.name || '—'}</td>
            <td style="padding:4px 6px;font-family:monospace;font-size:7.5pt;">${item.imei || '—'}</td>
            <td style="padding:4px 6px;">${item.capacity || '—'}</td>
            <td style="padding:4px 6px;">${item.color || '—'}</td>
            <td style="padding:4px 6px;">${item.condition || '—'}</td>
            <td style="padding:4px 6px;text-align:right;font-weight:700;">${fmtMoney(item.price)}</td>
          </tr>
        `).join('')}
        <tr style="border-top:2px solid #111;background:#f9f9f9;">
          <td colspan="5" style="padding:5px 6px;font-weight:700;text-align:right;">Total</td>
          <td style="padding:5px 6px;text-align:right;font-weight:900;">${fmtMoney(sale.total_amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
` : `
<div class="sec">
  <div class="sec-t">Dados do Aparelho</div>
  <div class="sec-b">
    <div class="row">
      ${field('Modelo', sale.product_name, 'f3')}
      ${field('Cor', sale.product_color, 'f2')}
      ${field('Capacidade', sale.product_capacity)}
    </div>
    <div class="row">
      ${field('IMEI / Serial', sale.product_imei, 'f2')}
      ${field('Acessórios Inclusos', sale.product_accessories, 'f3')}
    </div>
    <div class="ck-row">
      <span class="ck-lbl">Estado:</span>
      ${(() => {
        const forceNovo = sale.pdf_type === 'novo' || (!sale.pdf_type && isNovo(cond));
        return `
          ${checkbox('Novo (lacrado)', forceNovo)}
          ${checkbox('Seminovo',  !forceNovo && isSemi(cond))}
          ${checkbox('Bom estado', !forceNovo && isBom(cond))}
          ${checkbox('Usado',      !forceNovo && isUsado(cond))}
        `;
      })()}
    </div>
  </div>
</div>
`}

<div class="sec">
  <div class="sec-t">Dados da Venda</div>
  <div class="sec-b">
    <div class="row">
      ${field('Valor Pago pelo Cliente', fmtMoney(sale.total_amount), 'f2')}
      ${field('Forma de Pagamento', fmtPayment(sale.payment_method, sale.installments, sale.total_amount), 'f3')}
      ${field('Data', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Termo de Garantia</div>
  <div class="sec-b">
    <div class="g-wrap">
      ${(sale.pdf_type === 'novo' || (!sale.pdf_type && isNovo(cond))) ? `
      <div class="g-txt">
        Este aparelho é <strong>Novo (lacrado)</strong> e está coberto pela
        <strong>Garantia Oficial do Fabricante</strong>. Consulte a embalagem ou o site
        do fabricante para os termos e duração exatos.<br><br>
        A <strong>Easy Imports não fornece garantia adicional</strong> para aparelhos novos
        lacrados — a responsabilidade técnica é do fabricante (ex: Apple, Samsung).<br><br>
        Em caso de defeito, acione diretamente a
        <strong>assistência técnica autorizada</strong> do fabricante.
      </div>
      ${warrantyBlockNovo()}
      ` : `
      <div class="g-txt">
        A <strong>Easy Imports</strong> oferece garantia de <strong>90 (noventa) dias por lei</strong>
        para defeitos técnicos de funcionamento do aparelho, a contar desta data,
        conforme art. 26 do Código de Defesa do Consumidor (CDC).<br><br>
        A garantia é válida apenas para defeitos internos de fabricação. O cliente deve
        procurar a Easy Imports antes de qualquer intervenção de terceiros.
        Após abertura ou violação por terceiros, a garantia é automaticamente cancelada.
      </div>
      ${warrantyBlock()}
      `}
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sig-area-hdr">Assinaturas</div>
  <div class="sigs">
    ${sigBlock('Assinatura do Cliente', `Nome: ${fmt(sale.customer_name) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(sale.customer_cpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('CONTRATO DE COMPRA E VENDA', sale.sale_number, date, body), `Venda ${sale.sale_number}`);
}

// ─── TERMO DE TROCA ───────────────────────────────────────────────────────────
export function generateTrocaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date        = fmtDate(sale.created_at);
  const clientName  = sale.customer_name  || sale.seller_name  || '';
  const clientCpf   = sale.customer_cpf   || '';
  const clientPhone = sale.customer_phone || sale.seller_phone || '';
  const clientCity  = sale.customer_city  || '';

  const inCond  = (sale.incoming_condition  || '').toLowerCase();
  const outCond = (sale.product_condition   || '').toLowerCase();

  // Helpers para detectar estado sem falso-positivo de "seminovo" → "novo"
  const isNovo    = (c: string) => c === 'novo' || c.startsWith('novo ') || c.startsWith('novo(');
  const isSemi    = (c: string) => c.includes('seminovo');
  const isBom     = (c: string) => c.includes('bom') && !c.includes('seminovo');
  const isDefeito = (c: string) => c.includes('defeito') || (c.includes('usado') && !c.includes('bom'));

  // Aparelho entregue pelo cliente
  const incomingBlock = `
    <div class="split-box">
      <div class="split-t">Aparelho Entregue pelo Cliente</div>
      <div class="split-b">
        <div class="row">
          ${field('Modelo', sale.incoming_name, 'f3')}
          ${field('Cor', sale.incoming_color)}
        </div>
        <div class="row">
          ${field('Capacidade', sale.incoming_capacity)}
          ${field('IMEI', sale.incoming_imei, 'f2')}
        </div>
        <div class="row">
          ${field('Número de Série', sale.incoming_serial, 'f2')}
          ${field('E-mail da Conta', sale.incoming_email, 'f2')}
        </div>
        ${sale.incoming_battery_health
          ? `<div class="row">${field('Saúde da Bateria', sale.incoming_battery_health)}</div>`
          : ''}
        <div class="ck-row">
          <span class="ck-lbl">Estado:</span>
          ${checkbox('Novo (lacrado)', isNovo(inCond))}
          ${checkbox('Seminovo', isSemi(inCond))}
          ${checkbox('Bom estado', isBom(inCond))}
          ${checkbox('Com defeito', isDefeito(inCond))}
        </div>
      </div>
    </div>`;

  // Valores financeiros
  const tradeInCredit = sale.incoming_purchase_price || 0;
  const totalValue    = sale.total_amount || 0;
  // cash = quanto o cliente pagou em caixa (PIX/cartão), sem contar o aparelho da troca
  const cashReceived  = Math.max(0, totalValue - tradeInCredit);
  const isDirectSwap  = cashReceived === 0;

  // Garantia do aparelho entregue pela Easy Imports: usa pdf_type explícito se informado
  const useNewWarranty = sale.pdf_type === 'novo' || (!sale.pdf_type && isNovo(outCond));
  const outWarrantyLabel = useNewWarranty ? 'Garantia do Fabricante (1 ano)' : '90 dias por lei — CDC';

  // Aparelho(s) entregue(s) pela Easy Imports ao cliente
  const outgoingBlock = sale.outgoing_items && sale.outgoing_items.length > 1 ? `
    <div class="split-box">
      <div class="split-t">Aparelhos Entregues pela Easy Imports</div>
      <div class="split-b">
        <table style="width:100%;border-collapse:collapse;font-size:8pt;">
          <thead>
            <tr style="background:#f5f5f5;border-bottom:1px solid #222;">
              <th style="text-align:left;padding:3px 5px;font-weight:700;">Modelo</th>
              <th style="text-align:left;padding:3px 5px;font-weight:700;">IMEI</th>
              <th style="text-align:right;padding:3px 5px;font-weight:700;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${sale.outgoing_items!.map(item => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:3px 5px;">${item.name || '—'}</td>
                <td style="padding:3px 5px;font-family:monospace;font-size:7pt;">${item.imei || '—'}</td>
                <td style="padding:3px 5px;text-align:right;font-weight:700;">${fmtMoney(item.price)}</td>
              </tr>
            `).join('')}
            <tr style="border-top:2px solid #111;background:#f9f9f9;">
              <td colspan="2" style="padding:4px 5px;font-weight:700;text-align:right;">Total</td>
              <td style="padding:4px 5px;text-align:right;font-weight:900;">${fmtMoney(sale.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="split-box">
      <div class="split-t">Aparelho Entregue pela Easy Imports</div>
      <div class="split-b">
        <div class="row">
          ${field('Modelo', sale.product_name, 'f3')}
          ${field('Cor', sale.product_color)}
        </div>
        <div class="row">
          ${field('Capacidade', sale.product_capacity)}
          ${field('IMEI / Serial', sale.product_imei, 'f2')}
        </div>
        <div class="row">
          ${field('Acessórios Inclusos', sale.product_accessories, 'f3')}
          ${field('Garantia', outWarrantyLabel)}
        </div>
        <div class="ck-row">
          <span class="ck-lbl">Estado:</span>
          ${checkbox('Novo (lacrado)', useNewWarranty)}
          ${checkbox('Seminovo',  !useNewWarranty && isSemi(outCond))}
          ${checkbox('Bom estado', !useNewWarranty && isBom(outCond))}
          ${checkbox('Usado',      !useNewWarranty && isDefeito(outCond))}
        </div>
      </div>
    </div>`;

  // Texto e bloco de garantia (depende se novo ou não)
  const outWarrantyText = useNewWarranty
    ? `O aparelho entregue pela Easy Imports é <strong>Novo (lacrado)</strong> e coberto pela
       <strong>Garantia Oficial do Fabricante</strong>. Em caso de defeito acione diretamente a
       assistência técnica autorizada. A Easy Imports não fornece garantia adicional para
       aparelhos novos lacrados.`
    : `O aparelho entregue possui garantia de <strong>90 (noventa) dias</strong> para defeitos
       técnicos de funcionamento, conforme art. 26 do CDC. Válida apenas para defeitos internos.
       Procure a Easy Imports antes de qualquer intervenção de terceiros.`;

  const outWarrantyBlock = useNewWarranty ? warrantyBlockNovo() : warrantyBlock();

  const body = `
<div class="sec">
  <div class="sec-t">Dados do Cliente</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', clientName, 'f4')}
      ${field('CPF / CNPJ', clientCpf, 'f2')}
      ${field('Telefone / WhatsApp', clientPhone, 'f2')}
    </div>
    <div class="row">
      ${field('Endereço', clientCity, 'f6')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Aparelhos Envolvidos na Troca</div>
  <div class="split">
    ${incomingBlock}
    ${outgoingBlock}
  </div>
</div>

<div class="sec">
  <div class="sec-t">Condições de Pagamento</div>
  <div class="sec-b">
    <div class="row">
      ${field('Valor Pago pelo Cliente', isDirectSwap ? 'Troca direta (sem pagamento)' : fmtMoney(cashReceived), 'f2')}
      ${field('Forma de Pagamento', isDirectSwap ? 'Troca direta' : fmtPayment(sale.payment_method, sale.installments, cashReceived), 'f3')}
      ${field('Data', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Condições e Garantia</div>
  <div class="sec-b">
    <div class="g-wrap">
      <div class="g-txt">
        O cliente declara que o aparelho entregue está nas condições aqui descritas, sem omissão de defeitos.<br><br>
        A <strong>Easy Imports não se responsabiliza</strong> por bloqueios futuros (iCloud/Google),
        peças trocadas anteriormente, defeitos ocultos não informados, nem por perda de dados.<br><br>
        ${outWarrantyText}
      </div>
      ${outWarrantyBlock}
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sig-area-hdr">Assinaturas</div>
  <div class="sigs">
    ${sigBlock('Assinatura do Cliente', `Nome: ${fmt(clientName) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(clientCpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('TERMO DE TROCA', sale.sale_number, date, body), `Troca ${sale.sale_number}`);
}

// ─── DOCUMENTO DE COMPRA ──────────────────────────────────────────────────────
export function generateCompraPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);

  const body = `
<div class="sec">
  <div class="sec-t">Dados da Compradora</div>
  <div class="sec-b">
    <div class="row">
      ${field('Razão Social', company.name, 'f3')}
      ${field('CNPJ', company.cnpj, 'f2')}
      ${field('Telefone', company.phone)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Dados do Vendedor</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', sale.seller_name, 'f4')}
      ${field('CPF', sale.seller_cpf, 'f2')}
      ${field('RG', sale.seller_rg)}
    </div>
    <div class="row">
      ${field('Telefone', sale.seller_phone, 'f2')}
      ${field('E-mail', sale.seller_email, 'f3')}
    </div>
    <div class="row">
      ${field('Endereço Completo', sale.seller_address, 'f4')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Dados do Produto</div>
  <div class="sec-b">
    <div class="row">
      ${field('Produto / Modelo', sale.product_name, 'f3')}
      ${field('Cor', sale.product_color, 'f2')}
      ${field('Capacidade', sale.product_capacity)}
    </div>
    <div class="row">
      ${field('IMEI / Serial', sale.product_imei, 'f2')}
      ${field('Estado de Conservação', sale.product_condition, 'f2')}
      ${field('Acessórios', sale.product_accessories, 'f2')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Condições da Compra</div>
  <div class="sec-b">
    <div class="row">
      ${field('Valor Pago (R$)', fmtMoney(sale.total_amount), 'f2')}
      ${field('Forma de Pagamento', fmtPayment(sale.payment_method, sale.installments, sale.total_amount), 'f3')}
      ${field('Data', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Declaração do Vendedor</div>
  <div class="sec-b">
    <div class="g-txt" style="font-size:8.5pt;line-height:1.7;color:#333;padding:4px 0;">
      O vendedor declara, sob responsabilidade civil e criminal, ser o legítimo proprietário do produto acima descrito,
      garantindo que o mesmo <strong>não é produto de furto, roubo ou receptação</strong>, não possui bloqueios ativos
      (iCloud, Google, operadora) e está livre de qualquer restrição legal ou financeira.
      Em caso de irregularidade constatada posteriormente, o vendedor compromete-se a restituir integralmente
      o valor pago no prazo de <strong>48 horas</strong>.
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sig-area-hdr">Assinaturas</div>
  <div class="sigs">
    ${sigBlock('Vendedor', `Nome: ${fmt(sale.seller_name) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(sale.seller_cpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('DOCUMENTO DE COMPRA', sale.sale_number, date, body), `Compra ${sale.sale_number}`);
}

// ─── CONTRATO DE VENDA A PRAZO ───────────────────────────────────────────────
export function generatePrazoPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);
  const clientName  = sale.customer_name  || '';
  const clientCpf   = sale.customer_cpf   || '';
  const clientPhone = sale.customer_phone || '';
  const clientCity  = sale.customer_city  || '';

  // Parse installments
  interface Installment { n: number; due: string; amount: number; paid_at: string | null }
  let insts: Installment[] = [];
  if (sale.installments_json) {
    try { insts = JSON.parse(sale.installments_json); } catch {}
  }

  const totalContract = insts.length > 0
    ? insts.reduce((s, i) => s + i.amount, 0)
    : (sale.total_amount || 0);
  const paidCount = insts.filter(i => i.paid_at).length;
  const instValue = insts[0]?.amount || 0;
  const planLabel = insts.length > 0
    ? `${insts.length}x de ${fmtMoney(instValue)} — Total ${fmtMoney(totalContract)}`
    : fmtMoney(totalContract);

  // Condition helpers (same as venda)
  const outCond = (sale.product_condition || '').toLowerCase();
  const isNovo  = (c: string) => c === 'novo' || c.startsWith('novo ') || c.startsWith('novo(');
  const isSemi  = (c: string) => c.includes('seminovo');
  const isBom   = (c: string) => c.includes('bom') && !c.includes('seminovo');
  const isUsado = (c: string) => c.includes('usado') || c.includes('defeito');
  const forceNovo = sale.pdf_type === 'novo' || (!sale.pdf_type && isNovo(outCond));

  // Installment table rows
  const instRows = insts.map(inst => {
    const dueFmt = inst.due.split('-').reverse().join('/');
    const isPaid = !!inst.paid_at;
    const paidFmt = isPaid ? inst.paid_at!.split('-').reverse().join('/') : '';
    return `<tr>
      <td>${inst.n}</td>
      <td>${dueFmt}</td>
      <td>PIX</td>
      <td class="r${isPaid ? ' paid' : ''}">${isPaid ? `✓ Pago em ${paidFmt}` : fmtMoney(inst.amount)}</td>
    </tr>`;
  }).join('');

  const instTableOrFallback = insts.length > 0 ? `
    <table class="inst-table">
      <thead>
        <tr>
          <th style="width:28px">Nº</th>
          <th>Vencimento</th>
          <th>Forma</th>
          <th class="r">Valor</th>
        </tr>
      </thead>
      <tbody>${instRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3">Valor Total do Contrato</td>
          <td class="r">${fmtMoney(totalContract)}</td>
        </tr>
        ${paidCount > 0 ? `<tr style="color:#2d6a4f">
          <td colspan="3">Já recebido (${paidCount} parcela${paidCount !== 1 ? 's' : ''})</td>
          <td class="r">${fmtMoney(insts.filter(i => i.paid_at).reduce((s, i) => s + i.amount, 0))}</td>
        </tr>` : ''}
      </tfoot>
    </table>
    <div class="pix-box">
      <span class="pix-icon">⚡</span>
      <div class="pix-txt">
        Chave PIX para pagamento: <strong>${company.cnpj || company.phone || 'Consulte a Easy Imports'}</strong>
        &nbsp;·&nbsp; Favorecido: <strong>${company.name}</strong>
        &nbsp;·&nbsp; Envie o comprovante via WhatsApp após cada pagamento.
      </div>
    </div>
  ` : `<div class="row">${field('Forma de Pagamento', sale.payment_method, 'f3')}${field('Valor Total', fmtMoney(totalContract), 'f2')}</div>`;

  // Trade-in block (optional)
  const hasTradeIn = !!sale.incoming_name?.trim();
  const tradeInSection = hasTradeIn ? `
<div class="sec">
  <div class="sec-t">Aparelho Recebido na Troca</div>
  <div class="sec-b">
    <div class="row">
      ${field('Modelo', sale.incoming_name, 'f3')}
      ${field('Cor', sale.incoming_color)}
      ${field('Capacidade', sale.incoming_capacity)}
    </div>
    <div class="row">
      ${field('IMEI / Serial', sale.incoming_imei || sale.incoming_serial, 'f2')}
      ${sale.incoming_battery_health ? field('Saúde Bateria', sale.incoming_battery_health) : ''}
    </div>
    <p style="font-size:7.5pt;color:#555;margin-top:4px;">
      O aparelho acima foi entregue pelo comprador à Easy Imports como parte do acordo comercial.
      O comprador declara ser o legítimo proprietário e que o aparelho não possui bloqueios ativos (iCloud/Google).
    </p>
  </div>
</div>` : '';

  const body = `
<div class="sec">
  <div class="sec-t">Partes Contratantes</div>
  <div class="sec-b">
    <div class="split">
      <div class="split-box">
        <div class="split-t">Vendedora — Credora</div>
        <div class="split-b">
          <div class="row">${field('Razão Social', company.name, 'f4')}</div>
          <div class="row">
            ${field('CNPJ', company.cnpj, 'f2')}
            ${field('Telefone / WhatsApp', company.phone, 'f2')}
          </div>
        </div>
      </div>
      <div class="split-box">
        <div class="split-t">Comprador — Devedor</div>
        <div class="split-b">
          <div class="row">${field('Nome Completo', clientName, 'f4')}</div>
          <div class="row">
            ${field('CPF / CNPJ', clientCpf, 'f2')}
            ${field('Telefone / WhatsApp', clientPhone, 'f2')}
          </div>
          <div class="row">${field('Endereço', clientCity, 'f4')}</div>
        </div>
      </div>
    </div>
  </div>
</div>

${sale.outgoing_items && sale.outgoing_items.length > 1 ? `
<div class="sec">
  <div class="sec-t">Aparelhos / Produtos</div>
  <div class="sec-b">
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
      <thead>
        <tr style="background:#f5f5f5;border-bottom:1.5px solid #222;">
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Modelo</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">IMEI/Serial</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Capacidade</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Cor</th>
          <th style="text-align:left;padding:4px 6px;font-weight:700;">Estado</th>
          <th style="text-align:right;padding:4px 6px;font-weight:700;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${sale.outgoing_items!.map((item, i) => `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:4px 6px;">${item.name || '—'}</td>
            <td style="padding:4px 6px;font-family:monospace;font-size:7.5pt;">${item.imei || '—'}</td>
            <td style="padding:4px 6px;">${item.capacity || '—'}</td>
            <td style="padding:4px 6px;">${item.color || '—'}</td>
            <td style="padding:4px 6px;">${item.condition || '—'}</td>
            <td style="padding:4px 6px;text-align:right;font-weight:700;">${fmtMoney(item.price)}</td>
          </tr>
        `).join('')}
        <tr style="border-top:2px solid #111;background:#f9f9f9;">
          <td colspan="5" style="padding:5px 6px;font-weight:700;text-align:right;">Total</td>
          <td style="padding:5px 6px;text-align:right;font-weight:900;">${fmtMoney(sale.total_amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
` : `
<div class="sec">
  <div class="sec-t">Objeto do Contrato</div>
  <div class="sec-b">
    <div class="row">
      ${field('Produto / Modelo', sale.product_name, 'f3')}
      ${field('Cor', sale.product_color, 'f2')}
      ${field('Capacidade', sale.product_capacity)}
    </div>
    <div class="row">
      ${field('IMEI / Número de Série', sale.product_imei, 'f2')}
      ${field('Acessórios Inclusos', sale.product_accessories, 'f3')}
    </div>
    <div class="ck-row">
      <span class="ck-lbl">Estado:</span>
      ${checkbox('Novo (lacrado)', forceNovo)}
      ${checkbox('Seminovo',  !forceNovo && isSemi(outCond))}
      ${checkbox('Bom estado', !forceNovo && isBom(outCond))}
      ${checkbox('Usado',      !forceNovo && isUsado(outCond))}
    </div>
  </div>
</div>
`}

${tradeInSection}

<div class="sec">
  <div class="sec-t">Plano de Pagamento — ${planLabel}</div>
  <div class="sec-b">
    ${instTableOrFallback}
  </div>
</div>

<div class="sec">
  <div class="sec-t">Cláusulas Contratuais</div>
  <div class="sec-b">
    <div class="g-txt" style="font-size:7.5pt;line-height:1.65;color:#333;">
      <strong>1. Pagamento:</strong> O comprador compromete-se a pagar cada parcela até a data de vencimento via PIX,
      enviando o comprovante ao WhatsApp da Easy Imports. O não pagamento na data acordada
      caracteriza inadimplência.<br>
      <strong>2. Atraso:</strong> Em caso de atraso superior a 5 dias, incidirão multa de 2% e juros de mora de 1% ao
      mês sobre o valor da parcela em aberto. Após 15 dias de inadimplência, a Easy Imports
      poderá retomar amigavelmente o produto descrito neste contrato.<br>
      <strong>3. Propriedade:</strong> A propriedade do produto somente é transferida definitivamente ao comprador
      após o pagamento integral de todas as parcelas. O produto não pode ser vendido, transferido
      ou dado como garantia antes da quitação total.<br>
      <strong>4. Garantia:</strong> A Easy Imports concede garantia de 90 dias para defeitos técnicos de funcionamento
      a partir desta data (art. 26, CDC). Não coberta: quedas, danos por água, mau uso ou violação por terceiros.<br>
      <strong>5. Foro:</strong> As partes elegem o foro da comarca de domicílio da vendedora para dirimir eventuais
      controvérsias oriundas deste contrato, com renúncia a qualquer outro.
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sig-area-hdr">Assinaturas</div>
  <div class="sigs">
    ${sigBlock('Assinatura do Comprador', `Nome: ${fmt(clientName) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(clientCpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('CONTRATO DE VENDA A PRAZO', sale.sale_number, date, body), `Prazo ${sale.sale_number}`);
}

// ─── dispatcher ───────────────────────────────────────────────────────────────
export function generatePDF(sale: SalePDFData, company: CompanyInfo, preWin?: Window | null) {
  if (preWin !== undefined) _preOpenedWin = preWin;
  if (sale.sale_type === 'compra') return generateCompraPDF(sale, company);
  if (sale.sale_type === 'troca')  return generateTrocaPDF(sale, company);
  if (sale.sale_type === 'prazo')  return generatePrazoPDF(sale, company);
  return generateVendaPDF(sale, company);
}
