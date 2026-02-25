import type { LiveRoute } from '../../types';

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  route: LiveRoute;
  routeNumber: number;
}

export default function LiveDriverCard({ route, routeNumber }: Props) {
  const g = route.garrafones;
  const muted = route.status === 'finished';

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border ${muted ? 'border-gray-600 opacity-80' : 'border-gray-700'} bg-gray-900`}>

      {/* Header chofer */}
      <div className={`px-3 py-2 flex justify-between items-center ${muted ? 'bg-gray-700' : ''}`} style={!muted ? { backgroundColor: '#143dc2' } : {}}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm text-white uppercase shrink-0">
            {route.chofer_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white text-sm leading-tight">{route.chofer_name}</p>
              {routeNumber > 1 && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900">
                  {routeNumber}ª ruta
                </span>
              )}
            </div>
            <p className="text-xs text-white/60">
              {muted
                ? `Finalizada · ${formatHour(route.started_at)} – ${route.finished_at ? formatHour(route.finished_at) : ''}`
                : `En ruta desde ${formatHour(route.started_at)}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white">{route.transaction_count}</p>
          <p className="text-xs text-white/60">venta{route.transaction_count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="p-3 space-y-2">

        {/* Debe regresar — PROTAGONISTA */}
        <div className={`rounded-xl p-3 ${muted ? 'bg-gray-700' : ''}`} style={!muted ? { backgroundColor: '#0f2d9a' } : {}}>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest text-center mb-1.5">
            Debe regresar
          </p>
          <div className="grid grid-cols-3 items-center text-center gap-2">
            <div className={`rounded-xl py-2 ${muted ? 'bg-gray-600' : ''}`} style={!muted ? { backgroundColor: '#143dc2' } : {}}>
              <p className="text-2xl font-black text-white">{g.llenos_a_regresar}</p>
              <p className="text-xs text-white/60 font-medium">llenos</p>
            </div>
            <div>
              <p className="text-5xl font-black text-white leading-none">{g.total_a_regresar}</p>
              <p className="text-xs text-white/40">total</p>
            </div>
            <div className={`rounded-xl py-2 ${muted ? 'bg-gray-600' : ''}`} style={!muted ? { backgroundColor: '#143dc2' } : {}}>
              <p className="text-2xl font-black" style={{ color: '#5fffdb' }}>{g.vacios_a_regresar}</p>
              <p className="text-xs text-white/60 font-medium">vacíos</p>
            </div>
          </div>
        </div>

        {/* Garrafones stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-800 rounded-xl py-1.5 px-2">
            <p className="text-lg font-bold text-gray-300">{g.cargados}</p>
            <p className="text-xs text-gray-500">Cargados</p>
          </div>
          <div className="bg-gray-800 rounded-xl py-1.5 px-2">
            <p className="text-lg font-bold text-emerald-400">{g.recargas_vendidas + g.nuevos_vendidos}</p>
            <p className="text-xs text-gray-500">Vendidos</p>
          </div>
          <div className="bg-gray-800 rounded-xl py-1.5 px-2">
            <p className="text-lg font-bold text-red-400">{g.total_quebrados}</p>
            <p className="text-xs text-gray-500">Quebrados</p>
          </div>
        </div>

        {/* Empresas */}
        {route.companies.length > 0 && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide px-3 pt-2 pb-1">
              🏢 Empresas
            </p>
            <div className="divide-y divide-gray-700">
              {route.companies.map(c => (
                <div key={c.company} className="flex justify-between items-center px-3 py-1">
                  <span className="text-xs text-gray-300">{c.company}</span>
                  <span className="text-xs font-bold text-white">{c.garrafones} garrafón{c.garrafones !== 1 ? 'es' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ventas con Link */}
        {route.link_sales.length > 0 && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide px-3 pt-2 pb-1">
              📲 Link
            </p>
            <div className="divide-y divide-gray-700">
              {route.link_sales.map((s, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-1">
                  <span className="text-xs text-gray-300">{s.customer_name || '—'}</span>
                  <span className="text-xs font-bold text-white">{s.garrafones} garrafón{s.garrafones !== 1 ? 'es' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ventas con Tarjeta */}
        {route.tarjeta_sales.length > 0 && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide px-3 pt-2 pb-1">
              💳 Tarjeta
            </p>
            <div className="divide-y divide-gray-700">
              {route.tarjeta_sales.map((s, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-1">
                  <span className="text-xs text-gray-300">{s.customer_name || '—'}</span>
                  <span className="text-xs font-bold text-white">{s.garrafones} garrafón{s.garrafones !== 1 ? 'es' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
