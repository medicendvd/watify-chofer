import type { Product } from '../../types';
import { useCartStore } from '../../store/cartStore';

interface Props {
  product: Product;
  unitPrice: number; // puede ser precio especial de empresa
}

const PRODUCT_COLORS: Record<string, string> = {
  'Recarga': 'from-blue-400 to-blue-600',
  'Nuevo':   'from-emerald-400 to-emerald-600',
  'Mini':    'from-violet-400 to-violet-600',
  '10Pack':  'from-orange-400 to-orange-600',
};

export default function ProductCard({ product, unitPrice }: Props) {
  const { items, addItem, removeItem } = useCartStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const gradient = PRODUCT_COLORS[product.name] ?? 'from-gray-400 to-gray-600';
  const price = Number(unitPrice);

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-md flex flex-col gap-2 min-h-[110px]`}>
      <div className="flex-1">
        <p className="font-bold text-lg leading-tight">{product.name}</p>
        <p className="text-white/80 text-sm">${price.toFixed(0)}</p>
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => removeItem(product.id)}
          disabled={quantity === 0}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 flex items-center justify-center text-xl font-bold transition-colors"
        >
          −
        </button>
        <span className="text-2xl font-bold w-10 text-center">{quantity}</span>
        <button
          onClick={() => addItem(product, price)}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-bold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
