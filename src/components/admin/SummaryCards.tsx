import type { DashboardData } from '../../types';

interface Props {
  data: DashboardData;
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>;
  const isUp = pct >= 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
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
        <div className="bg-gradient-to-br from-water-500 to-water-700 rounded-2xl p-5 text-white shadow-md">
          <p className="text-water-100 text-sm font-medium">Total del día</p>
          <p className="text-4xl font-bold mt-1">
            ${Number(data.grand_total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-water-200 text-xs mt-1">
            {data.by_method.reduce((s, m) => s + m.count, 0)} ventas
          </p>
        </div>

        {/* Por método de pago */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por método de pago</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.by_method.map((m) => (
              <div key={m.method} className="bg-white rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: m.color }}>
                <p className="text-xs text-gray-500">{m.method}</p>
                <p className="text-lg font-bold text-gray-900">
                  ${Number(m.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400">{m.count} venta{m.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparativas */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Comparativas</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">vs ayer</p>
              <GrowthBadge pct={data.dod.pct} />
              <p className="text-xs text-gray-500 mt-1">${Number(data.dod.yesterday).toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">vs sem. ant.</p>
              <GrowthBadge pct={data.wow.pct} />
              <p className="text-xs text-gray-500 mt-1">${Number(data.wow.last_week_day).toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">MOM</p>
              <GrowthBadge pct={data.mom.pct} />
              <p className="text-xs text-gray-500 mt-1">${Number(data.mom.last_month).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Columna derecha */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por producto</h3>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50 h-full">
          {data.by_product.map((p) => (
            <div key={p.product} className="flex justify-between items-center px-4 py-4">
              <div>
                <p className="font-medium text-gray-800">{p.product}</p>
                <p className="text-xs text-gray-400">{p.units} unidades</p>
              </div>
              <p className="font-bold text-gray-900 text-lg">
                ${Number(p.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
