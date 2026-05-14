import React, { useEffect } from 'react';
import { Input } from './Input';
import {
  DEVICE_CATALOG, ALL_CATEGORIES, getModelsByCategory,
  getCapacitiesForModel, getColorsForModel,
  BATTERY_HEALTH_OPTIONS, COMMON_CONDITIONS,
} from '../../lib/deviceCatalog';

export interface DeviceFormData {
  category: string;
  model: string;
  capacity: string;
  color: string;
  condition: string;
  battery_health: string;
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
    imei: '',
    purchase_price: '',
    sale_price: '',
  };
}

export function deviceFormToProductName(f: DeviceFormData): string {
  return [f.model, f.capacity, f.color].filter(Boolean).join(' ');
}

interface Props {
  value: DeviceFormData;
  onChange: (v: DeviceFormData) => void;
  showSalePrice?: boolean;
  salePriceLabel?: string;
}

const S = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

export const DeviceForm: React.FC<Props> = ({ value, onChange, showSalePrice = true, salePriceLabel }) => {
  const set = (field: keyof DeviceFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...value, [field]: e.target.value });
  };

  // Reset model/capacity/color when category changes
  const handleCategory = (cat: string) => {
    onChange({ ...value, category: cat, model: '', capacity: '', color: '' });
  };

  // Reset capacity/color when model changes
  const handleModel = (model: string) => {
    const caps = getCapacitiesForModel(model);
    const cols = getColorsForModel(model);
    onChange({
      ...value,
      model,
      capacity: caps.length === 1 ? caps[0] : '',
      color: cols.length === 1 ? cols[0] : '',
    });
  };

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
            <select className={S} value={value.model} onChange={(e) => handleModel(e.target.value)}>
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
        {value.model === '__custom' && (
          <div className="sm:col-span-2">
            <Input
              label="Modelo (digitar)"
              placeholder="Ex: iPhone 15 Pro Max"
              value=""
              onChange={(e) => onChange({ ...value, model: e.target.value })}
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
            <select className={S} value={value.capacity} onChange={set('capacity')}>
              <option value="">Selecione...</option>
              {catalogCapacities.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Digitar...</option>
            </select>
          ) : (
            <input className={S} placeholder="Ex: 256GB" value={value.capacity} onChange={set('capacity')} autoComplete="off" />
          )}
          {value.capacity === '__custom' && (
            <input className={`${S} mt-2`} placeholder="Ex: 256GB" value="" onChange={(e) => onChange({ ...value, capacity: e.target.value })} autoComplete="off" />
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Cor</label>
          {catalogColors.length > 0 ? (
            <select className={S} value={value.color} onChange={set('color')}>
              <option value="">Selecione...</option>
              {catalogColors.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Digitar...</option>
            </select>
          ) : (
            <input className={S} placeholder="Ex: Titânio Natural" value={value.color} onChange={set('color')} autoComplete="off" />
          )}
          {value.color === '__custom' && (
            <input className={`${S} mt-2`} placeholder="Ex: Titânio Natural" value="" onChange={(e) => onChange({ ...value, color: e.target.value })} autoComplete="off" />
          )}
        </div>
      </div>

      {/* Row 3: Condition + Battery Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">Estado de Conservação *</label>
          <select className={S} value={value.condition} onChange={set('condition')}>
            {COMMON_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {showBattery ? (
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

      {/* IMEI */}
      <Input
        label="IMEI / Serial"
        placeholder="Ex: 352XXXXXXXXXXXX"
        value={value.imei}
        onChange={set('imei')}
        autoComplete="off"
      />

      {/* Prices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Preço de Custo (R$) *"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          required
          value={value.purchase_price}
          onChange={set('purchase_price')}
        />
        {showSalePrice && (
          <Input
            label={salePriceLabel || 'Preço de Venda (R$) — opcional'}
            type="number"
            step="0.01"
            min="0"
            placeholder="Definir na hora da venda"
            value={value.sale_price || ''}
            onChange={set('sale_price')}
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
