import type { CartItem, PaymentMethod, Company } from '../../types';

interface Props {
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  company: Company | null;
  notes: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function SaleModal({
  items, total, paymentMethod, customerName, company, notes, onConfirm, onCancel, loading,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 text-center">Confirmar venta</h2>
          {customerName && (
            <p className="text-center text-gray-500 text-sm mt-1">Cliente: <strong>{customerName}</strong></p>
          )}
          {company && (
            <p className="text-center text-sm mt-0.5" style={{ color: paymentMethod.color }}>
              {company.name}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="p-6 space-y-2">
          {items.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.product.name} <span className="text-gray-400">×{item.quantity}</span>
              </span>
              <span className="font-medium">${(item.unit_price * item.quantity).toFixed(0)}</span>
            </div>
          ))}

          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-2xl font-bold text-gray-900">${total.toFixed(0)}</span>
          </div>

          {/* Método de pago */}
          <div
            className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ backgroundColor: paymentMethod.color + '15' }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-lg text-white"
              style={{ backgroundColor: paymentMethod.color }}
            >
              {paymentMethod.name}
            </span>
            {notes && <span className="text-xs text-gray-500 italic">{notes}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-colors disabled:opacity-60"
            style={{ backgroundColor: paymentMethod.color }}
          >
            {loading ? 'Registrando...' : 'Confirmar venta'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
