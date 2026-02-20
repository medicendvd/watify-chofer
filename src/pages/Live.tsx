import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { LiveRoute } from '../types';
import LiveDriverCard from '../components/live/LiveDriverCard';

const REFRESH_MS = 2 * 60 * 1000; // 2 minutos

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Live() {
  const { logout } = useAuthContext();
  const [routes, setRoutes]           = useState<LiveRoute[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]         = useState(true);
  const [now, setNow]                 = useState(new Date());

  const load = useCallback(async () => {
    try {
      const data = await api.getLiveRoutes() as LiveRoute[];
      setRoutes(data);
      setLastUpdated(new Date());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Reloj en tiempo real
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Numerar rutas por chofer
  const routeNumById = new Map<number, number>();
  const counterPerChofer = new Map<number, number>();
  [...routes]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .forEach(r => {
      const n = (counterPerChofer.get(r.chofer_id) ?? 0) + 1;
      counterPerChofer.set(r.chofer_id, n);
      routeNumById.set(r.route_id, n);
    });

  // Agrupar rutas por chofer: activas primero, finalizadas debajo
  const choferIds = [...new Set(routes.map(r => r.chofer_id))];
  const groups = choferIds.map(chofer_id => {
    const choferRoutes = routes.filter(r => r.chofer_id === chofer_id);
    return {
      chofer_id,
      active:   choferRoutes.filter(r => r.status === 'active'),
      finished: choferRoutes.filter(r => r.status === 'finished'),
    };
  }).sort((a, b) => b.active.length - a.active.length); // grupos con activas primero

  const totalActive = routes.filter(r => r.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-lg tracking-wide">Monitor en vivo</span>
          </div>
          {totalActive > 0 && (
            <span className="text-xs text-emerald-400 font-semibold">
              {totalActive} ruta{totalActive !== 1 ? 's' : ''} activa{totalActive !== 1 ? 's' : ''}
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              · {formatTime(lastUpdated)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xl font-mono font-bold" style={{ color: '#80c0d7' }}>{formatTime(now)}</span>
          <button
            onClick={load}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Refrescar
          </button>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#143dc2', borderTopColor: 'transparent' }} />
        </div>
      )}

      {!loading && routes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-gray-600">
          <div className="text-6xl mb-4">🛣️</div>
          <p className="text-lg font-medium">Sin rutas activas hoy</p>
        </div>
      )}

      {!loading && routes.length > 0 && (
        <div className="px-4 py-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group.chofer_id} className="space-y-3">
                {/* Rutas activas del chofer */}
                {group.active.map(r => (
                  <LiveDriverCard key={r.route_id} route={r} routeNumber={routeNumById.get(r.route_id) ?? 1} />
                ))}
                {/* Rutas finalizadas del mismo chofer */}
                {group.finished.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold pl-1">
                      ✅ Finalizada{group.finished.length !== 1 ? 's' : ''}
                    </p>
                    {group.finished.map(r => (
                      <LiveDriverCard key={r.route_id} route={r} routeNumber={routeNumById.get(r.route_id) ?? 1} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
