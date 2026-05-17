import { useState, createContext, useContext, ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({
    title: 'Confirm',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false,
  });
  const [isAlert, setIsAlert] = useState(false);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
  const [alertResolver, setAlertResolver] = useState<(() => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Confirm',
        message: options.message,
        confirmText: options.confirmText || 'Aceptar',
        cancelText: options.cancelText || 'Cancelar',
        danger: options.danger || false,
      });
      setIsAlert(false);
      setIsOpen(true);
      setResolver(() => resolve);
    });
  };

  const alert = (message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({
        title: title || 'Información',
        message,
        confirmText: 'Aceptar',
        cancelText: 'Cancel',
        danger: false,
      });
      setIsAlert(true);
      setIsOpen(true);
      setAlertResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (isAlert && alertResolver) {
      alertResolver();
      setAlertResolver(null);
    } else if (resolver) {
      resolver(true);
      setResolver(null);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (!isAlert && resolver) {
      resolver(false);
      setResolver(null);
    }
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title={config.title || ''}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">{config.message}</p>
          <div className="flex gap-3 justify-end">
            {!isAlert && (
              <Button variant="secondary" onClick={handleCancel}>
                {config.cancelText}
              </Button>
            )}
            <Button
              variant={config.danger ? 'danger' : 'primary'}
              onClick={handleConfirm}
            >
              {config.confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
