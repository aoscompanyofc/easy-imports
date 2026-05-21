import React, { useEffect, useState } from 'react';
import { Input } from './Input';
import {
  DEVICE_CATALOG, ALL_CATEGORIES, getModelsByCategory,
  getCapacitiesForModel, getColorsForModel,
  BATTERY_HEALTH_OPTIONS, COMMON_CONDITIONS, WARRANTY_OPTIONS,
} from '../../lib/deviceCatalog';

export interface DeviceFormData {
  category: string;
  model: string;
  capacity: string;
  color: string;
  condition: string;
  battery_health: string;
  warranty: string;
  origin: string;
  entry_date: string;
  imei: string;
  purchase_price: string;
  sale_price?: string;
}

export function emptyDeviceForm(): DeviceFormData {
  return {
    category: 'iPhone',
    model: '',
    capacity: '',
    color: '',
    condition: 'Seminovo — Excelente',
    battery_health: '',
    warranty: 'Sem garantia',
    origin: '',
    entry_date: new Date().toISOString().split('T')[0],
    imei: '',
    purchase_price: '',
    sale_price: '',
  };
}

export function deviceFormToProductName(f: DeviceFormData): string {
  return [f.model, f.capacity !== '—' ? f.capacity : '', f.color].filter(Boolean).join(' ');
}

interface Props {
  value: DeviceFormData;
  onChange: (v: DeviceFormData) => void;
  showSalePrice?: boolean;
  salePriceLabel?: string;
  purchasePriceLabel?: string;
  purchasePriceRequired?: boolean;
}

const S = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

