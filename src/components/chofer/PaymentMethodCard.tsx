import type { PaymentMethod } from '../../types';

// Iconos SVG simples para cada método
function MethodIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  const s = size;
  switch (icon) {
    case 'banknote':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M6 12h.01M18 12h.01"/>
        </svg>
      );
    case 'credit-card':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20"/>
          <path d="M6 15h4"/>
        </svg>
      );
    case 'building-2':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M3 21h18M3 9l9-7 9 7M4 10v11M20 10v11M9 10v4M15 10v4M9 17v4M15 17v4"/>
        </svg>
      );
    case 'smartphone':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <path d="M12 18h.01"/>
          <path d="M9 8l2 2 4-4"/>
        </svg>
      );
    default:
      return null;
  }
}

interface Props {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
}

export default function PaymentMethodCard({ method, selected, onSelect }: Props) {
  const borderStyle = selected
    ? `border-2 shadow-md scale-[1.02]`
    : 'border-2 border-transparent opacity-75';

  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${borderStyle} bg-white`}
      style={selected ? { borderColor: method.color } : {}}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: method.color + '20', color: method.color }}
      >
        <MethodIcon icon={method.icon} />
      </div>
      <span
        className="text-xs font-semibold"
        style={{ color: selected ? method.color : '#6b7280' }}
      >
        {method.name}
      </span>
    </button>
  );
}
