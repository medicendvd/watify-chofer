import { useState } from 'react';
import type { LinkPayment } from '../../types';
import { api } from '../../lib/api';

interface Props {
  payments: LinkPayment[];
  onRefresh: () => void;
}

const today = new Date().toDateString();

export default function LinkPaymentsPanel({ payments, onRefresh }: Props) {
  const [marking, setMarking] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const pending  = payments.filter(p => !p.paid_at);
  const paidToday = payments.filter(p =>
    p.paid_at && new Date(p.paid_at).toDateString() === today
  );

  const totalPendiente = pending.reduce((s, p) => s + p.total, 0);

  const handleMark = async (transaction_id: number) => {
    setMarking(transaction_id);
    try {
      await api.markLinkPaymentPaid(transaction_id);
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al marcar');
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className={`hidden xl:flex flex-col fixed right-4 top-[104px] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 transition-all duration-300 ${collapsed ? 'w-48' : 'w-64 max-h-[calc(100vh-120px)]'}`}>

      {/* Header */}
      <div
        className="px-4 py-3 border-b border-gray-100 shrink-0 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">📲 Cobros Link</p>
          <div className="flex items-center gap-1.5">
            {pending.length > 0 && (
              <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
            <span className="text-gray-400 text-xs">{collapsed ? '▲' : '▼'}</span>
          </div>
        </div>
        {!collapsed && pending.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            ${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 0 })} por cobrar
          </p>
        )}
      </div>

      <div className={`overflow-y-auto flex-1 ${collapsed ? 'hidden' : ''}`}>

        {/* Pendientes */}
        {pending.length === 0 && paidToday.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-xs font-medium text-gray-500">¡Todo al día!</p>
            <p className="text-xs text-gray-400 mt-0.5">Sin cobros pendientes</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="divide-y divide-gray-50">
            {pending.map(p => (
              <div key={p.transaction_id} className="px-3 py-2.5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                  {(p.customer_name ?? '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {p.customer_name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400">{p.garrafones} garr · ${p.total.toFixed(0)}</p>
                </div>
                <button
                  onClick={() => handleMark(p.transaction_id)}
                  disabled={marking === p.transaction_id}
                  className="shrink-0 text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  {marking === p.transaction_id ? '...' : 'Pagado'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagados hoy */}
        {paidToday.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                ✅ Cobrados hoy
              </p>
            </div>
            <div className="divide-y divide-emerald-50">
              {paidToday.map(p => (
                <div key={p.transaction_id} className="px-3 py-2.5 flex items-center gap-2 bg-emerald-50">
                  <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                    {(p.customer_name ?? '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-800 truncate">
                      {p.customer_name ?? '—'}
                    </p>
                    <p className="text-xs text-emerald-500">{p.garrafones} garr · ${p.total.toFixed(0)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    ✓
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
