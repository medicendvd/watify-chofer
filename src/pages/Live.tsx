import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { LiveRoute, SimplirouteMapData } from '../types';
import LiveDriverCard from '../components/live/LiveDriverCard';
import SimplirouteMap from '../components/live/SimplirouteMap';

const REFRESH_MS  = 2 * 60 * 1000; // 2 min
const MAP_MS      = 10_000;         // 10 s en mapa
const DATA_MS     = 15_000;         // 15 s en datos

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Live() {
  const { logout } = useAuthContext();
  const [routes, setRoutes]           = useState<LiveRoute[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]         = useState(true);
  const [now, setNow]                 = useState(new Date());

  // Map state
  const [mapData, setMapData]   = useState<SimplirouteMapData | null>(null);
  const [showMap, setShowMap]   = useState(false);
  const [mapProgress, setMapProgress] = useState(0); // 0–100 for the progress bar
  const cycleTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load watify routes ───────────────────────────────────────────────────
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

  useEffect(() => {
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // ─── Load Simpliroute map data ────────────────────────────────────────────
  const loadMap = useCallback(async () => {
    try {
      const data = await api.getSimplirouteMap() as SimplirouteMapData;
      setMapData(data);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => { loadMap(); }, [loadMap]);

  useEffect(() => {
    const interval = setInterval(loadMap, REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadMap]);

  // ─── Alternating cycle: 10s map → 15s data ───────────────────────────────
  const startProgress = useCallback((duration: number) => {
    setMapProgress(0);
    const start = Date.now();
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setMapProgress(Math.min(100, (elapsed / duration) * 100));
    }, 80);
  }, []);

  useEffect(() => {
    // Only run cycle if we have map data with routes
    if (!mapData || mapData.routes.length === 0) return;

    const runCycle = () => {
      setShowMap(true);
      startProgress(MAP_MS);
      cycleTimerRef.current = setTimeout(() => {
        setShowMap(false);
        startProgress(DATA_MS);
        cycleTimerRef.current = setTimeout(runCycle, DATA_MS);
      }, MAP_MS);
    };

    runCycle();

    return () => {
      if (cycleTimerRef.current)  clearTimeout(cycleTimerRef.current);
      if (progressRef.current)    clearInterval(progressRef.current);
    };
  }, [mapData, startProgress]);

  // ─── Real-time clock ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ─── Route numbering ──────────────────────────────────────────────────────
  const routeNumById = new Map<number, number>();
  const counterPerChofer = new Map<number, number>();
  [...routes]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .forEach(r => {
      const n = (counterPerChofer.get(r.chofer_id) ?? 0) + 1;
      counterPerChofer.set(r.chofer_id, n);
      routeNumById.set(r.route_id, n);
    });

  // ─── Group by driver ──────────────────────────────────────────────────────
  const choferIds = [...new Set(routes.map(r => r.chofer_id))];
  const groups = choferIds.map(chofer_id => {
    const choferRoutes = routes.filter(r => r.chofer_id === chofer_id);
    return {
      chofer_id,
      active:   choferRoutes.filter(r => r.status === 'active'),
      finished: choferRoutes.filter(r => r.status === 'finished'),
    };
  }).sort((a, b) => b.active.length - a.active.length);

  const totalActive = routes.filter(r => r.status === 'active').length;
  const hasMapRoutes = (mapData?.routes.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

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
          {/* Map / Data badge */}
          {hasMapRoutes && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${showMap ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {showMap ? '🗺 Mapa' : '📊 Datos'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xl font-mono font-bold" style={{ color: '#80c0d7' }}>{formatTime(now)}</span>
          {hasMapRoutes && (
            <button
              onClick={() => setShowMap(v => !v)}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              {showMap ? 'Ver datos' : 'Ver mapa'}
            </button>
          )}
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

      {/* Progress bar: ciclo mapa ↔ datos */}
      {hasMapRoutes && (
        <div className="h-0.5 bg-gray-800">
          <div
            className={`h-full transition-none ${showMap ? 'bg-blue-500' : 'bg-emerald-500'}`}
            style={{ width: `${mapProgress}%` }}
          />
        </div>
      )}

      {/* ═══ MAP VIEW ═══ */}
      {showMap && mapData && mapData.routes.length > 0 && (
        <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 72px)' }}>
          {/* Route legend */}
          <div className="absolute top-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 space-y-1.5">
            {mapData.routes.map(r => (
              <div key={r.route_id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-xs font-semibold text-white">{r.driver_name}</span>
                <span className="text-xs text-gray-400">{r.completed}/{r.total_visits}</span>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-1.5 flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-gray-400">Completada</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-[10px] text-gray-400">Pendiente</span>
              </div>
            </div>
          </div>
          <SimplirouteMap routes={mapData.routes} />
        </div>
      )}

      {/* ═══ DATA VIEW ═══ */}
      {!showMap && (
        <>
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
            <div className="px-4 py-6 max-w-7xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map(group => {
                  const allRoutes = [...group.active, ...group.finished];
                  const choferName  = allRoutes[0]?.chofer_name ?? '';
                  const totalVentas = allRoutes.reduce((sum, r) => sum + r.transaction_count, 0);
                  return (
                    <div key={group.chofer_id} className="space-y-3">
                      {/* Totales por chofer */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-gray-300">{choferName}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800" style={{ color: '#01fad5' }}>
                          {totalVentas} venta{totalVentas !== 1 ? 's' : ''} totales
                        </span>
                      </div>
                      {/* Rutas activas */}
                      {group.active.map(r => (
                        <LiveDriverCard key={r.route_id} route={r} routeNumber={routeNumById.get(r.route_id) ?? 1} />
                      ))}
                      {/* Rutas finalizadas */}
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
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
