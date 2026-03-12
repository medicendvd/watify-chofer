import { useState, useEffect, useCallback } from 'react';
import logo from '../assets/logo-watify.svg';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { DashboardData, ActiveDriverRoute, LinkPayment, SucursalSummary, AnalyticsData, CompaniesMonthlyData } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
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
import DatePickerButton from '../components/admin/DatePickerButton';
import type { WeeklySummary } from '../types';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

function formatDate(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

type Tab = 'resumen' | 'choferes' | 'graficas' | 'pagos' | 'sucursal';
const VALID_TABS: Tab[] = ['choferes', 'sucursal', 'resumen', 'graficas', 'pagos'];

export default function Admin() {
  const { user, logout } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const rawTab = searchParams.get('tab') as Tab | null;
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'choferes';

  const setTab = (t: Tab) => setSearchParams({ tab: t }, { replace: true });

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

  // Analytics (histórico para gráficas)
  const [analytics, setAnalytics]               = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      setAnalytics(await api.getAnalytics() as AnalyticsData);
    } catch { /* silencioso */ } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Empresas — consumo mensual
  const [companiesData,    setCompaniesData]    = useState<CompaniesMonthlyData | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesMonth,   setCompaniesMonth]   = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadCompanies = useCallback(async (month?: string) => {
    setCompaniesLoading(true);
    try {
      setCompaniesData(await api.getCompaniesMonthly(month) as CompaniesMonthlyData);
    } catch { /* silencioso */ } finally {
      setCompaniesLoading(false);
    }
  }, []);

  const handleChangeCompaniesMonth = (m: string) => {
    setCompaniesMonth(m);
    loadCompanies(m);
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
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(todayYMD);

  const loadDashboard = async (date?: string) => {
    setLoading(true);
    setError('');
    try {
      const d = await api.getDashboard(date) as DashboardData;
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    loadDashboard(date);
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

  // Cargar analytics y empresas solo cuando el usuario abre el tab de gráficas
  useEffect(() => {
    if (tab === 'graficas') {
      if (!analytics && !analyticsLoading) loadAnalytics();
      if (!companiesData && !companiesLoading) loadCompanies(companiesMonth);
    }
  }, [tab, analytics, analyticsLoading, loadAnalytics, companiesData, companiesLoading, loadCompanies, companiesMonth]);

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
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          {/* Logo + fecha */}
          <div className="flex items-center gap-4">
            <img src={logo} alt="Watify" className="h-7" />
            <div>
              <p className="text-xs font-semibold text-gray-800 capitalize leading-tight">{formatDate(today)}</p>
              <p className="text-xs text-gray-400">Hola, {user?.name}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Link
              to="/live"
              className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-lg transition-colors"
              style={{ background: '#1a2fa8' }}
            >
              <svg aria-hidden="true" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              En vivo
            </Link>
            <button
              onClick={() => { loadDashboard(); loadActiveRoutes(); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              <svg aria-hidden="true" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4.5 15A8 8 0 0 0 19.5 9M19.5 9A8 8 0 0 0 4.5 15"/>
              </svg>
              Actualizar
            </button>
            <button
              onClick={() => setShowProfile(true)}
              aria-label="Ver perfil"
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white uppercase transition-colors"
              style={{ background: '#1a2fa8' }}
            >
              {user?.name[0]}
            </button>
            <button
              onClick={logout}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-150 sticky top-0 z-10 shadow-sm">
        <div role="tablist" aria-label="Secciones del dashboard" className="flex max-w-7xl mx-auto px-1">
          {([
            { key: 'choferes', label: 'Choferes' },
            { key: 'sucursal', label: 'Sucursal' },
            { key: 'resumen',  label: 'Resumen' },
            { key: 'graficas', label: 'Gráficas' },
            { key: 'pagos',    label: 'Pagos' },
          ] as const).map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 lg:flex-none lg:px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors transition-border ${
                tab === t.key
                  ? 'border-[#1a2fa8] text-[#1a2fa8]'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {t.label}
                {t.key === 'choferes' && activeCount > 0 && (
                  <span aria-label={`${activeCount} rutas activas`} className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                    {activeCount}
                    <span className="sr-only"> rutas activas</span>
                  </span>
                )}
                {t.key === 'pagos' && pendingLinks > 0 && (
                  <span aria-label={`${pendingLinks} pagos pendientes`} className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                    {pendingLinks}
                    <span className="sr-only"> pagos pendientes</span>
                  </span>
                )}
              </span>
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
          <div role="status" aria-label="Cargando datos…" className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-water-500 border-t-transparent" />
            <span className="sr-only">Cargando…</span>
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
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Corte semanal por chofer</h3>
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
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-[#1a2fa8] hover:text-[#1a2fa8] hover:bg-blue-50 transition-all text-sm font-semibold"
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
            {tab === 'graficas' && (
              <PerformanceCharts
                data={data}
                analytics={analytics}
                analyticsLoading={analyticsLoading}
                companiesData={companiesData}
                companiesLoading={companiesLoading}
                companiesMonth={companiesMonth}
                onChangeCompaniesMonth={handleChangeCompaniesMonth}
              />
            )}
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
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Rutas de hoy
                </h2>
                <div className="flex items-center gap-2">
                  {routesLoading && (
                    <div role="status" aria-label="Actualizando rutas…" className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#1a2fa8] border-t-transparent">
                      <span className="sr-only">Actualizando…</span>
                    </div>
                  )}
                  <button
                    onClick={loadActiveRoutes}
                    disabled={routesLoading}
                    className="text-xs font-semibold text-[#1a2fa8] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                  >
                    Refrescar
                  </button>
                  {routesLastUpdated && !routesLoading && (
                    <span className="text-xs text-gray-400">· Próxima actualización en {minutesLeft} min</span>
                  )}
                </div>
              </div>
              <ActiveRoutes routes={activeRoutes} lastUpdated={routesLastUpdated} onRefresh={loadActiveRoutes} />
            </div>

            {/* Ventas por chofer con filtro de fecha */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Ventas por chofer
                </h2>
                <DatePickerButton value={selectedDate} onChange={handleDateChange} />
              </div>
              {loading
                ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-4 border-[#1a2fa8] border-t-transparent" /></div>
                : data && data.by_driver.length > 0
                  ? <DriverSummary drivers={data.by_driver} />
                  : <div className="text-center text-gray-400 py-6 text-sm bg-white rounded-2xl">Sin actividad de choferes este día</div>
              }
            </div>
          </div>
        )}
      </div>

      {/* Modal perfil */}
      {showProfile && <ProfileModal user={user!} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
