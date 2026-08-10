import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Impede fechar clicando no overlay (ex.: enquanto salva). */
  closeDisabled?: boolean;
  /** Padding interno do container (default true). */
  padded?: boolean;
  /** Arredondamento do container (default '2xl'). */
  rounded?: 'xl' | '2xl';
  /** Sombra do container (default 'xl'). */
  shadow?: 'xl' | '2xl';
  /** Altura máxima do container (default '90vh'). */
  maxHeight?: '80vh' | '85vh' | '90vh';
  /** Classes extras para o container branco (não conflitantes com os defaults). */
  className?: string;
  children: React.ReactNode;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
};

const roundedClasses: Record<NonNullable<ModalProps['rounded']>, string> = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

const shadowClasses: Record<NonNullable<ModalProps['shadow']>, string> = {
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
};

const maxHeightClasses: Record<NonNullable<ModalProps['maxHeight']>, string> = {
  '80vh': 'max-h-[80vh]',
  '85vh': 'max-h-[85vh]',
  '90vh': 'max-h-[90vh]',
};

/**
 * Modal padronizado (overlay + container branco + título).
 * Elimina o bloco `fixed inset-0 bg-black/50 ...` duplicado em ~47 pontos
 * das páginas. Presentacional: só renderiza, não tem lógica de dados.
 */
export const Modal = React.memo(function Modal({
  open,
  onClose,
  title,
  size = 'lg',
  closeDisabled = false,
  padded = true,
  rounded = '2xl',
  shadow = 'xl',
  maxHeight = '90vh',
  className = '',
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => !closeDisabled && onClose()}
    >
      <div
        className={`bg-white ${roundedClasses[rounded]} ${shadowClasses[shadow]} ${maxHeightClasses[maxHeight]} overflow-y-auto ${padded ? 'p-6' : ''} w-full ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
});
