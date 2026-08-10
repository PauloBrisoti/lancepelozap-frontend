export type ActionColor = 'green' | 'yellow' | 'orange' | 'red' | 'brand';

export interface StatusAction {
  /** Status(es) em que a ação aparece */
  when: string | string[];
  label: string;
  color?: ActionColor;
  onClick: () => void;
}

interface Props {
  status: string;
  actions: StatusAction[];
  /** Ação de cancelar (sem destaque), oculta para status terminais */
  cancel?: {
    label: string;
    hideFor: string[];
    onClick: () => void;
  };
}

const colorClasses: Record<ActionColor, string> = {
  green: 'bg-green-600 hover:bg-green-700',
  yellow: 'bg-yellow-600 hover:bg-yellow-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
  red: 'bg-red-600 hover:bg-red-700',
  brand: 'bg-brand-600 hover:bg-brand-700',
};

/**
 * Botões de transição de status de um registro (agendamento, OS, etc).
 * Presentacional: recebe status + configuração de ações e renderiza.
 */
export function StatusActions({ status, actions, cancel }: Props) {
  const visible = actions.filter(a => (Array.isArray(a.when) ? a.when.includes(status) : a.when === status));
  const showCancel = !!cancel && !cancel.hideFor.includes(status);

  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
      {visible.map(a => (
        <button key={a.label} onClick={a.onClick} className={`${colorClasses[a.color ?? 'brand']} text-white px-4 py-2 rounded-lg font-medium text-sm`}>
          {a.label}
        </button>
      ))}
      {showCancel && cancel && (
        <button onClick={cancel.onClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
          {cancel.label}
        </button>
      )}
    </div>
  );
}
