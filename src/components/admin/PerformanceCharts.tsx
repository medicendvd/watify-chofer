import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
  ReferenceLine, ComposedChart, Line, Legend,
} from 'recharts';
import type { DashboardData, AnalyticsData } from '../../types';

interface Props {
  data:      DashboardData;
  analytics: AnalyticsData | null;
  analyticsLoading: boolean;
}

const NAVY  = '#0f1c5e';
const MINT  = '#05e4b2';
const DRIVER_COLORS = ['#0f1c5e', '#10ffe0', '#6366f1', '#f97316', '#ec4899', '#14b8a6'];

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 });
}
function fmtK(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-300">—</span>;
  const isUp = pct >= 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs">
      <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || NAVY }} />
          <span className="text-gray-500">{p.name || 'Total'}:</span>
          <span className="font-bold text-gray-900">{(valueFormatter ?? fmt)(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WoWLabel({ x, y, value }: any) {
  if (value === null || value === undefined) return null;
  const isUp = value >= 0;
  return (
    <text x={x} y={y - 6} textAnchor="middle" fontSize={9} fontWeight={700}
      fill={isUp ? '#16a34a' : '#dc2626'}>
      {isUp ? '+' : ''}{value}%
    </text>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
      {children}
    </h3>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-40 mb-4" />
      <div className="h-48 bg-gray-50 rounded-xl" />
    </div>
  );
}

type ChartTab = 'tendencia' | 'choferes' | 'metodos' | 'patrones';

export default function PerformanceCharts({ data, analytics, analyticsLoading }: Props) {
  const [activeTab, setActiveTab] = useState<ChartTab>('tendencia');

  // ── Datos de hoy ────────────────────────────────────────────────────────────
  const totalSales   = data.by_method.reduce((s, m) => s + m.count, 0);
  const methodData   = data.by_method.map(m => ({ ...m, value: Number(m.total) }));
  const totalMethods = methodData.reduce((s, m) => s + m.value, 0);
  const productData  = data.by_product
    .map(p => ({ name: p.product, total: Number(p.total), units: Number(p.units) }))
    .sort((a, b) => b.total - a.total);
  const maxProduct   = Math.max(...productData.map(p => p.total), 1);
  const driverData   = data.by_driver
    .map(d => ({ name: d.name.split(' ')[0], total: Number(d.total) }))
    .sort((a, b) => b.total - a.total);

  // ── Datos históricos ────────────────────────────────────────────────────────
  const weeklyTrend  = analytics?.weekly_trend  ?? [];
  const monthlyTrend = analytics?.monthly_trend ?? [];
  const driversTrend = analytics?.drivers_trend ?? [];
  const methodsTrend = analytics?.methods_trend ?? [];
  const dowAnalysis  = analytics?.dow_analysis  ?? [];

  // Semana actual vs anterior (del analytics)
  const lastTwoWeeks = weeklyTrend.slice(-2);
  const thisWeek     = lastTwoWeeks[1]?.total ?? 0;
  const prevWeek     = lastTwoWeeks[0]?.total ?? 0;
  const wowWeekPct   = prevWeek > 0 ? Math.round((thisWeek - prevWeek) / prevWeek * 100) : null;

  // Mes actual vs anterior
  const lastTwoMonths = monthlyTrend.slice(-2);
  const thisMonth     = lastTwoMonths[1]?.total ?? 0;
  const prevMonth     = lastTwoMonths[0]?.total ?? 0;
  const momPct        = prevMonth > 0 ? Math.round((thisMonth - prevMonth) / prevMonth * 100) : null;

  // Pivot drivers_trend para grouped bar (todas las semanas × choferes)
  const allWeeks = [...new Set(driversTrend.flatMap(d => d.weeks.map(w => w.week_start)))].sort();
  const driverWeeklyPivot = allWeeks.slice(-6).map(ws => {
    const row: Record<string, number | string> = { week: ws };
    driversTrend.forEach(d => {
      const found = d.weeks.find(w => w.week_start === ws);
      row[d.driver_name.split(' ')[0]] = found?.total ?? 0;
    });
    return row;
  });

  // Pivot methods_trend para stacked area (meses × métodos)
  const allMonths = [...new Set(methodsTrend.flatMap(m => m.months.map(mo => mo.month)))].sort();
  const methodAreaPivot = allMonths.map(mo => {
    const row: Record<string, number | string> = {
      month: mo,
      label: monthlyTrend.find(m => m.month === mo)?.month_label ?? mo,
    };
    methodsTrend.forEach(m => {
      const found = m.months.find(x => x.month === mo);
      row[m.method] = found?.total ?? 0;
    });
    return row;
  });

  // Mejores / peores días de semana — solo Lun-Vie (dow 0-4)
  const weekdayDow = dowAnalysis.filter(d => d.dow <= 4);
  const sortedDow  = [...weekdayDow].sort((a, b) => b.avg_total - a.avg_total);
  const bestDay    = sortedDow[0];
  const worstDay   = sortedDow[sortedDow.length - 1];

  const TABS: { key: ChartTab; label: string; icon: string }[] = [
    { key: 'tendencia', label: 'Tendencia',  icon: '📈' },
    { key: 'choferes',  label: 'Choferes',   icon: '🚚' },
    { key: 'metodos',   label: 'Métodos',    icon: '💳' },
    { key: 'patrones',  label: 'Patrones',   icon: '📊' },
  ];

  return (
    <div className="space-y-5 pb-4">

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1" style={{ background: NAVY }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Total hoy
          </p>
          <p className="text-3xl font-black text-white leading-none">{fmt(data.grand_total)}</p>
          <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {totalSales} venta{totalSales !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Esta semana</p>
          <p className="text-xl font-black text-gray-900 leading-none">{fmt(thisWeek)}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <GrowthBadge pct={wowWeekPct} />
            <span className="text-[10px] text-gray-400">vs sem. ant.</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Este mes</p>
          <p className="text-xl font-black text-gray-900 leading-none">{fmt(data.mom.this_month)}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <GrowthBadge pct={data.mom.pct} />
            <span className="text-[10px] text-gray-400">vs mes ant.</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Mes anterior</p>
          <p className="text-xl font-black text-gray-900 leading-none">{fmt(prevMonth)}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <GrowthBadge pct={momPct !== null ? -momPct : null} />
            <span className="text-[10px] text-gray-400">vs actual</span>
          </div>
        </div>
      </div>

      {/* ── Sub-tabs ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                activeTab === t.key
                  ? 'text-[#0f1c5e] border-b-2 border-[#0f1c5e] bg-blue-50/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="hidden sm:inline mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── TENDENCIA ─────────────────────────────────────────────────── */}
          {activeTab === 'tendencia' && (
            <div className="space-y-8">

              {/* Monthly MoM */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: MINT }} />
                  Ingresos mensuales
                  {monthlyTrend.length > 0 && (
                    <span className="ml-auto text-[10px] font-normal text-gray-400">
                      últimos {monthlyTrend.length} meses
                    </span>
                  )}
                </SectionTitle>
                {analyticsLoading ? <LoadingSkeleton /> : monthlyTrend.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={monthlyTrend} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={MINT} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={MINT} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area dataKey="total" name="Total" stroke={NAVY} strokeWidth={2.5} fill="url(#monthGrad)"
                          dot={{ fill: NAVY, r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: MINT, stroke: NAVY, strokeWidth: 2 }} />
                        <Line dataKey="count" name="Ventas" yAxisId="right" hide />
                      </ComposedChart>
                    </ResponsiveContainer>
                    {/* MoM badges */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {monthlyTrend.slice(-4).map((m, i) => (
                        <div key={m.month} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs font-semibold text-gray-600">{m.month_label}</span>
                          <span className="text-xs font-bold text-gray-900">{fmtK(m.total)}</span>
                          {i > 0 && <GrowthBadge pct={m.mom_pct} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Sin datos históricos suficientes</p>
                )}
              </div>

              {/* Weekly WoW */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: NAVY }} />
                  Tendencia semanal (WoW)
                  {weeklyTrend.length > 0 && (
                    <span className="ml-auto text-[10px] font-normal text-gray-400">
                      últimas {weeklyTrend.length} semanas
                    </span>
                  )}
                </SectionTitle>
                {analyticsLoading ? <LoadingSkeleton /> : weeklyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyTrend} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="total" name="Total" fill={NAVY} radius={[4, 4, 0, 0]}
                        label={<WoWLabel />} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
                )}
              </div>
            </div>
          )}

          {/* ── CHOFERES ──────────────────────────────────────────────────── */}
          {activeTab === 'choferes' && (
            <div className="space-y-8">

              {/* Hoy por chofer */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: NAVY }} />
                  Ventas de hoy por chofer
                </SectionTitle>
                {driverData.length > 0 ? (
                  <div className="space-y-3">
                    {driverData.map((d, i) => {
                      const pct = data.grand_total > 0 ? (d.total / data.grand_total) * 100 : 0;
                      return (
                        <div key={d.name}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                                style={{ background: DRIVER_COLORS[i % DRIVER_COLORS.length] }}>
                                {i + 1}
                              </span>
                              <span className="text-sm font-semibold text-gray-700">{d.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400">{pct.toFixed(0)}%</span>
                              <span className="text-sm font-bold text-gray-900">{fmt(d.total)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: DRIVER_COLORS[i % DRIVER_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">Sin ventas hoy</p>
                )}
              </div>

              {/* Histórico semanal por chofer */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: '#6366f1' }} />
                  Comparativa semanal de choferes
                  <span className="ml-auto text-[10px] font-normal text-gray-400">últimas 6 semanas</span>
                </SectionTitle>
                {analyticsLoading ? <LoadingSkeleton /> : driverWeeklyPivot.length > 0 && driversTrend.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={driverWeeklyPivot} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                          tickFormatter={(v: string) => {
                            const d = new Date(v + 'T12:00:00');
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                        {driversTrend.map((d, i) => (
                          <Bar key={d.driver_id}
                            dataKey={d.driver_name.split(' ')[0]}
                            fill={DRIVER_COLORS[i % DRIVER_COLORS.length]}
                            radius={[3, 3, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Tabla resumen por chofer */}
                    <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Chofer</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Mejor sem.</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Promedio</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Total período</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {driversTrend.map((d, i) => {
                            const totals   = d.weeks.map(w => w.total);
                            const best     = Math.max(...totals);
                            const avg      = totals.reduce((s, v) => s + v, 0) / (totals.length || 1);
                            const grandSum = totals.reduce((s, v) => s + v, 0);
                            return (
                              <tr key={d.driver_id} className="hover:bg-gray-50">
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: DRIVER_COLORS[i % DRIVER_COLORS.length] }} />
                                    <span className="font-semibold text-gray-700">{d.driver_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-gray-900">{fmt(best)}</td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{fmt(avg)}</td>
                                <td className="px-3 py-2.5 text-right font-bold" style={{ color: NAVY }}>{fmt(grandSum)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Sin historial suficiente</p>
                )}
              </div>
            </div>
          )}

          {/* ── MÉTODOS ───────────────────────────────────────────────────── */}
          {activeTab === 'metodos' && (
            <div className="space-y-8">

              {/* Hoy — donut + barras */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: MINT }} />
                  Mix de pago hoy
                </SectionTitle>
                <div className="flex items-center gap-5">
                  <div className="shrink-0">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={methodData} cx="50%" cy="50%"
                          innerRadius={46} outerRadius={72}
                          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                          {methodData.map((m, i) => <Cell key={i} fill={m.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [fmt(Number(v))]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {methodData.map(m => {
                      const pct = totalMethods > 0 ? (m.value / totalMethods) * 100 : 0;
                      return (
                        <div key={m.method}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                              <span className="text-xs font-medium text-gray-600">{m.method}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400">{m.count} ventas</span>
                              <span className="text-xs font-bold text-gray-900">{fmt(m.value)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} />
                          </div>
                          <p className="text-[10px] text-gray-400 text-right mt-0.5">{pct.toFixed(0)}% del total</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Evolución de métodos por mes */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: '#6366f1' }} />
                  Evolución de métodos — últimos 6 meses
                </SectionTitle>
                {analyticsLoading ? <LoadingSkeleton /> : methodAreaPivot.length > 0 && methodsTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={methodAreaPivot} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        {methodsTrend.map((m, i) => (
                          <linearGradient key={i} id={`mgrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={m.color} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={m.color} stopOpacity={0.05} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      {methodsTrend.map((m, i) => (
                        <Area key={m.method} dataKey={m.method} stackId="1"
                          stroke={m.color} strokeWidth={1.5}
                          fill={`url(#mgrad${i})`} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Sin historial suficiente</p>
                )}
              </div>
            </div>
          )}

          {/* ── PATRONES ──────────────────────────────────────────────────── */}
          {activeTab === 'patrones' && (
            <div className="space-y-8">

              {/* Day-of-week */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: '#f97316' }} />
                  Promedio por día de la semana
                  <span className="ml-auto text-[10px] font-normal text-gray-400">últimos 90 días</span>
                </SectionTitle>
                {analyticsLoading ? <LoadingSkeleton /> : dowAnalysis.length > 0 ? (
                  <>
                    {/* Insight cards */}
                    {bestDay && worstDay && (
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">Mejor día</p>
                          <p className="text-lg font-black text-green-800">{bestDay.label}</p>
                          <p className="text-xs text-green-600 font-semibold">{fmt(bestDay.avg_total)} promedio</p>
                          <p className="text-[10px] text-green-500 mt-0.5">máx: {fmt(bestDay.max_total)}</p>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-1">Día más bajo</p>
                          <p className="text-lg font-black text-red-700">{worstDay.label}</p>
                          <p className="text-xs text-red-500 font-semibold">{fmt(worstDay.avg_total)} promedio</p>
                          <p className="text-[10px] text-red-400 mt-0.5">máx: {fmt(worstDay.max_total)}</p>
                        </div>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dowAnalysis} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                        <Tooltip content={<ChartTooltip valueFormatter={fmt} />} cursor={{ fill: '#fef9f0' }} />
                        <ReferenceLine
                          y={dowAnalysis.reduce((s, d) => s + d.avg_total, 0) / (dowAnalysis.length || 1)}
                          stroke="#d1d5db" strokeDasharray="4 4" />
                        {dowAnalysis.map((d) => (
                          <Bar key={d.dow} dataKey="avg_total" name="Promedio"
                            fill={d.dow === bestDay?.dow ? '#f97316' : d.dow === worstDay?.dow ? '#fca5a5' : NAVY}
                            radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Tabla DoW */}
                    <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Día</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Promedio</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Máximo</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Mínimo</th>
                            <th className="text-right px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">Días</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dowAnalysis.map(d => (
                            <tr key={d.dow} className={`hover:bg-gray-50 ${d.dow === bestDay?.dow ? 'bg-green-50/50' : ''}`}>
                              <td className="px-3 py-2.5 font-bold text-gray-800">{d.label}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-gray-900">{fmt(d.avg_total)}</td>
                              <td className="px-3 py-2.5 text-right text-green-600 font-semibold">{fmt(d.max_total)}</td>
                              <td className="px-3 py-2.5 text-right text-red-400">{fmt(d.min_total)}</td>
                              <td className="px-3 py-2.5 text-right text-gray-400">{d.day_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Sin suficiente historial (90 días)</p>
                )}
              </div>

              {/* Productos hoy */}
              <div>
                <SectionTitle>
                  <span className="w-2 h-5 rounded-sm inline-block" style={{ background: MINT }} />
                  Desglose de productos hoy
                </SectionTitle>
                {productData.length > 0 ? (
                  <div className="space-y-3.5">
                    {productData.map(p => {
                      const barPct     = (p.total / maxProduct) * 100;
                      const pctOfTotal = data.grand_total > 0 ? (p.total / data.grand_total) * 100 : 0;
                      return (
                        <div key={p.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{p.units} uds</span>
                              <span className="text-sm font-bold text-gray-900">{fmt(p.total)}</span>
                              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md w-9 text-right">
                                {pctOfTotal.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${NAVY} 0%, ${MINT} 100%)` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">Sin ventas hoy</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
