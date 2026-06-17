import React, { useState, useEffect, useCallback } from 'react';
import { Check, Loader2 } from 'lucide-react';

const FONTS = [
  { id: 'great-vibes',      family: 'Great Vibes',      label: 'Great Vibes',      style: 'Ultra Elegante' },
  { id: 'pinyon-script',    family: 'Pinyon Script',    label: 'Pinyon Script',    style: 'Formal' },
  { id: 'allura',           family: 'Allura',           label: 'Allura',           style: 'Caligráfico' },
  { id: 'alex-brush',       family: 'Alex Brush',       label: 'Alex Brush',       style: 'Delicado' },
  { id: 'sacramento',       family: 'Sacramento',       label: 'Sacramento',       style: 'Moderno' },
  { id: 'dancing-script',   family: 'Dancing Script',   label: 'Dancing Script',   style: 'Clássico' },
  { id: 'parisienne',       family: 'Parisienne',       label: 'Parisienne',       style: 'Parisiense' },
  { id: 'tangerine',        family: 'Tangerine',        label: 'Tangerine',        style: 'Ultrafino' },
  { id: 'ephesis',          family: 'Ephesis',          label: 'Ephesis',          style: 'Orgânico' },
  { id: 'kaushan-script',   family: 'Kaushan Script',   label: 'Kaushan Script',   style: 'Marcante' },
];

const COLORS = [
  { id: 'black',  hex: '#000000', label: 'Preto' },
  { id: 'navy',   hex: '#162040', label: 'Navy' },
  { id: 'charcoal', hex: '#2d2d2d', label: 'Carvão' },
];

const FONT_PARAM = FONTS.map(f => `family=${f.family.replace(/ /g, '+')}`).join('&');
const GFONTS_URL = `https://fonts.googleapis.com/css2?${FONT_PARAM}&display=swap`;

interface Props {
  defaultText?: string;
  onGenerate: (base64: string) => void;
}

export function SignatureTypedCreator({ defaultText = '', onGenerate }: Props) {
  const [text, setText] = useState(defaultText || 'Easy Imports');
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].id);
  const [fontsReady, setFontsReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!document.getElementById('sig-typed-fonts')) {
      const link = document.createElement('link');
      link.id = 'sig-typed-fonts';
      link.rel = 'stylesheet';
      link.href = GFONTS_URL;
      document.head.appendChild(link);
    }
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const renderToCanvas = useCallback(async (fontFamily: string, colorHex: string): Promise<string> => {
    await document.fonts.load(`80px "${fontFamily}"`);
    const W = 600, H = 180;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = colorHex;

    let fontSize = 88;
    ctx.font = `${fontSize}px "${fontFamily}"`;
    while (ctx.measureText(text).width > W - 48 && fontSize > 24) {
      fontSize -= 2;
      ctx.font = `${fontSize}px "${fontFamily}"`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2 + 4);
    return canvas.toDataURL('image/png');
  }, [text]);

  const handleApply = useCallback(async () => {
    if (!text.trim()) return;
    setGenerating(true);
    const font = FONTS.find(f => f.id === selectedFont)!;
    const color = COLORS.find(c => c.id === selectedColor)!;
    try {
      const base64 = await renderToCanvas(font.family, color.hex);
      onGenerate(base64);
    } finally {
      setGenerating(false);
    }
  }, [selectedFont, selectedColor, text, renderToCanvas, onGenerate]);

  const activeColor = COLORS.find(c => c.id === selectedColor)!;

  return (
    <div className="space-y-4">
      {/* Input + color */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Texto da assinatura
          </label>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={40}
            placeholder="Seu nome ou empresa"
            className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60 bg-white"
          />
        </div>
        <div className="flex-shrink-0">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Cor</label>
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                title={c.label}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  selectedColor === c.id ? 'border-yellow-400 scale-110 shadow' : 'border-neutral-300 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Font grid */}
      <div className="grid grid-cols-2 gap-2">
        {FONTS.map(font => {
          const isSelected = selectedFont === font.id;
          return (
            <button
              key={font.id}
              onClick={() => setSelectedFont(font.id)}
              className={`relative flex flex-col items-center justify-center px-3 py-4 rounded-2xl border-2 transition-all text-center overflow-hidden ${
                isSelected
                  ? 'border-yellow-400 bg-yellow-50 shadow-md'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 bg-yellow-400 text-black rounded-full p-0.5">
                  <Check size={9} strokeWidth={3} />
                </span>
              )}
              <span
                style={{
                  fontFamily: fontsReady ? `"${font.family}", cursive` : 'cursive',
                  fontSize: '24px',
                  color: activeColor.hex,
                  lineHeight: 1.3,
                  display: 'block',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {text.trim() || font.label}
              </span>
              <span className="text-[10px] text-neutral-400 mt-1 font-medium tracking-wide">
                {font.style}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleApply}
        disabled={generating || !text.trim()}
        className="w-full py-3 bg-neutral-900 text-white rounded-2xl font-bold text-sm tracking-wide
          hover:bg-neutral-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
          transition-all flex items-center justify-center gap-2"
      >
        {generating ? (
          <><Loader2 size={16} className="animate-spin" /> Gerando…</>
        ) : (
          'Usar esta Assinatura'
        )}
      </button>
    </div>
  );
}
