import type { DashboardData } from '../../types';

interface Props {
  data: DashboardData;
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400" aria-label="Sin datos">—</span>;
  const isUp = pct >= 0;
  const label = `${isUp ? 'Aumento' : 'Disminución'} de ${Math.abs(pct)} por ciento`;
  return (
    <span
      aria-label={label}
      className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
    >
      {isUp ? '+' : ''}{pct}%
    </span>
  );
}

export default function SummaryCards({ data }: Props) {
  return (
    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5">

      {/* Columna izquierda */}
      <div className="space-y-4">

        {/* Total del día */}
        <div
          className="rounded-2xl p-5 shadow-sm flex items-end justify-between"
          style={{ background: '#0f1c5e' }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Total del día</p>
            <p className="text-4xl font-bold mt-1 text-white font-display">
              ${Number(data.grand_total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {data.by_method.reduce((s, m) => s + m.count, 0)} ventas registradas
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#10ffe0', boxShadow: '0 0 20px rgba(16,255,224,0.4)' }}
          >
            <svg aria-hidden="true" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#0f1c5e" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z"/>
            </svg>
          </div>
        </div>

        {/* Por método de pago */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Por método de pago</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.by_method.map((m) => (
              <div
                key={m.method}
                role="region"
                aria-label={`${m.method}: ${Number(m.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })} pesos`}
                className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
                style={{ borderLeftWidth: 3, borderLeftColor: m.color }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: m.color }}
                    aria-hidden="true"
                  />
                  <p className="text-xs text-gray-400 font-medium">{m.method}</p>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  ${Number(m.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400">{m.count} venta{m.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparativas */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Comparativas</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1.5">vs ayer</p>
              <GrowthBadge pct={data.dod.pct} />
              <p className="text-xs text-gray-400 mt-1.5">${Number(data.dod.yesterday).toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1.5">vs sem. ant.</p>
              <GrowthBadge pct={data.wow.pct} />
              <p className="text-xs text-gray-400 mt-1.5">${Number(data.wow.last_week_day).toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1.5">MOM</p>
              <GrowthBadge pct={data.mom.pct} />
              <p className="text-xs text-gray-400 mt-1.5">${Number(data.mom.last_month).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Columna derecha */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Por producto</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {data.by_product.map((p) => (
            <div key={p.product} className="flex justify-between items-center px-4 py-3.5">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{p.product}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.units} unidades</p>
              </div>
              <p className="font-bold text-gray-900">
                ${Number(p.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
