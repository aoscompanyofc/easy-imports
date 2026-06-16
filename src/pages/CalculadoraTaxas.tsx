import React, { useMemo, useState } from 'react';
import { Calculator, Copy, Check, Download, Image as ImageIcon, CreditCard, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRANDS, CardBrand, simulate, brl } from '../lib/cardRates';

// ─── Geração da imagem (canvas) da simulação ────────────────────────────────
function buildSimulationCanvas(valor: number, brand: CardBrand): HTMLCanvasElement {
  const rows = simulate(valor, brand);
  const brandLabel = BRANDS.find((b) => b.id === brand)?.label || '';
  const scale = 2;
  const W = 760;
  const pad = 32;
  const headerH = 100;
  const valueH = 64;
  const brandH = 42;
  const theadH = 54;
  const rowH = 64;
  const footerH = 50;
  const H = headerH + valueH + brandH + theadH + rows.length * rowH + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  const PRIMARY = '#FFC107';
  const DARK = '#111827';
  const CARD = '#1B2433';
  const MUTED = '#9CA3AF';

  // Fundo
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, W, headerH);
  ctx.textBaseline = 'middle';
  ctx.font = '700 38px Poppins, Arial, sans-serif';
  const t1 = 'Simulação ';
  const t2 = 'Easy';
  const t3 = 'Imports';
  const w1 = ctx.measureText(t1).width;
  const w2 = ctx.measureText(t2).width;
  const w3 = ctx.measureText(t3).width;
  let tx = (W - (w1 + w2 + w3)) / 2;
  const ty = headerH / 2;
  ctx.fillStyle = '#fff'; ctx.fillText(t1, tx, ty); tx += w1;
  ctx.fillStyle = '#fff'; ctx.fillText(t2, tx, ty); tx += w2;
  ctx.fillStyle = PRIMARY; ctx.fillText(t3, tx, ty);

  // Valor simulado
  let y = headerH;
  ctx.fillStyle = CARD;
  ctx.fillRect(pad, y + 8, W - pad * 2, valueH - 12);
  ctx.font = '700 18px Poppins, Arial, sans-serif';
  ctx.fillStyle = PRIMARY;
  ctx.textAlign = 'left';
  ctx.fillText('VALOR SIMULADO', pad + 18, y + valueH / 2 + 1);
  ctx.font = '800 32px Poppins, Arial, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(brl(valor), W - pad - 18, y + valueH / 2 + 1);

  // Bandeira
  y += valueH;
  ctx.textAlign = 'center';
  ctx.font = '700 17px Poppins, Arial, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(`Cartão: ${brandLabel}`, W / 2, y + brandH / 2);

  // Colunas
  const cParc    = pad + 8;
  const cTaxa    = 250;
  const cParcela = W - pad - 230;
  const cTotal   = W - pad - 8;

  // Cabeçalho da tabela
  y += brandH;
  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, y, W, theadH);
  ctx.font = '700 17px Poppins, Arial, sans-serif';
  ctx.fillStyle = PRIMARY;
  ctx.textAlign = 'left';   ctx.fillText('PARCELAS', cParc, y + theadH / 2);
  ctx.textAlign = 'center'; ctx.fillText('TAXA', cTaxa, y + theadH / 2);
  ctx.textAlign = 'right';  ctx.fillText('VALOR DA PARCELA', cParcela, y + theadH / 2);
  // Cabeçalho TOTAL com fundo amarelo
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(W - pad - 160, y + 8, 160, theadH - 16);
  ctx.font = '800 17px Poppins, Arial, sans-serif';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL', cTotal - 8, y + theadH / 2);

  // Linhas
  y += theadH;
  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    ctx.fillStyle = i % 2 === 0 ? '#161F2E' : '#1B2433';
    ctx.fillRect(0, ry, W, rowH);

    // Fundo amarelo suave na coluna Total
    ctx.fillStyle = 'rgba(255,193,7,0.10)';
    ctx.fillRect(W - pad - 160, ry, 160, rowH);

    const mid = ry + rowH / 2;
    // Parcelas
    ctx.font = '700 22px Poppins, Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(r.label, cParc, mid);
    // Taxa
    ctx.font = '500 13px Poppins, Arial, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(`${r.taxa.toLocaleString('pt-BR')}%`, cTaxa, mid);
    // Parcela
    ctx.textAlign = 'right';
    if (r.parcelas > 1) {
      ctx.font = '700 22px Poppins, Arial, sans-serif';
      ctx.fillStyle = '#fff';
      const valTxt = brl(r.parcelaValor);
      ctx.fillText(valTxt, cParcela, mid);
      const valW = ctx.measureText(valTxt).width;
      ctx.font = '600 16px Poppins, Arial, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.fillText(`${r.parcelas}x de`, cParcela - valW - 12, mid);
    } else {
      ctx.font = '700 22px Poppins, Arial, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(brl(r.total), cParcela, mid);
    }
    // Total — amarelo em destaque
    ctx.font = '800 22px Poppins, Arial, sans-serif';
    ctx.fillStyle = PRIMARY;
    ctx.textAlign = 'right';
    ctx.fillText(brl(r.total), cTotal - 8, mid);
  });

  // Footer
  y += rows.length * rowH;
  ctx.font = '500 13px Poppins, Arial, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  ctx.fillText('Easy Imports · Taxas sujeitas a alteração', W / 2, y + footerH / 2);

  return canvas;
}

