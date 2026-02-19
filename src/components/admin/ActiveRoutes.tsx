import type { ActiveDriverRoute } from '../../types';

interface Props {
  routes: ActiveDriverRoute[];
  lastUpdated: Date | null;
}

const METHOD_ICONS: Record<string, string> = {
  Efectivo: '💵',
  Tarjeta:  '💳',
  Negocios: '🏢',
  Link:     '📲',
};

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

interface RouteCardProps {
  route: ActiveDriverRoute;
  muted?: boolean;
  routeNumber?: number;
}

function RouteCard({ route, muted = false, routeNumber = 1 }: RouteCardProps) {
  const efectivo = route.by_method.find(m => m.method === 'Efectivo');
  const otrosMethods = route.by_method.filter(m => m.method !== 'Efectivo');
  const g = route.garrafones;

  const headerBg = muted ? 'bg-gray-400' : 'bg-water-600';

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${muted ? 'border-gray-200 opacity-80' : 'border-gray-100'}`}>

      {/* Header del chofer */}
      <div className={`${headerBg} text-white px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-base uppercase shrink-0">
            {route.chofer_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base leading-tight">{route.chofer_name}</p>
              {routeNumber > 1 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">
                  {routeNumber === 2 ? '2ª ruta' : `${routeNumber}ª ruta`}
                </span>
              )}
            </div>
            <p className={`text-xs ${muted ? 'text-gray-200' : 'text-water-200'}`}>
              {muted
                ? `Finalizada · ${formatHour(route.started_at)} – ${route.finished_at ? formatHour(route.finished_at) : ''}`
                : 'Ruta en curso'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xs ${muted ? 'text-gray-200' : 'text-water-200'}`}>Total ventas</p>
          <p className="font-bold text-lg">
            ${Number(route.total_ventas).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <p className="mt-0.5 font-bold" style={{ fontSize: '18px', color: '#41ffac' }}>
            👤 {route.transaction_count} venta{route.transaction_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Garrafones — sección destacada */}
        <div className={`rounded-2xl p-4 border-2 ${muted ? 'bg-gray-50 border-gray-200' : 'bg-water-50 border-water-300'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${muted ? 'text-gray-500' : 'text-water-700'}`}>
            🫙 Garrafones
          </p>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
              <p className={`text-xl font-bold ${muted ? 'text-gray-600' : 'text-water-700'}`}>{g.cargados}</p>
              <p className="text-xs text-gray-400 mt-0.5">Cargados</p>
            </div>
            <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
              <p className="text-xl font-bold text-emerald-600">{g.recargas_vendidas + g.nuevos_vendidos}</p>
              <p className="text-xs text-gray-400 mt-0.5">Vendidos</p>
            </div>
            <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
              <p className="text-xl font-bold text-red-500">{g.total_quebrados}</p>
              <p className="text-xs text-gray-400 mt-0.5">Quebrados</p>
            </div>
          </div>

          {/* Debe regresar */}
          <div className={`rounded-xl px-4 pt-3 pb-4 ${muted ? 'bg-gray-500' : 'bg-water-700'}`}>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide text-center mb-2">
              Debe regresar
            </p>
            <div className="grid grid-cols-3 items-center text-center gap-2">
              {/* Llenos */}
              <div className={`rounded-lg py-2.5 ${muted ? 'bg-gray-400' : 'bg-water-600'}`}>
                <p className="text-2xl font-bold text-white">{g.llenos_a_regresar}</p>
                <p className="text-xs text-white/70 mt-0.5 font-medium">llenos</p>
              </div>
              {/* Total */}
              <div>
                <p className="text-5xl font-black text-white leading-none">{g.total_a_regresar}</p>
                <p className="text-xs text-white/50 mt-1">total</p>
              </div>
              {/* Vacíos */}
              <div className={`rounded-lg py-2.5 ${muted ? 'bg-gray-400' : 'bg-water-600'}`}>
                <p className="text-2xl font-bold text-white">{g.vacios_a_regresar}</p>
                <p className="text-xs text-white/70 mt-0.5 font-medium">vacíos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Productos vendidos */}
        {route.products.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 pt-3 pb-2">
              📦 Productos vendidos
            </p>
            <div className="divide-y divide-gray-100">
              {route.products.map(p => (
                <div key={p.product} className="flex justify-between items-center px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.product}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 font-semibold px-1.5 py-0.5 rounded-full">
                      ×{p.units}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    ${Number(p.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Efectivo a entregar */}
        {efectivo && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                💵 Efectivo a entregar
              </p>
              <p className="text-xs text-green-600 mt-0.5">{efectivo.count} venta{efectivo.count !== 1 ? 's' : ''}</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ${Number(efectivo.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
        )}

        {/* Otros métodos */}
        {otrosMethods.length > 0 && (
          <div className="space-y-2">
            {otrosMethods.map(m => (
              <div key={m.method}
                className="bg-gray-50 rounded-xl p-3 flex justify-between items-center border-l-4"
                style={{ borderLeftColor: m.color }}
              >
                <div>
                  <p className="font-semibold text-sm text-gray-800">
                    {METHOD_ICONS[m.method] ?? '💰'} {m.method}
                  </p>
                  <p className="text-xs text-gray-400">{m.count} venta{m.count !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-bold text-gray-900">
                  ${Number(m.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Empresas a crédito */}
        {route.companies.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
              🏢 Empresas a crédito
            </p>
            <div className="space-y-1.5">
              {route.companies.map(c => (
                <div key={c.company} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{c.company}</span>
                  <span className="font-semibold text-gray-900">
                    ${Number(c.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-purple-200 mt-2 pt-2 flex justify-between">
              <span className="text-xs font-semibold text-purple-700">Total crédito</span>
              <span className="font-bold text-purple-800 text-sm">
                ${Number(route.total_negocios).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ActiveRoutes({ routes, lastUpdated }: Props) {
  const active   = routes.filter(r => r.status === 'active');
  const finished = routes.filter(r => r.status === 'finished');

  // Precalcula el número de ruta por route_id (1ª, 2ª, …) ordenado por hora de inicio
  const routeNumById = new Map<number, number>();
  const counterPerChofer = new Map<number, number>();
  [...routes]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .forEach(r => {
      const n = (counterPerChofer.get(r.chofer_id) ?? 0) + 1;
      counterPerChofer.set(r.chofer_id, n);
      routeNumById.set(r.route_id, n);
    });

  if (routes.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10 text-sm bg-white rounded-2xl">
        <div className="text-4xl mb-3">🛣️</div>
        <p className="font-medium text-gray-500">Sin rutas activas en este momento</p>
        <p className="text-xs mt-1">Los choferes aparecerán aquí cuando inicien su ruta</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Rutas activas */}
      {active.length > 0 && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map(route => (
              <RouteCard key={route.route_id} route={route} routeNumber={routeNumById.get(route.route_id) ?? 1} />
            ))}
          </div>
        </div>
      )}

      {/* Rutas finalizadas hoy */}
      {finished.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            ✅ Rutas finalizadas hoy
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {finished.map(route => (
              <RouteCard key={route.route_id} route={route} muted routeNumber={routeNumById.get(route.route_id) ?? 1} />
            ))}
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="text-center text-xs text-gray-400 pb-2">
          Actualizado a las {formatTime(lastUpdated)} · se refresca cada 10 min
        </p>
      )}
    </div>
  );
}
