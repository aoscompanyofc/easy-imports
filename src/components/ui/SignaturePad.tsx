import React, { useRef, useEffect, useState } from 'react';
import { Trash2, PenLine, Type, Check } from 'lucide-react';

const FONTS = [
  {
    id: 'moderna',
    label: 'Moderna',
    value: '"Helvetica Neue", Arial, sans-serif',
    style: { fontFamily: '"Helvetica Neue", Arial, sans-serif', fontStyle: 'italic', fontWeight: '700' },
  },
  {
    id: 'manuscrita',
    label: 'Manuscrita',
    value: '"Brush Script MT", "Segoe Script", "Comic Sans MS", cursive',
    style: { fontFamily: '"Brush Script MT", "Segoe Script", "Comic Sans MS", cursive', fontStyle: 'normal', fontWeight: '400' },
  },
  {
    id: 'elegante',
    label: 'Elegante',
    value: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    style: { fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif', fontStyle: 'italic', fontWeight: '700' },
  },
];

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  height?: number;
  placeholder?: string;
  readOnly?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  height = 130,
  placeholder = 'Assine aqui',
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasDrawn = useRef(false);

  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typeText, setTypeText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONTS[1].id);

  // Load existing signature image into canvas (draw mode)
  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      hasDrawn.current = true;
    } else {
      hasDrawn.current = false;
    }
  }, [value, mode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    hasDrawn.current = true;
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasDrawn.current) onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const clearDraw = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    onChange('');
  };

  const applyTypedSignature = () => {
    const text = typeText.trim();
    if (!text) return;
    const font = FONTS.find((f) => f.id === selectedFont) || FONTS[1];
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 260;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSize = font.id === 'manuscrita' ? 80 : 64;
    ctx.font = `${font.style.fontStyle} ${font.style.fontWeight} ${fontSize}px ${font.value}`;
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 24, 130);
    onChange(canvas.toDataURL('image/png'));
  };

  const selectedFontData = FONTS.find((f) => f.id === selectedFont) || FONTS[1];

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      {!readOnly && (
        <div className="flex gap-1.5 bg-neutral-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all',
              mode === 'draw'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            <PenLine size={13} /> Desenhar
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all',
              mode === 'type'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            <Type size={13} /> Digitar
          </button>
        </div>
      )}

      {/* Draw mode */}
      {mode === 'draw' && (
        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={800}
            height={height * 2}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className={[
              'w-full rounded-xl border-2 bg-white touch-none',
              readOnly
                ? 'border-neutral-200 cursor-default'
                : 'border-dashed border-neutral-300 cursor-crosshair hover:border-primary/50 transition-colors',
            ].join(' ')}
            style={{ height: `${height}px` }}
          />
          {!value && !readOnly && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-neutral-300 text-sm select-none">
              {placeholder}
            </span>
          )}
          {value && !readOnly && (
            <button
              type="button"
              onClick={clearDraw}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm"
              title="Limpar assinatura"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Type mode */}
      {mode === 'type' && !readOnly && (
        <div className="space-y-3">
          {/* Text input */}
          <input
            type="text"
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
            placeholder="Digite o nome ou empresa..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
            autoComplete="off"
          />

          {/* Font selector */}
          <div className="flex gap-2">
            {FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => setSelectedFont(font.id)}
                className={[
                  'flex-1 py-2 px-2 rounded-xl border-2 text-center transition-all',
                  selectedFont === font.id
                    ? 'border-primary bg-primary/10'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white',
                ].join(' ')}
              >
                <div
                  className="text-lg leading-tight text-neutral-900 mb-0.5"
                  style={{ fontFamily: font.value, fontStyle: font.style.fontStyle as any, fontWeight: font.style.fontWeight as any }}
                >
                  Aa
                </div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">{font.label}</div>
              </button>
            ))}
          </div>

          {/* Live preview */}
          {typeText.trim() ? (
            <div
              className="w-full border-2 border-dashed border-neutral-200 rounded-xl bg-white px-6 py-4 text-center overflow-hidden"
              style={{
                fontFamily: selectedFontData.value,
                fontStyle: selectedFontData.style.fontStyle as any,
                fontWeight: selectedFontData.style.fontWeight as any,
                fontSize: selectedFontData.id === 'manuscrita' ? '2.4rem' : '2rem',
                color: '#0f172a',
                minHeight: `${height}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {typeText}
            </div>
          ) : (
            <div
              className="w-full border-2 border-dashed border-neutral-100 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-300 text-sm select-none"
              style={{ minHeight: `${height}px` }}
            >
              Pré-visualização da assinatura
            </div>
          )}

          {/* Apply button */}
          <button
            type="button"
            onClick={applyTypedSignature}
            disabled={!typeText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
          >
            <Check size={16} /> Usar esta assinatura
          </button>

          {/* Show current applied sig if any */}
          {value && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <Check size={12} /> Assinatura aplicada — clique em "Usar" novamente para atualizar
              <button
                type="button"
                onClick={() => { onChange(''); setTypeText(''); }}
                className="ml-auto text-neutral-400 hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Read-only: show existing signature as image */}
      {readOnly && value && mode === 'type' && (
        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={800}
            height={height * 2}
            className="w-full rounded-xl border-2 border-neutral-200 bg-white"
            style={{ height: `${height}px` }}
          />
        </div>
      )}
    </div>
  );
};
