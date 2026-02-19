import { useCartStore } from '../../store/cartStore';

export default function CartSummary() {
  const { items, total } = useCartStore();
  const activeItems = items.filter((i) => i.quantity > 0);

  if (activeItems.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen</h3>
      <div className="space-y-2">
        {activeItems.map((item) => (
          <div key={item.product.id} className="flex justify-between items-center text-sm">
            <span className="text-gray-700">
              {item.product.name}
              <span className="text-gray-400 ml-1">×{item.quantity}</span>
            </span>
            <span className="font-semibold text-gray-900">
              ${(item.unit_price * item.quantity).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
        <span className="font-semibold text-gray-700">Total</span>
        <span className="text-xl font-bold text-water-700">${total().toFixed(0)}</span>
      </div>
    </div>
  );
}
