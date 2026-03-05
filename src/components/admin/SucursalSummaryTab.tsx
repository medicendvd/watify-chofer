import type { SucursalSummary } from '../../types';

interface Props {
  summary: SucursalSummary | null;
  loading: boolean;
}

function MethodIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const s = size;
  switch (icon) {
    case 'banknote': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
        <path d="M6 12h.01M18 12h.01"/>
      </svg>
    );
    case 'credit-card': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>
      </svg>
    );
    case 'building-2': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M3 21h18M3 9l9-7 9 7M4 10v11M20 10v11M9 10v4M15 10v4M9 17v4M15 17v4"/>
      </svg>
    );
    case 'smartphone': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01M9 8l2 2 4-4"/>
      </svg>
    );
    case 'store': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    );
    case 'arrow-left-right': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M8 7l-5 5 5 5M3 12h18M16 7l5 5-5 5"/>
      </svg>
    );
    default: return null;
  }
}

const DISPLAY_NAME: Record<string, string> = {
  'Negocios': 'Negocios a crédito',
};

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
      {/* Card principal */}
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
            {summary.by_method.map(m => {
              const displayName = DISPLAY_NAME[m.method] ?? m.method;
              const isNegocios  = m.method === 'Negocios';
              const companies   = isNegocios ? (summary.negocios_companies ?? []) : [];
              return (
                <div
                  key={m.method}
                  className="rounded-xl border-2 px-4 py-3"
                  style={{ borderColor: m.color, backgroundColor: `${m.color}15` }}
                >
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: m.color }}>
                    <MethodIcon icon={m.icon} size={15} />
                    <span className="text-xs font-semibold text-gray-700">{displayName}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">${m.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{m.count} venta{m.count !== 1 ? 's' : ''}</p>
                  {companies.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                      {companies.map(c => (
                        <div key={c.company} className="flex justify-between text-xs">
                          <span className="text-gray-600 truncate">{c.company}</span>
                          <span className="font-semibold text-gray-800 ml-1">${c.total.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
