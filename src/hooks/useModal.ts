import { useCallback, useState } from 'react';

/**
 * Estado de abertura/fechamento de um modal.
 *
 *   const modal = useModal();
 *   <button onClick={modal.openModal}>Abrir</button>
 *   <Modal open={modal.open} onClose={modal.closeModal} ... />
 */
export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return { open, openModal, closeModal, setOpen };
}
