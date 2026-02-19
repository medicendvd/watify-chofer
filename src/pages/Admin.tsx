import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { DashboardData, ActiveDriverRoute } from '../types';
import SummaryCards from '../components/admin/SummaryCards';
import DriverSummary from '../components/admin/DriverSummary';
import PerformanceCharts from '../components/admin/PerformanceCharts';
import ActiveRoutes from '../components/admin/ActiveRoutes';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

function formatDate(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Admin() {
  const { user, logout } = useAuthContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'resumen' | 'choferes' | 'graficas'>('resumen');

  // Rutas activas + finalizadas hoy (en vivo)
  const [activeRoutes, setActiveRoutes] = useState<ActiveDriverRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesLastUpdated, setRoutesLastUpdated] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL_MS);

  const today = new Date();

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.getDashboard() as DashboardData;
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const routes = await api.getActiveRoutes() as ActiveDriverRoute[];
      setActiveRoutes(routes);
      setRoutesLastUpdated(new Date());
      setNextRefreshIn(REFRESH_INTERVAL_MS);
    } catch {
      // Silencioso
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadActiveRoutes();
  }, [loadActiveRoutes]);

  // Auto-refresh todo cada 10 min
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveRoutes();
      loadDashboard();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadActiveRoutes]);

  // Cuenta regresiva cada minuto
  useEffect(() => {
    const tick = setInterval(() => {
      setNextRefreshIn(prev => Math.max(0, prev - 60_000));
    }, 60_000);
    return () => clearInterval(tick);
  }, [routesLastUpdated]);

  const minutesLeft = Math.ceil(nextRefreshIn / 60_000);
  const activeCount = activeRoutes.filter(r => r.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-water-700 text-white px-4 pt-8 pb-5 shadow-md">
        <div className="flex justify-between items-start max-w-7xl mx-auto">
          <div>
            <p className="capitalize text-sm text-water-200">{formatDate(today)}</p>
            <h1 className="text-xl font-bold mt-0.5">Dashboard Admin</h1>
            <p className="text-water-300 text-xs">Hola, {user?.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { loadDashboard(); loadActiveRoutes(); }}
              className="text-water-200 hover:text-white text-sm py-1.5 px-3 border border-water-500 rounded-lg transition-colors"
            >
              Actualizar
            </button>
            <button
              onClick={logout}
              className="text-water-200 hover:text-white text-sm py-1.5 px-3 border border-water-500 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex max-w-7xl mx-auto">
          {([
            { key: 'resumen',  label: 'Resumen' },
            { key: 'choferes', label: 'Choferes' },
            { key: 'graficas', label: 'Gráficas' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 lg:flex-none lg:px-8 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-water-500 text-water-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.key === 'choferes' && activeCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-emerald-500 text-white rounded-full">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 mt-5 max-w-7xl mx-auto">

        {/* Loading / Error para resumen y gráficas */}
        {loading && tab !== 'choferes' && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-water-400 border-t-transparent" />
          </div>
        )}
        {error && tab !== 'choferes' && (
          <div className="bg-red-50 text-red-500 rounded-xl py-4 px-4 text-sm text-center">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {tab === 'resumen'  && <SummaryCards data={data} />}
            {tab === 'graficas' && <PerformanceCharts data={data} />}
          </>
        )}

        {/* Tab Choferes */}
        {tab === 'choferes' && (
          <div className="space-y-8">

            {/* Rutas en vivo */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  🛣️ Rutas de hoy
                </h2>
                <div className="flex items-center gap-2">
                  {routesLoading && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-water-400 border-t-transparent" />
                  )}
                  <button
                    onClick={loadActiveRoutes}
                    disabled={routesLoading}
                    className="text-xs text-water-600 hover:text-water-800 font-medium disabled:opacity-40"
                  >
                    Refrescar
                  </button>
                  {routesLastUpdated && !routesLoading && (
                    <span className="text-xs text-gray-400">· {minutesLeft} min</span>
                  )}
                </div>
              </div>
              <ActiveRoutes routes={activeRoutes} lastUpdated={routesLastUpdated} />
            </div>

            {/* Ventas del día por chofer */}
            {!loading && data && data.by_driver.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  📊 Ventas del día (por chofer)
                </h2>
                <DriverSummary drivers={data.by_driver} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
