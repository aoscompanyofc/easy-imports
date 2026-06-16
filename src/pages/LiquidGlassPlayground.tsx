import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Laptop, Play, Copy, Check, X, Search, Sliders, 
  HelpCircle, ShoppingBag, TrendingUp, Users, Settings, Plus,
  FileCode, Layers, Moon, Sun, ArrowUpRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useThemeStore } from '../stores/themeStore';
import toast from 'react-hot-toast';

// Mock chart data
const mockChartData = [
  { name: 'Jan', valor: 4000 },
  { name: 'Fev', valor: 4500 },
  { name: 'Mar', valor: 5100 },
  { name: 'Abr', valor: 4900 },
  { name: 'Mai', valor: 6200 },
  { name: 'Jun', valor: 7800 },
];

// Background Options
const BACKGROUNDS = [
  {
    id: 'tahoe-blue',
    name: 'Tahoe Blue (Padrão)',
    css: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
    blobs: [
      { color: 'bg-blue-600/30', animation: 'animate-blob-1' },
      { color: 'bg-purple-600/35', animation: 'animate-blob-2' },
      { color: 'bg-indigo-500/25', animation: 'animate-blob-3' }
    ]
  },
  {
    id: 'aurora-green',
    name: 'Tahoe Aurora Green',
    css: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #172554 100%)',
    blobs: [
      { color: 'bg-emerald-500/25', animation: 'animate-blob-1' },
      { color: 'bg-teal-600/30', animation: 'animate-blob-2' },
      { color: 'bg-cyan-500/20', animation: 'animate-blob-3' }
    ]
  },
  {
    id: 'amber-sunset',
    name: 'Tahoe Sunset Orange',
    css: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #581c87 100%)',
    blobs: [
      { color: 'bg-orange-500/25', animation: 'animate-blob-1' },
      { color: 'bg-amber-600/30', animation: 'animate-blob-2' },
      { color: 'bg-rose-500/20', animation: 'animate-blob-3' }
    ]
  },
  {
    id: 'obsidian-midnight',
    name: 'Tahoe Cosmic Obsidian',
    css: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)',
    blobs: [
      { color: 'bg-purple-900/20', animation: 'animate-blob-1' },
      { color: 'bg-zinc-800/45', animation: 'animate-blob-2' },
      { color: 'bg-indigo-950/20', animation: 'animate-blob-3' }
    ]
  }
];

