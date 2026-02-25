import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { LiveRoute, SimplirouteMapData } from '../types';
import LiveDriverCard from '../components/live/LiveDriverCard';
import SimplirouteMap from '../components/live/SimplirouteMap';

const REFRESH_MS = 2 * 60 * 1000;  // 2 min datos watify
const MAP_MS     = 30_000;          // 30 s mostrando mapa
const DATA_MS    = 5 * 60 * 1000;  // 5 min mostrando datos

const HEADER_H = 57; // px — altura del header sticky

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Live() {
  const { logout } = useAuthContext();
  const [routes, setRoutes]           = useState<LiveRoute[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]         = useState(true);
  const [now, setNow]                 = useState(new Date());

  // Simpliroute map
  const [mapData, setMapData]         = useState<SimplirouteMapData | null>(null);
  const [mapError, setMapError]       = useState('');
  const [showMap, setShowMap]         = useState(false);
  const [mapProgress, setMapProgress] = useState(0);

  // viewport height para el mapa
  const [vh, setVh] = useState(window.innerHeight);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const mapHeight = vh - HEADER_H - 2;

  // ─── Rutas Watify ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await api.getLiveRoutes() as LiveRoute[];
      setRoutes(data);
      setLastUpdated(new Date());
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // ─── Mapa Simpliroute ──────────────────────────────────────────────────────
  const loadMap = useCallback(async () => {
    try {
      const data = await api.getSimplirouteMap() as SimplirouteMapData;
      setMapData(data);
      setMapError('');
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'Error al cargar mapa');
    }
  }, []);

  useEffect(() => { loadMap(); }, [loadMap]);
  useEffect(() => {
    const id = setInterval(loadMap, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadMap]);

  // ─── Ciclo automático mapa ↔ datos ─────────────────────────────────────────
  const hasRoutes = (mapData?.routes.length ?? 0) > 0;

  // Usamos un ref para los timers para que el cleanup los cancele correctamente
  const timersRef = useRef<{ timeout: ReturnType<typeof setTimeout> | null; bar: ReturnType<typeof setInterval> | null }>({ timeout: null, bar: null });

  useEffect(() => {
    if (!hasRoutes) return;

    function startBar(ms: number) {
      if (timersRef.current.bar) clearInterval(timersRef.current.bar);
      setMapProgress(0);
      const start = Date.now();
      timersRef.current.bar = setInterval(() => {
        setMapProgress(Math.min(100, ((Date.now() - start) / ms) * 100));
      }, 80);
    }

    function showMapPhase() {
      setShowMap(true);
      startBar(MAP_MS);
      timersRef.current.timeout = setTimeout(showDataPhase, MAP_MS);
    }

    function showDataPhase() {
      setShowMap(false);
      startBar(DATA_MS);
      timersRef.current.timeout = setTimeout(showMapPhase, DATA_MS);
    }

    showMapPhase();

    return () => {
      if (timersRef.current.timeout) clearTimeout(timersRef.current.timeout);
      if (timersRef.current.bar)     clearInterval(timersRef.current.bar);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoutes]);

  // ─── Reloj ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Numeración de rutas ───────────────────────────────────────────────────
  const routeNumById = new Map<number, number>();
  const counterPerChofer = new Map<number, number>();
  [...routes]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .forEach(r => {
      const n = (counterPerChofer.get(r.chofer_id) ?? 0) + 1;
      counterPerChofer.set(r.chofer_id, n);
      routeNumById.set(r.route_id, n);
    });

  // ─── Agrupación por chofer ─────────────────────────────────────────────────
  const choferIds = [...new Set(routes.map(r => r.chofer_id))];
  const groups = choferIds.map(chofer_id => {
    const cr = routes.filter(r => r.chofer_id === chofer_id);
    return { chofer_id, active: cr.filter(r => r.status === 'active'), finished: cr.filter(r => r.status === 'finished') };
  }).sort((a, b) => b.active.length - a.active.length);

  const totalActive = routes.filter(r => r.status === 'active').length;

  return (
    <div className="bg-gray-950 text-white" style={{ minHeight: '100vh' }}>

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
            <span className="text-xs text-gray-500">· {formatTime(lastUpdated)}</span>
          )}
          {hasRoutes && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${showMap ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {showMap ? '🗺 Mapa' : '📊 Datos'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-mono font-bold" style={{ color: '#80c0d7' }}>{formatTime(now)}</span>
          {hasRoutes && (
            <button
              onClick={() => setShowMap(v => !v)}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              {showMap ? 'Ver datos' : 'Ver mapa'}
            </button>
          )}
          <button onClick={load} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors">
            Refrescar
          </button>
          <Link to="/admin" className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors">
            Regresar
          </Link>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors">
            Salir
          </button>
        </div>
      </div>

      {/* Barra de progreso del ciclo */}
      <div className="h-0.5 bg-gray-800">
        {hasRoutes && (
          <div
            className={`h-full ${showMap ? 'bg-blue-500' : 'bg-emerald-500'}`}
            style={{ width: `${mapProgress}%`, transition: 'none' }}
          />
        )}
      </div>

      {/* Error de mapa (solo debug, visible brevemente) */}
      {mapError && !hasRoutes && (
        <div className="text-center py-2 text-xs text-red-400 bg-red-900/20">{mapError}</div>
      )}

      {/* ══════════ VISTA MAPA ══════════ */}
      {showMap && hasRoutes && mapData && (
        <div style={{ height: mapHeight }}>
          {/* Leyenda */}
          <div className="absolute top-16 left-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 space-y-1.5 pointer-events-none">
            {mapData.routes.map(r => (
              <div key={r.route_id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-xs font-semibold text-white">{r.driver_name}</span>
                <span className="text-xs text-gray-400">{r.completed}/{r.total_visits} entregas</span>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-1.5 flex gap-3">
              <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Completada</span>
              <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />Pendiente</span>
            </div>
          </div>
          <SimplirouteMap routes={mapData.routes} height={mapHeight} />
        </div>
      )}

      {/* ══════════ VISTA DATOS ══════════ */}
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
            <div className="px-4 py-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map(group => {
                  const allRoutes   = [...group.active, ...group.finished];
                  const choferName  = allRoutes[0]?.chofer_name ?? '';
                  const totalVentas = allRoutes.reduce((sum, r) => sum + r.transaction_count, 0);
                  return (
                    <div key={group.chofer_id} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-gray-300">{choferName}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800" style={{ color: '#01fad5' }}>
                          {totalVentas} venta{totalVentas !== 1 ? 's' : ''} totales
                        </span>
                      </div>
                      {group.active.map(r => (
                        <LiveDriverCard key={r.route_id} route={r} routeNumber={routeNumById.get(r.route_id) ?? 1} />
                      ))}
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
