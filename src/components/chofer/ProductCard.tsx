import { useState, useRef, useEffect } from 'react';
import type { Product } from '../../types';
import { useCartStore } from '../../store/cartStore';

interface Props {
  product: Product;
  unitPrice: number;
}

const PRODUCT_COLORS: Record<string, string> = {
  'Recarga': 'from-blue-400 to-blue-600',
  'Nuevo':   'from-emerald-400 to-emerald-600',
  'Mini':    'from-violet-400 to-violet-600',
  '10Pack':  'from-orange-400 to-orange-600',
};

export default function ProductCard({ product, unitPrice }: Props) {
  const { items, addItem, removeItem, setQuantity } = useCartStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const gradient = PRODUCT_COLORS[product.name] ?? 'from-gray-400 to-gray-600';
  const isRecarga = product.name === 'Recarga';
  const price = Number(unitPrice);

  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setInput(quantity > 0 ? String(quantity) : '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [editing]);

  const confirm = () => {
    const val = parseInt(input, 10);
    if (!isNaN(val) && val >= 0) {
      setQuantity(product, price, val);
    }
    setEditing(false);
  };

  return (
    <>
      <div
        className={`${isRecarga ? '' : `bg-gradient-to-br ${gradient}`} rounded-2xl p-3 text-white shadow-md flex flex-col gap-1.5 min-h-[88px]`}
        style={isRecarga ? { background: '#32408e' } : {}}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="font-bold text-xs leading-tight">{product.name}</p>
            <p className="text-xs font-semibold" style={{ color: '#92ffe7' }}>${price.toFixed(0)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => removeItem(product.id)}
            disabled={quantity === 0}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 flex items-center justify-center text-xl font-bold transition-colors"
          >
            −
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-2xl font-bold w-10 text-center active:scale-95 transition-transform"
            style={isRecarga ? { color: '#08ffbe' } : {}}
          >
            {quantity}
          </button>
          <button
            onClick={() => addItem(product, price)}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Modal de cantidad */}
      {editing && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={() => setEditing(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-center font-bold text-gray-800 text-base mb-1">{product.name}</p>
            <p className="text-center text-xs text-gray-400 mb-4">${price.toFixed(0)} c/u</p>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirm()}
              className="w-full text-center text-4xl font-bold text-gray-900 border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-water-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-3 bg-water-600 text-white rounded-2xl text-sm font-semibold"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