export const LiquidGlassPlayground: React.FC = () => {
  const { isLiquidGlass, toggleLiquidGlass, isDark } = useThemeStore();
  const [activeBg, setActiveBg] = useState(BACKGROUNDS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Dock interaction bounce and zoom
  const [activeDockIndex, setActiveDockIndex] = useState<number | null>(null);

  // Mouse coordinate tracker for reflective highlight updates
  const playgroundRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!playgroundRef.current) return;
    const rect = playgroundRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Set custom variables on the container so children can inherit them
    playgroundRef.current.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
    playgroundRef.current.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
  };

  const copyCSS = () => {
    const cssCode = `/* APPLE LIQUID GLASS COMPONENT */
background: rgba(255, 255, 255, 0.10);
backdrop-filter: blur(40px) saturate(180%) brightness(115%);
-webkit-backdrop-filter: blur(40px) saturate(180%) brightness(115%);
border: 1px solid rgba(255, 255, 255, 0.12);
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.10);
border-radius: 32px;
background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.02) 100%);`;

    navigator.clipboard.writeText(cssCode);
    setCopiedCode(true);
    toast.success('Snippet CSS copiado com sucesso!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 border border-primary/20">
              <Sparkles size={12} /> Apple macOS Tahoe Design System
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            Laboratório Liquid Glass
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Experimente o design de vidro líquido premium de 2025/2026. Interaja com física real de reflexão, refração e blurs adaptativos.
          </p>
        </div>
        
        {/* Global Theme Toggle */}
        <div className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 w-fit">
          <span className="text-xs font-bold px-3 text-neutral-600 dark:text-neutral-300">
            Tema Geral Liquid Glass
          </span>
          <button
            onClick={toggleLiquidGlass}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
              isLiquidGlass 
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                : 'bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            {isLiquidGlass ? 'Ativo' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* Primary Simulator Workspace Container */}
      <div 
        ref={playgroundRef}
        onMouseMove={handleMouseMove}
        style={{ background: activeBg.css }}
        className="relative min-h-[720px] w-full rounded-[36px] overflow-hidden flex flex-col justify-between p-6 md:p-8 transition-all duration-500 shadow-2xl border border-white/10"
      >
        {/* Dynamic Wallpaper Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className={`absolute w-[400px] h-[400px] rounded-full filter blur-[80px] opacity-70 -top-20 -left-20 mix-blend-screen transition-colors duration-1000 ${activeBg.blobs[0].color} ${activeBg.blobs[0].animation}`} />
          <div className={`absolute w-[450px] h-[450px] rounded-full filter blur-[90px] opacity-65 -bottom-20 -right-20 mix-blend-screen transition-colors duration-1000 ${activeBg.blobs[1].color} ${activeBg.blobs[1].animation}`} />
          <div className={`absolute w-[350px] h-[350px] rounded-full filter blur-[70px] opacity-50 top-1/3 left-1/2 -translate-x-1/2 mix-blend-screen transition-colors duration-1000 ${activeBg.blobs[2].color} ${activeBg.blobs[2].animation}`} />
        </div>

        {/* 1. Navbar Mockup (Top menu bar) */}
        <header className="w-full h-11 liquid-glass-surface rounded-full flex items-center justify-between px-6 z-20 select-none" style={{ backdropFilter: 'blur(30px) saturate(180%) brightness(115%)' }}>
          <div className="liquid-glass-reflection" />
          <div className="liquid-glass-spotlight" />
          
          <div className="flex items-center gap-5 text-[13px] font-semibold text-white/90 z-10">
            <span className="cursor-pointer hover:text-white transition-colors"></span>
            <span className="cursor-pointer hover:text-white transition-colors font-bold">Tahoe</span>
            <span className="hidden sm:inline cursor-pointer hover:text-white transition-colors">Arquivo</span>
            <span className="hidden sm:inline cursor-pointer hover:text-white transition-colors">Editar</span>
            <span className="hidden sm:inline cursor-pointer hover:text-white transition-colors">Visualizar</span>
            <span className="hidden sm:inline cursor-pointer hover:text-white transition-colors">Janela</span>
          </div>

          <div className="flex items-center gap-4 text-[12px] font-semibold text-white/90 z-10">
            <span className="hidden md:inline bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
              Liquid Glass active
            </span>
            <span className="cursor-default">100% 🔋</span>
            <span className="cursor-default font-medium">Ter 12:43 PM</span>
          </div>
        </header>

        {/* 2. Content Dashboard Simulator */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 z-10 items-stretch flex-1">
          
          {/* Controls Panel (Left Side - 4 Columns) */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Background Control Panel */}
            <div className="liquid-glass-surface p-6 flex flex-col justify-between flex-1 min-h-[200px]">
              <div className="liquid-glass-reflection" />
              <div className="liquid-glass-spotlight" />
              
              <div className="z-10">
                <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                  <Sliders size={18} className="text-white/80" /> Ambiente Tahoe
                </h3>
                <p className="text-white/60 text-xs leading-relaxed mb-4">
                  O vidro líquido reflete e refrata o fundo. Selecione um papel de parede dinâmico para observar a refração mudar de tonalidade:
                </p>

                <div className="space-y-2.5">
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setActiveBg(bg)}
                      className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                        activeBg.id === bg.id
                          ? 'bg-white/20 border-white/30 text-white shadow-lg'
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{bg.name}</span>
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                        style={{ background: bg.css }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Interactive Elements Showcase (Inputs & Buttons) */}
            <div className="liquid-glass-surface p-6 flex flex-col gap-4 z-10">
              <div className="liquid-glass-reflection" />
              <div className="liquid-glass-spotlight" />

              <div className="z-10">
                <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                  <Layers size={18} className="text-white/80" /> Componentes
                </h3>
                
                <div className="space-y-4">
                  {/* Glass Sculpted Input */}
                  <div className="space-y-1.5">
                    <label className="text-white/70 text-xs font-semibold block">Filtro de Busca (Esculpido)</label>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                      <input 
                        type="text" 
                        placeholder="Pesquisar estoque..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm liquid-glass-input"
                      />
                    </div>
                  </div>

                  {/* Buttons Grid */}
                  <div className="space-y-1.5">
                    <label className="text-white/70 text-xs font-semibold block">Cápsulas de Vidro (Física de clique)</label>
                    <div className="flex flex-wrap gap-2">
                      <button className="liquid-glass-btn text-xs">
                        Adicionar <Plus size={14} />
                      </button>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="liquid-glass-btn text-xs bg-white/20 border-white/25 hover:bg-white/28"
                      >
                        Abrir Modal
                      </button>
                      <button className="liquid-glass-btn text-xs" disabled>
                        Bloqueado
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* Widgets Grid Dashboard (Middle/Right - 8 Columns) */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Top row: Summary widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Card 1: Receita */}
              <div className="liquid-glass-surface p-5 hover:translate-y-[-2px] transition-all duration-200 cursor-default group">
                <div className="liquid-glass-reflection" />
                <div className="liquid-glass-spotlight" />
                <div className="z-10 relative flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                      <ShoppingBag size={15} />
                    </span>
                    <span className="text-green-400 text-xs font-bold flex items-center gap-0.5 bg-green-500/10 px-2 py-0.5 rounded-full">
                      +12.4% <ArrowUpRight size={10} />
                    </span>
                  </div>
                  <div>
                    <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Vendas Mensais</span>
                    <h4 className="text-white text-2xl font-bold mt-1">R$ 54.200</h4>
                  </div>
                </div>
              </div>

              {/* Card 2: Clientes */}
              <div className="liquid-glass-surface p-5 hover:translate-y-[-2px] transition-all duration-200 cursor-default group">
                <div className="liquid-glass-reflection" />
                <div className="liquid-glass-spotlight" />
                <div className="z-10 relative flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                      <Users size={15} />
                    </span>
                    <span className="text-green-400 text-xs font-bold flex items-center gap-0.5 bg-green-500/10 px-2 py-0.5 rounded-full">
                      +8.2% <ArrowUpRight size={10} />
                    </span>
                  </div>
                  <div>
                    <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Novos Clientes</span>
                    <h4 className="text-white text-2xl font-bold mt-1">384</h4>
                  </div>
                </div>
              </div>

              {/* Card 3: Lucro Líquido */}
              <div className="liquid-glass-surface p-5 hover:translate-y-[-2px] transition-all duration-200 cursor-default group">
                <div className="liquid-glass-reflection" />
                <div className="liquid-glass-spotlight" />
                <div className="z-10 relative flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                      <TrendingUp size={15} />
                    </span>
                    <span className="text-green-400 text-xs font-bold flex items-center gap-0.5 bg-green-500/10 px-2 py-0.5 rounded-full">
                      +18.1% <ArrowUpRight size={10} />
                    </span>
                  </div>
                  <div>
                    <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Lucro Líquido</span>
                    <h4 className="text-white text-2xl font-bold mt-1">R$ 18.450</h4>
                  </div>
                </div>
              </div>

            </div>

            {/* Recharts Glass Chart Widget */}
            <div className="liquid-glass-surface p-6 flex-1 min-h-[300px] flex flex-col justify-between">
              <div className="liquid-glass-reflection" />
              <div className="liquid-glass-spotlight" />
              
              <div className="z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">Performance de Vendas</h3>
                    <p className="text-white/60 text-xs">Visão consolidada do lucro líquido no primeiro semestre</p>
                  </div>
                  <span className="bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/10">
                    Janeiro - Junho
                  </span>
                </div>

                <div className="flex-1 w-full h-[180px] min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.4)" 
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.4)" 
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.12)', 
                          backdropFilter: 'blur(30px)', 
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '16px',
                          color: '#ffffff'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="valor" 
                        stroke="#ffffff" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValor)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </section>
        </main>

        {/* 3. macOS Bottom Dock Mockup */}
        <div className="w-full flex justify-center z-20 pt-4 select-none">
          <div className="liquid-glass-dock h-16 px-4 flex items-end gap-3 pb-2.5">
            <div className="liquid-glass-reflection" />
            <div className="liquid-glass-spotlight" />
            
            {/* Dock Item 1 */}
            <div 
              onMouseEnter={() => setActiveDockIndex(0)}
              onMouseLeave={() => setActiveDockIndex(null)}
              onClick={() => toast.success('Dashboard clicado!')}
              className={`w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer relative z-10 transition-all duration-200 origin-bottom ${
                activeDockIndex === 0 ? 'scale-125 -translate-y-2' : ''
              }`}
              title="Dashboard"
            >
              <Laptop size={20} />
            </div>

            {/* Dock Item 2 */}
            <div 
              onMouseEnter={() => setActiveDockIndex(1)}
              onMouseLeave={() => setActiveDockIndex(null)}
              onClick={() => setIsModalOpen(true)}
              className={`w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer relative z-10 transition-all duration-200 origin-bottom ${
                activeDockIndex === 1 ? 'scale-125 -translate-y-2' : ''
              }`}
              title="Modais"
            >
              <Layers size={20} />
            </div>

            {/* Dock Item 3 */}
            <div 
              onMouseEnter={() => setActiveDockIndex(2)}
              onMouseLeave={() => setActiveDockIndex(null)}
              onClick={copyCSS}
              className={`w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer relative z-10 transition-all duration-200 origin-bottom ${
                activeDockIndex === 2 ? 'scale-125 -translate-y-2' : ''
              }`}
              title="Copiar CSS"
            >
              <FileCode size={20} />
            </div>

            {/* Dock Item 4 */}
            <div 
              onMouseEnter={() => setActiveDockIndex(3)}
              onMouseLeave={() => setActiveDockIndex(null)}
              onClick={() => toast.success('Ajustes do Sistema')}
              className={`w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer relative z-10 transition-all duration-200 origin-bottom ${
                activeDockIndex === 3 ? 'scale-125 -translate-y-2' : ''
              }`}
              title="Configurações"
            >
              <Settings size={20} />
            </div>
          </div>
        </div>

        {/* 4. Draggable / Floating Glass Modal Component Demo */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div 
              className="w-full max-w-[480px] liquid-glass-surface p-8 z-50 select-none animate-in zoom-in-95 duration-300 relative border border-white/20 shadow-2xl"
              style={{ 
                backdropFilter: 'blur(60px) saturate(180%) brightness(115%)',
                borderRadius: '36px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="liquid-glass-reflection" />
              
              <div className="z-10 relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-600/30 cursor-pointer" onClick={() => setIsModalOpen(false)} title="Fechar" />
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-600/30 cursor-default" />
                    <span className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-600/30 cursor-default" />
                  </div>
                  <h4 className="text-white font-bold text-sm">Visualização de Modal</h4>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-4 border border-white/10">
                    <Sparkles size={24} />
                  </div>
                  
                  <h3 className="text-white font-extrabold text-xl leading-tight">
                    Profundidade Premium de Vidro Líquido
                  </h3>
                  
                  <p className="text-white/70 text-sm leading-relaxed">
                    Este modal flutuante foi configurado com um desfoque adaptativo de 60px (Deep Blur), cantos altamente arredondados (36px) e uma borda de luz quase invisível.
                  </p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white/80 leading-relaxed max-h-[120px] overflow-y-auto">
                    <code>
                      border-radius: 36px;<br/>
                      backdrop-filter: blur(60px) saturate(180%) brightness(115%);<br/>
                      border: 1px solid rgba(255,255,255,0.15);<br/>
                      box-shadow: 0 30px 80px rgba(0,0,0,0.3);
                    </code>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="liquid-glass-btn text-xs bg-white/5 border-white/10 hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        toast.success('Alterações salvas!');
                        setIsModalOpen(false);
                      }}
                      className="liquid-glass-btn text-xs bg-white/20 border-white/30 hover:bg-white/25 text-white"
                    >
                      Confirmar Ação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 5. CSS Inspector Code Panel */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <FileCode size={20} className="text-neutral-500" /> Inspetor de Regras CSS Liquid Glass
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Copie as propriedades exatas exigidas para criar superfícies premium de vidro líquido da Apple.
            </p>
          </div>
          
          <button
            onClick={copyCSS}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full hover:opacity-90 active:scale-95 transition-all w-fit"
          >
            {copiedCode ? (
              <>
                <Check size={14} /> Copiado
              </>
            ) : (
              <>
                <Copy size={14} /> Copiar Regras CSS
              </>
            )}
          </button>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 rounded-2xl p-5 font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed overflow-x-auto">
          <span className="text-neutral-400 dark:text-neutral-600">// Propriedades fundamentais do Material</span><br/>
          <span className="text-purple-600 dark:text-purple-400">background</span>: <span className="text-blue-600 dark:text-blue-400">rgba(255, 255, 255, 0.10)</span>;<br/>
          <span className="text-purple-600 dark:text-purple-400">backdrop-filter</span>: <span className="text-blue-600 dark:text-blue-400">blur(40px) saturate(180%) brightness(115%)</span>;<br/>
          <span className="text-purple-600 dark:text-purple-400">-webkit-backdrop-filter</span>: <span className="text-blue-600 dark:text-blue-400">blur(40px) saturate(180%) brightness(115%)</span>;<br/>
          <span className="text-purple-600 dark:text-purple-400">border</span>: <span className="text-blue-600 dark:text-blue-400">1px solid rgba(255, 255, 255, 0.12)</span>;<br/>
          <span className="text-purple-600 dark:text-purple-400">box-shadow</span>: <span className="text-blue-600 dark:text-blue-400">0 20px 60px rgba(0, 0, 0, 0.10)</span>;<br/>
          <span className="text-purple-600 dark:text-purple-400">border-radius</span>: <span className="text-blue-600 dark:text-blue-400">32px</span>;<br/>
          <br/>
          <span className="text-neutral-400 dark:text-neutral-600">// Reflexos e lentes sobrepostos</span><br/>
          <span className="text-purple-600 dark:text-purple-400">background-image</span>: <span className="text-blue-600 dark:text-blue-400">linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.02) 100%)</span>;
        </div>
      </section>

    </div>
  );
};
