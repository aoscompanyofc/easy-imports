import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Option {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  error,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn('w-full space-y-1.5', className)} ref={containerRef}>
      {label && <label className="text-sm font-medium text-neutral-700">{label}</label>}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between bg-white border border-neutral-200 rounded-lg px-4 py-3 text-sm text-left transition-all outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
            error && 'border-danger focus:ring-danger/25 focus:border-danger',
            !selectedOption && 'text-neutral-400'
          )}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown
            size={18}
            className={cn('text-neutral-400 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {options.length > 5 && (
              <div className="p-2 border-b border-neutral-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                  <input
                    type="text"
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-primary"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors',
                      option.value === value ? 'bg-primary-50 text-neutral-900 font-semibold' : 'text-neutral-600'
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    {option.label}
                    {option.value === value && <Check size={16} className="text-primary" />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs text-neutral-400">
                  Nenhuma opção encontrada
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  );
};
