import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div 
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden',
          maxWidths[maxWidth]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            {title ? <h3 className="text-lg font-bold text-neutral-900">{title}</h3> : <div />}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
