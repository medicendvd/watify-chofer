import { useState } from 'react';
import type { Transaction, Product, PaymentMethod } from '../../types';
import { api } from '../../lib/api';

interface Props {
  transactions: Transaction[];
  onRefresh: () => void;
  products: Product[];
  paymentMethods: PaymentMethod[];
  compact?: boolean; // true = últimas 3, false = resumen del día completo
}

function TransactionRow({
  tx,
  onDelete,
  onEdit,
}: {
  tx: Transaction;
  onDelete: (id: number) => void;
  onEdit: (tx: Transaction) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-sm border-l-4 flex items-start gap-3 relative"
      style={{ borderLeftColor: tx.payment_method_color }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: tx.payment_method_color }}
          >
            {tx.payment_method_name}
          </span>
          {tx.customer_name && (
            <span className="text-xs text-gray-500 truncate">{tx.customer_name}</span>
          )}
          {tx.company_name && (
            <span className="text-xs text-purple-600 font-medium">{tx.company_name}</span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {tx.items.map((i) => `${i.product_name} ×${i.quantity}`).join(' · ')}
        </div>
        {tx.notes && <p className="text-xs text-gray-400 italic mt-0.5">{tx.notes}</p>}
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(tx.transaction_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-900">${Number(tx.total).toFixed(0)}</span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 bg-white shadow-lg rounded-xl z-10 w-36 border border-gray-100 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(tx); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-gray-700"
              >
                Editar
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(tx.id); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-500"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  tx: Transaction;
  products: Product[];
  paymentMethods: PaymentMethod[];
  onSave: () => void;
  onClose: () => void;
}

function EditModal({ tx, products, paymentMethods, onSave, onClose }: EditModalProps) {
  const [customerName, setCustomerName] = useState(tx.customer_name ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(tx.payment_method_id);
  const [notes, setNotes] = useState(tx.notes ?? '');
  const [items, setItems] = useState(
    tx.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
  );
  const [loading, setLoading] = useState(false);

  const setQty = (productId: number, qty: number) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product_id === productId);
      if (!exists && qty > 0) {
        const p = products.find((p) => p.id === productId)!;
        return [...prev, { product_id: productId, quantity: qty, unit_price: p.base_price }];
      }
      if (qty <= 0) return prev.filter((i) => i.product_id !== productId);
      return prev.map((i) => i.product_id === productId ? { ...i, quantity: qty } : i);
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateTransaction(tx.id, {
        customer_name: customerName,
        company_id: tx.company_id,
        payment_method_id: paymentMethodId,
        notes,
        items: items.filter((i) => i.quantity > 0),
      });
      onSave();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Editar venta #{tx.id}</h3>
        </div>
        <div className="p-5 space-y-4">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
          />
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Productos</p>
            {products.map((p) => {
              const item = items.find((i) => i.product_id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(p.id, (item?.quantity ?? 0) - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-600">−</button>
                    <span className="w-5 text-center text-sm font-medium">{item?.quantity ?? 0}</span>
                    <button onClick={() => setQty(p.id, (item?.quantity ?? 0) + 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-600">+</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => (
                <button key={pm.id} onClick={() => setPaymentMethodId(pm.id)}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${paymentMethodId === pm.id ? 'text-white' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={paymentMethodId === pm.id ? { backgroundColor: pm.color, borderColor: pm.color } : {}}>
                  {pm.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comentarios..."
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none"
          />
        </div>
        <div className="p-5 flex gap-3 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 bg-water-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, onRefresh, products, paymentMethods, compact = false }: Props) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayed = compact && !showAll ? transactions.slice(0, 3) : transactions;

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await api.deleteTransaction(id);
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const efectivoTotal = transactions
    .filter((t) => t.payment_method_name === 'Efectivo')
    .reduce((s, t) => s + Number(t.total), 0);

  const dayTotal = transactions.reduce((s, t) => s + Number(t.total), 0);

  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-6 text-sm">
        Sin ventas registradas hoy
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Totales del día */}
      {!compact && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-medium">Efectivo</p>
            <p className="text-lg font-bold text-green-700">${efectivoTotal.toFixed(0)}</p>
          </div>
          <div className="bg-water-50 rounded-xl p-3 text-center">
            <p className="text-xs text-water-600 font-medium">Total día</p>
            <p className="text-lg font-bold text-water-700">${dayTotal.toFixed(0)}</p>
          </div>
        </div>
      )}

      {displayed.map((tx) => (
        <TransactionRow
          key={tx.id}
          tx={tx}
          onDelete={handleDelete}
          onEdit={setEditingTx}
        />
      ))}

      {compact && transactions.length > 3 && !showAll && (
        <button onClick={() => setShowAll(true)} className="w-full text-center text-water-600 text-sm py-1">
          Ver {transactions.length - 3} más...
        </button>
      )}

      {editingTx && (
        <EditModal
          tx={editingTx}
          products={products}
          paymentMethods={paymentMethods}
          onSave={() => { setEditingTx(null); onRefresh(); }}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