export const CalculadoraTaxas: React.FC = () => {
  const [valorStr, setValorStr] = useState('700');
  const [brand, setBrand] = useState<CardBrand>('visa_master');
  const [copied, setCopied] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const valor = useMemo(() => {
    const cleaned = valorStr.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const n = Number(cleaned);
    return isNaN(n) || n < 0 ? 0 : n;
  }, [valorStr]);

  const rows = useMemo(() => simulate(valor, brand), [valor, brand]);

  const fileName = () => {
    const b = brand === 'visa_master' ? 'visa-master' : 'elo-amex';
    return `simulacao-easy-imports-${b}-${Math.round(valor)}.png`;
  };

  const addIncrement = (inc: number) => {
    setValorStr(String(Math.round((valor + inc) * 100) / 100));
  };

  const downloadImage = () => {
    if (valor <= 0) { toast.error('Informe um valor para simular.'); return; }
    setGenBusy(true);
    try {
      const canvas = buildSimulationCanvas(valor, brand);
      canvas.toBlob((blob) => {
        if (!blob) { toast.error('Não foi possível gerar a imagem.'); setGenBusy(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName();
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Imagem gerada! Salva no dispositivo.');
        setGenBusy(false);
      }, 'image/png');
    } catch {
      toast.error('Erro ao gerar imagem.');
      setGenBusy(false);
    }
  };

  const makeBlob = (): Promise<Blob> =>
    new Promise((res, rej) => {
      try {
        buildSimulationCanvas(valor, brand).toBlob(
          (b) => (b ? res(b) : rej(new Error('blob'))), 'image/png');
      } catch (e) { rej(e); }
    });

  const shareImage = async () => {
    if (valor <= 0) { toast.error('Informe um valor para simular.'); return; }
    try {
      const blob = await makeBlob();
      const file = new File([blob], fileName(), { type: 'image/png' });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: 'Simulação Easy Imports' });
        return;
      }
      throw new Error('share-unsupported');
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const ok = await copyImage(true);
      if (!ok) downloadImage();
    }
  };

  const copyImage = async (silent = false): Promise<boolean> => {
    if (valor <= 0) { toast.error('Informe um valor para simular.'); return false; }
    try {
      const ClipboardItemAny: any = (window as any).ClipboardItem;
      if (!navigator.clipboard?.write || !ClipboardItemAny) throw new Error('unsupported');
      const item = new ClipboardItemAny({ 'image/png': makeBlob() });
      await navigator.clipboard.write([item]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Imagem copiada! Cole em qualquer campo.');
      return true;
    } catch {
      if (!silent) toast('Não foi possível copiar — use "Enviar / Compartilhar".', { icon: '📷' });
      return false;
    }
  };

  const quickValues = [500, 1000, 2000, 5000, 10000];
  const increments  = [100, 500, 1000];

  return (
    <div className="space-y-6 pb-10 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Calculator className="text-primary-700" size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Calculadora de Taxas</h2>
            <p className="text-neutral-500 text-sm font-medium">Simule o parcelamento e envie pro cliente</p>
          </div>
        </div>
      </div>

      {/* Valor + bandeira */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Valor simulado</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-neutral-400">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              placeholder="0,00"
              className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl pl-14 pr-4 py-4 text-3xl font-black text-neutral-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Valores diretos */}
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Valor direto</p>
            <div className="flex flex-wrap gap-2">
              {quickValues.map((v) => (
                <button
                  key={v}
                  onClick={() => setValorStr(String(v))}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border',
                    valor === v
                      ? 'bg-primary border-primary text-neutral-900'
                      : 'bg-neutral-100 border-neutral-200 hover:bg-primary/15 hover:border-primary/40 text-neutral-600 hover:text-neutral-900',
                  ].join(' ')}
                >
                  {brl(v)}
                </button>
              ))}
            </div>

            {/* Incrementos */}
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pt-1">Adicionar ao valor</p>
            <div className="flex flex-wrap gap-2">
              {increments.map((inc) => (
                <button
                  key={inc}
                  onClick={() => addIncrement(inc)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
                >
                  <Plus size={11} />
                  {brl(inc)}
                </button>
              ))}
              {valor > 0 && (
                <button
                  onClick={() => setValorStr('0')}
                  className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  Zerar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toggle bandeira */}
        <div>
          <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Maquininha / Cartão</label>
          <div className="grid grid-cols-2 gap-2">
            {BRANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBrand(b.id)}
                className={[
                  'flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl font-bold transition-all border-2 whitespace-nowrap overflow-hidden',
                  'text-[13px] sm:text-sm',
                  brand === b.id
                    ? 'bg-primary border-primary text-neutral-900 shadow-sm'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:border-primary/40',
                ].join(' ')}
              >
                <CreditCard size={15} className="flex-shrink-0 hidden min-[400px]:block" />
                <span className="sm:hidden">{b.short}</span>
                <span className="hidden sm:inline">{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={shareImage}
            className="flex items-center justify-center gap-2 bg-primary text-neutral-900 font-bold text-sm py-3 rounded-xl hover:brightness-95 transition-all sm:order-2"
          >
            <ImageIcon size={16} /> Enviar imagem
          </button>
          <button
            onClick={() => copyImage()}
            className="flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-neutral-800 transition-colors sm:order-1"
          >
            {copied ? <><Check size={16} /> Imagem copiada!</> : <><Copy size={16} /> Copiar imagem</>}
          </button>
          <button
            onClick={downloadImage}
            disabled={genBusy}
            className="flex items-center justify-center gap-2 bg-white border-2 border-neutral-200 text-neutral-700 font-bold text-sm py-3 rounded-xl hover:border-primary/40 transition-colors disabled:opacity-60 sm:order-3"
          >
            <Download size={16} /> Baixar imagem
          </button>
        </div>
        <p className="text-[11px] text-neutral-400 text-center -mt-1">
          📱 No celular, "Enviar imagem" abre direto o WhatsApp
        </p>
      </div>

      {/* Tabela (preview na tela) */}
      <div id="sim-table" className="bg-[#111827] rounded-2xl overflow-hidden shadow-lg border border-neutral-800">
        <div className="text-center py-4 bg-[#0B1220]">
          <p className="text-2xl font-black tracking-tight">
            <span className="text-white">Simulação </span>
            <span className="text-white">Easy</span><span className="text-primary">Imports</span>
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-3 bg-[#1B2433]">
          <span className="text-primary font-black text-xs uppercase tracking-widest">Valor simulado</span>
          <span className="text-white font-black text-xl">{brl(valor)}</span>
        </div>
        <p className="text-center text-neutral-400 text-xs font-bold py-2 bg-[#111827]">
          Cartão: {BRANDS.find((b) => b.id === brand)?.label}
        </p>

        {/* Cabeçalho */}
        <div className="grid grid-cols-[0.8fr_0.6fr_1.5fr_1.2fr] bg-[#0B1220] text-[11px] sm:text-xs font-black uppercase tracking-wider">
          <div className="px-4 py-3 text-primary">Parcelas</div>
          <div className="px-2 py-3 text-center text-primary">Taxa</div>
          <div className="px-2 py-3 text-right text-primary">Valor da Parcela</div>
          {/* Cabeçalho Total — fundo amarelo */}
          <div className="px-4 py-3 text-right bg-primary text-neutral-900 font-black">Total</div>
        </div>

        {rows.map((r, i) => (
          <div
            key={r.label}
            className={[
              'grid grid-cols-[0.8fr_0.6fr_1.5fr_1.2fr] items-center text-[15px] sm:text-base',
              i % 2 === 0 ? 'bg-[#161F2E]' : 'bg-[#1B2433]',
            ].join(' ')}
          >
            <span className="px-4 py-3 font-bold text-white">{r.label}</span>
            <span className="px-2 py-3 text-center text-neutral-500 font-medium text-[11px] sm:text-xs">
              {r.taxa.toLocaleString('pt-BR')}%
            </span>
            <span className="px-2 py-3 text-right tabular-nums whitespace-nowrap">
              {r.parcelas > 1 ? (
                <>
                  <span className="text-neutral-400 text-[12px] sm:text-[13px] font-semibold mr-1.5">{r.parcelas}x de</span>
                  <span className="text-white font-bold">{brl(r.parcelaValor)}</span>
                </>
              ) : (
                <span className="text-white font-bold">{brl(r.total)}</span>
              )}
            </span>
            {/* Coluna Total — fundo e texto amarelo */}
            <span className="px-4 py-3 text-right tabular-nums whitespace-nowrap bg-primary/10 text-primary font-black text-base sm:text-lg border-l border-primary/20">
              {brl(r.total)}
            </span>
          </div>
        ))}

        <p className="text-center text-neutral-500 text-[11px] py-2.5 bg-[#111827]">
          Easy Imports · Taxas sujeitas a alteração
        </p>
      </div>
    </div>
  );
};