export const DeviceForm: React.FC<Props> = ({ value, onChange, showSalePrice = true, salePriceLabel, purchasePriceLabel, purchasePriceRequired = true }) => {
  const set = (field: keyof DeviceFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...value, [field]: e.target.value });
  };

  // Track whether each field is in "custom text" mode (user chose "Digitar...")
  const [isCustom, setIsCustom] = useState({ model: false, capacity: false, color: false });

  // Reset custom mode when value is cleared externally (e.g. form reset)
  useEffect(() => { if (!value.model) setIsCustom((p) => ({ ...p, model: false })); }, [value.model]);
  useEffect(() => { if (!value.capacity) setIsCustom((p) => ({ ...p, capacity: false })); }, [value.capacity]);
  useEffect(() => { if (!value.color) setIsCustom((p) => ({ ...p, color: false })); }, [value.color]);

  // Reset model/capacity/color when category changes
  const handleCategory = (cat: string) => {
    setIsCustom({ model: false, capacity: false, color: false });
    onChange({ ...value, category: cat, model: '', capacity: '', color: '' });
  };

  // Reset capacity/color when model changes
  const handleModel = (model: string) => {
    if (model === '__custom') {
      setIsCustom((p) => ({ ...p, model: true, capacity: false, color: false }));
      onChange({ ...value, model: '', capacity: '', color: '' });
      return;
    }
    setIsCustom({ model: false, capacity: false, color: false });
    const caps = getCapacitiesForModel(model);
    const cols = getColorsForModel(model);
    onChange({
      ...value,
      model,
      capacity: caps.length === 1 ? caps[0] : '',
      color: cols.length === 1 ? cols[0] : '',
    });
  };

  const handleCapacity = (cap: string) => {
    if (cap === '__custom') {
      setIsCustom((p) => ({ ...p, capacity: true }));
      onChange({ ...value, capacity: '' });
      return;
    }
    setIsCustom((p) => ({ ...p, capacity: false }));
    onChange({ ...value, capacity: cap });
  };

  const handleColor = (col: string) => {
    if (col === '__custom') {
      setIsCustom((p) => ({ ...p, color: true }));
      onChange({ ...value, color: '' });
      return;
    }
    setIsCustom((p) => ({ ...p, color: false }));
    onChange({ ...value, color: col });
  };

  // When condition is "Novo (lacrado)", auto-fill Apple 1-year warranty
  const handleCondition = (cond: string) => {
    if (cond === 'Novo (lacrado)') {
      onChange({ ...value, condition: cond, warranty: '1 ano (Apple)', battery_health: '' });
    } else {
      onChange({ ...value, condition: cond });
    }
  };

  const isNovo = value.condition === 'Novo (lacrado)';

  // Categorias que usam apenas IMEI (chip SIM)
  const IMEI_ONLY_CATS = ['iPhone', 'Smartphones'];
  // Categorias que usam apenas Número de Série (sem chip)
  const SERIAL_ONLY_CATS = ['MacBook', 'AirPods'];

  const imeiConfig = (() => {
    if (IMEI_ONLY_CATS.includes(value.category))
      return { label: 'IMEI', placeholder: '352XXXXXXXXXXXX', maxLength: 15, hint: 'Máx. 15 dígitos' };
    if (SERIAL_ONLY_CATS.includes(value.category))
      return { label: 'Número de Série', placeholder: 'Ex: C02X1234JGH5', maxLength: undefined, hint: null };
    // iPad, Watch, Outro — pode ter IMEI (cellular) ou Série (Wi-Fi)
    return { label: 'IMEI / Número de Série', placeholder: 'IMEI (15 dig.) ou Nº de Série', maxLength: undefined, hint: 'Chip: 15 dígitos · Wi-Fi: Número de Série' };
  })();

  const catalogCategories = ALL_CATEGORIES;
  const catalogModels = value.category ? getModelsByCategory(value.category) : [];
  const catalogCapacities = value.model ? getCapacitiesForModel(value.model) : [];
  const catalogColors = value.model ? getColorsForModel(value.model) : [];

  const showBattery = value.condition !== 'Novo (lacrado)' && value.condition !== 'Não se aplica';

  const profit = (Number(value.sale_price) || 0) - (Number(value.purchase_price) || 0);
  const margin = Number(value.sale_price) > 0 ? (profit / Number(value.sale_price)) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Row 1: Category + Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria *</label>
          <select className={S} value={value.category} onChange={(e) => handleCategory(e.target.value)}>
            {catalogCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Modelo *</label>
          {catalogModels.length > 0 ? (
            <select className={S} value={isCustom.model ? '__custom' : value.model} onChange={(e) => handleModel(e.target.value)}>
              <option value="">Selecione o modelo...</option>
              {catalogModels.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              <option value="__custom">Digitar manualmente...</option>
            </select>
          ) : (
            <input
              className={S}
              placeholder="Ex: iPhone 15 Pro Max"
              value={value.model}
              onChange={set('model')}
              autoComplete="off"
            />
          )}
        </div>

        {/* Manual model input when __custom selected */}
        {isCustom.model && (
          <div className="sm:col-span-2">
            <Input
              label="Modelo (digitar)"
              placeholder="Ex: iPhone 15 Pro Max"
              value={value.model}
              onChange={(e) => onChange({ ...value, model: e.target.value })}
              autoFocus
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {/* Row 2: Capacity + Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Capacidade / Armazenamento</label>
          {catalogCapacities.length > 0 ? (
            <select className={S} value={isCustom.capacity ? '__custom' : value.capacity} onChange={(e) => handleCapacity(e.target.value)}>
              <option value="">Selecione...</option>
              {catalogCapacities.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Digitar...</option>
            </select>
          ) : (
            <input className={S} placeholder="Ex: 256GB" value={value.capacity} onChange={set('capacity')} autoComplete="off" />
          )}
          {isCustom.capacity && (
            <input className={`${S} mt-2`} placeholder="Ex: 256GB" value={value.capacity} onChange={(e) => onChange({ ...value, capacity: e.target.value })} autoFocus autoComplete="off" />
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Cor</label>
          {catalogColors.length > 0 ? (
            <select className={S} value={isCustom.color ? '__custom' : value.color} onChange={(e) => handleColor(e.target.value)}>
              <option value="">Selecione...</option>
              {catalogColors.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Digitar...</option>
            </select>
          ) : (
            <input className={S} placeholder="Ex: Titânio Natural" value={value.color} onChange={set('color')} autoComplete="off" />
          )}
          {isCustom.color && (
            <input className={`${S} mt-2`} placeholder="Ex: Titânio Natural" value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} autoFocus autoComplete="off" />
          )}
        </div>
      </div>

      {/* Row 3: Condition + Battery Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado de Conservação *</label>
          <select className={S} value={value.condition} onChange={(e) => handleCondition(e.target.value)}>
            {COMMON_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {showBattery && !isNovo ? (
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Saúde da Bateria</label>
            <select className={S} value={value.battery_health} onChange={set('battery_health')}>
              <option value="">Não verificado</option>
              {BATTERY_HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Row 4: Warranty — auto-filled for new devices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Garantia</label>
          {isNovo ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-300 rounded-xl">
              <span className="text-green-600 font-black text-base">✓</span>
              <span className="text-sm font-bold text-green-700">1 ano (Apple) — garantia de fábrica</span>
            </div>
          ) : (
            <select className={S} value={value.warranty || 'Sem garantia'} onChange={set('warranty')}>
              {WARRANTY_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Row 5: Origin + Entry Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Origem do Aparelho</label>
          <input
            className={S}
            placeholder="Ex: João Silva, Fornecedor ABC..."
            value={value.origin || ''}
            onChange={(e) => onChange({ ...value, origin: e.target.value })}
            autoComplete="off"
          />
        </div>
        <Input
          label="Data de Entrada"
          type="date"
          value={value.entry_date || new Date().toISOString().split('T')[0]}
          onChange={set('entry_date')}
        />
      </div>

      {/* IMEI / Serial */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-bold text-neutral-700">{imeiConfig.label}</label>
          {imeiConfig.maxLength && (
            <span className={`text-xs font-mono ${value.imei.length === imeiConfig.maxLength ? 'text-emerald-600 font-bold' : value.imei.length > 0 ? 'text-neutral-500' : 'text-neutral-300'}`}>
              {value.imei.length}/{imeiConfig.maxLength}
            </span>
          )}
        </div>
        <input
          className={S}
          placeholder={imeiConfig.placeholder}
          value={value.imei}
          maxLength={imeiConfig.maxLength}
          onChange={(e) => {
            const val = imeiConfig.maxLength
              ? e.target.value.replace(/\D/g, '').slice(0, imeiConfig.maxLength)
              : e.target.value;
            onChange({ ...value, imei: val });
          }}
          autoComplete="off"
          inputMode={imeiConfig.maxLength ? 'numeric' : 'text'}
        />
        {imeiConfig.hint && (
          <p className="text-[11px] text-neutral-400 mt-1">{imeiConfig.hint}</p>
        )}
      </div>

      {/* Prices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={purchasePriceLabel || 'Preço de Custo (R$) *'}
          type="number"
          step="any"
          inputMode="decimal"
          placeholder="Ex: 9000"
          required={purchasePriceRequired}
          value={value.purchase_price}
          onChange={set('purchase_price')}
          autoComplete="off"
        />
        {showSalePrice && (
          <Input
            label={salePriceLabel || 'Preço de Venda (R$) — opcional'}
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="Ex: 11000"
            value={value.sale_price || ''}
            onChange={set('sale_price')}
            autoComplete="off"
          />
        )}
      </div>

      {/* Margin preview */}
      {value.purchase_price && value.sale_price && Number(value.sale_price) > 0 && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
          <span className="text-sm font-bold text-neutral-700">Margem de lucro:</span>
          <div className="text-right">
            <p className="text-lg font-black text-primary-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)}
            </p>
            <p className="text-xs font-bold text-green-600">{margin.toFixed(1)}% de margem</p>
          </div>
        </div>
      )}

      {/* Auto-generated name preview */}
      {deviceFormToProductName(value) && (
        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2">
          Nome gerado: <strong className="text-neutral-600">{deviceFormToProductName(value)}</strong>
          {value.battery_health ? ` · Bateria: ${value.battery_health}` : ''}
        </div>
      )}
    </div>
  );
};
