import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`p-4 rounded-full mb-4 ${variant === 'danger' ? 'bg-danger-light text-danger' : 'bg-primary-50 text-primary'}`}>
          <AlertCircle size={32} />
        </div>
        
        <h3 className="text-xl font-bold text-neutral-900 mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
          {message}
        </p>
        
        <div className="flex w-full gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            fullWidth
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
