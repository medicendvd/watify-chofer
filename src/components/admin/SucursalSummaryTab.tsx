import type { SucursalSummary } from '../../types';

interface Props {
  summary: SucursalSummary | null;
  loading: boolean;
}

export default function SucursalSummaryTab({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!summary || summary.transaction_count === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-4xl mb-3">🏪</span>
        <p className="text-sm font-medium">Sin ventas en sucursal hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Card principal púrpura */}
      <div className="rounded-2xl px-5 py-5 text-white" style={{ background: '#2543e3' }}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">Total del día · Sucursal</p>
        <p className="text-4xl font-bold">${summary.total.toFixed(2)}</p>
        <p className="text-sm mt-1 opacity-80">{summary.transaction_count} venta{summary.transaction_count !== 1 ? 's' : ''}</p>
      </div>

      {/* Por método de pago */}
      {summary.by_method.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por método de pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {summary.by_method.map(m => (
              <div
                key={m.method}
                className="rounded-xl border-2 px-4 py-3"
                style={{ borderColor: m.color, backgroundColor: `${m.color}15` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{m.icon}</span>
                  <span className="text-xs font-semibold text-gray-700">{m.method}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">${m.total.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{m.count} venta{m.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por producto */}
      {summary.by_product.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por producto</h3>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {summary.by_product.map((p, i) => (
              <div
                key={p.product}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < summary.by_product.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.product}</p>
                  <p className="text-xs text-gray-400">{p.units} unidad{p.units !== 1 ? 'es' : ''}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">${p.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
