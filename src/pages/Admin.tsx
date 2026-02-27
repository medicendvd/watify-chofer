import { useState, useEffect, useCallback } from 'react';
import logo from '../assets/logo.png';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { DashboardData, ActiveDriverRoute, LinkPayment, SucursalSummary } from '../types';
import { Link } from 'react-router-dom';
import SummaryCards from '../components/admin/SummaryCards';
import DriverSummary from '../components/admin/DriverSummary';
import PerformanceCharts from '../components/admin/PerformanceCharts';
import ActiveRoutes from '../components/admin/ActiveRoutes';
import LinkPaymentsPanel from '../components/admin/LinkPaymentsPanel';
import PaymentsTab from '../components/admin/PaymentsTab';
import WeeklyTable from '../components/admin/WeeklyTable';
import IncidentModal from '../components/admin/IncidentModal';
import SucursalPOS from '../components/admin/SucursalPOS';
import SucursalSummaryTab from '../components/admin/SucursalSummaryTab';
import ProfileModal from '../components/shared/ProfileModal';
import type { WeeklySummary } from '../types';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

function formatDate(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Admin() {
  const { user, logout } = useAuthContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'resumen' | 'choferes' | 'graficas' | 'pagos' | 'sucursal'>('choferes');

  // Resumen semanal
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  // Perfil
  const [showProfile, setShowProfile] = useState(false);

  const loadWeekly = useCallback(async () => {
    try {
      const w = await api.getWeeklySummary() as WeeklySummary;
      setWeekly(w);
    } catch { /* silencioso */ }
  }, []);

  const handleConfirmDay = async (choferId: number, date: string) => {
    await api.confirmWeeklyDay(choferId, date);
    await loadWeekly();
  };

  const handleCreateIncident = async (data: { choferId: number; description: string; amount: number }) => {
    await api.createIncident(data.choferId, data.description, data.amount);
    await loadWeekly();
  };

  const handleAdjustEfectivo = async (choferId: number, date: string, prevEfectivo: number, newEfectivo: number, description: string) => {
    await api.adjustEfectivo(choferId, date, prevEfectivo, newEfectivo, description);
    await loadWeekly();
  };

  const handleWithdrawCash = async (choferId: number, date: string, description: string, amount: number) => {
    await api.withdrawCash(choferId, date, description, amount);
    await loadWeekly();
  };

  // Sucursal
  const [sucursalSummary, setSucursalSummary] = useState<SucursalSummary | null>(null);
  const [sucursalLoading, setSucursalLoading] = useState(false);
  const loadSucursalSummary = useCallback(async () => {
    setSucursalLoading(true);
    try {
      setSucursalSummary(await api.getSucursalSummary() as SucursalSummary);
    } catch { /* silencioso */ } finally {
      setSucursalLoading(false);
    }
  }, []);

  // Pagos por Link
  const [linkPayments, setLinkPayments] = useState<LinkPayment[]>([]);

  const loadLinkPayments = useCallback(async () => {
    try {
      const data = await api.getLinkPayments() as LinkPayment[];
      setLinkPayments(data);
    } catch { /* silencioso */ }
  }, []);

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
    loadLinkPayments();
    loadWeekly();
    loadSucursalSummary();
  }, [loadActiveRoutes, loadLinkPayments, loadWeekly, loadSucursalSummary]);

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

  const minutesLeft   = Math.ceil(nextRefreshIn / 60_000);
  const activeCount   = activeRoutes.filter(r => r.status === 'active').length;
  const pendingLinks  = linkPayments.filter(p => !p.paid_at).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-gradient-to-r from-water-400 to-water-500 px-4 pt-5 pb-5 shadow-md">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <p className="capitalize text-xs mb-1" style={{ color: '#002eca' }}>{formatDate(today)}</p>
            <img src={logo} alt="Watify" className="h-8 mix-blend-multiply" />
            <p className="text-xs mt-0.5" style={{ color: '#002eca' }}>Hola, {user?.name}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/live"
              className="bg-[#1a2fa8] hover:bg-[#1626a0] text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm"
            >
              En vivo
            </Link>
            <button
              onClick={() => { loadDashboard(); loadActiveRoutes(); }}
              className="bg-[#1a2fa8] hover:bg-[#1626a0] text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm"
            >
              Actualizar
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="bg-[#1a2fa8] hover:bg-[#1626a0] text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm"
            >
              👤 Perfil
            </button>
            <button
              onClick={logout}
              className="bg-[#1a2fa8] hover:bg-[#1626a0] text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm"
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
            { key: 'choferes', label: 'Choferes' },
            { key: 'sucursal', label: '🏪 Sucursal' },
            { key: 'resumen',  label: 'Resumen' },
            { key: 'graficas', label: 'Gráficas' },
            { key: 'pagos',    label: 'Pagos' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 lg:flex-none lg:px-8 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-water-500 text-water-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.key === 'choferes' && activeCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-emerald-500 text-white rounded-full">
                  {activeCount}
                </span>
              )}
              {t.key === 'pagos' && pendingLinks > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-orange-500 text-white rounded-full">
                  {pendingLinks}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel flotante de cobros Link (solo desktop) */}
      <LinkPaymentsPanel payments={linkPayments} onRefresh={loadLinkPayments} />

      {/* Contenido */}
      <div className="px-4 mt-5 max-w-7xl mx-auto">

        {/* Loading / Error para resumen y gráficas */}
        {loading && tab !== 'choferes' && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-water-500 border-t-transparent" />
          </div>
        )}
        {error && tab !== 'choferes' && (
          <div className="bg-red-50 text-red-500 rounded-xl py-4 px-4 text-sm text-center">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {tab === 'resumen'  && (
              <div className="space-y-6">
                <SummaryCards data={data} />
                {weekly && weekly.drivers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Corte semanal por chofer</h3>
                    {weekly.drivers.map((driver) => (
                      <WeeklyTable
                        key={driver.id}
                        days={driver.days}
                        weekStart={weekly.week_start}
                        weekEnd={weekly.week_end}
                        driverName={driver.name}
                        driverId={driver.id}
                        canConfirm={user?.role === 'Admin'}
                        onConfirm={handleConfirmDay}
                        onAdjustEfectivo={handleAdjustEfectivo}
                        onWithdrawCash={handleWithdrawCash}
                      />
                    ))}
                    {user?.role === 'Admin' && (
                      <button
                        onClick={() => setShowIncidentModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#1a2fa8] hover:text-[#1a2fa8] transition-colors text-sm font-semibold"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva incidencia
                      </button>
                    )}
                  </div>
                )}
                {showIncidentModal && weekly && (
                  <IncidentModal
                    drivers={weekly.drivers.map(d => ({ id: d.id, name: d.name }))}
                    onClose={() => setShowIncidentModal(false)}
                    onSubmit={handleCreateIncident}
                  />
                )}
              </div>
            )}
            {tab === 'graficas' && <PerformanceCharts data={data} />}
          </>
        )}

        {tab === 'pagos' && (
          <PaymentsTab payments={linkPayments} onRefresh={loadLinkPayments} />
        )}

        {tab === 'sucursal' && (
          <SucursalSummaryTab summary={sucursalSummary} loading={sucursalLoading} />
        )}

        {/* Tab Choferes */}
        {tab === 'choferes' && (
          <div className="space-y-8">

            {/* POS Sucursal */}
            <SucursalPOS onSaleComplete={loadSucursalSummary} />

            {/* Rutas en vivo */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  🛣️ Rutas de hoy
                </h2>
                <div className="flex items-center gap-2">
                  {routesLoading && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-water-500 border-t-transparent" />
                  )}
                  <button
                    onClick={loadActiveRoutes}
                    disabled={routesLoading}
                    className="text-xs text-water-600 hover:text-water-700 font-medium disabled:opacity-40"
                  >
                    Refrescar
                  </button>
                  {routesLastUpdated && !routesLoading && (
                    <span className="text-xs text-gray-400">· {minutesLeft} min</span>
                  )}
                </div>
              </div>
              <ActiveRoutes routes={activeRoutes} lastUpdated={routesLastUpdated} onRefresh={loadActiveRoutes} />
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

      {/* Modal perfil */}
      {showProfile && <ProfileModal user={user!} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
