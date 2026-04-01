import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from 'recharts';
import type { CompaniesMonthlyData, CompanyMonthlyRow } from '../../types';
import CompanyDeliveriesModal from './CompanyDeliveriesModal';

interface Props {
  data:          CompaniesMonthlyData;
  month:         string;    // 'YYYY-MM'
  onChangeMonth: (m: string) => void;
}

const NAVY = '#0f1c5e';
const MINT = '#05e4b2';

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 });
}
function fmtK(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2.5 text-xs">
      <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || NAVY }} />
          <span className="font-bold text-gray-900">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CompanyRow({ row, grandTotal, rank, onClickName }: { row: CompanyMonthlyRow; grandTotal: number; rank: number; onClickName: () => void }) {
  const [open, setOpen] = useState(false);
  const pct = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;

  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
              rank === 1 ? 'bg-amber-100 text-amber-700' :
              rank === 2 ? 'bg-gray-100 text-gray-600' :
              rank === 3 ? 'bg-orange-100 text-orange-600' :
                           'bg-gray-50 text-gray-400'
            }`}>
              {rank}
            </span>
            <div>
              <button
                onClick={onClickName}
                className="text-sm font-semibold text-[#0f1c5e] hover:underline text-left leading-tight"
              >
                {row.company}
              </button>
              <div className="mt-0.5 h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${NAVY}, ${MINT})` }} />
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="text-xs font-semibold text-gray-600">{row.visits}</span>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="text-xs font-semibold text-gray-600">{row.units}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-gray-900">{fmt(row.total)}</span>
          <p className="text-[10px] text-gray-400">{pct.toFixed(1)}%</p>
        </td>
        <td className="px-3 py-3 text-center">
          {row.products.length > 0 && (
            <button
              onClick={() => setOpen(v => !v)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Ver productos"
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-blue-50/40 border-b border-blue-100">
          <td colSpan={5} className="px-6 py-3">
            <div className="flex flex-wrap gap-2">
              {row.products.map(p => (
                <div key={p.product} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs shadow-sm">
                  <p className="font-semibold text-gray-700">{p.product}</p>
                  <p className="text-gray-400 mt-0.5">{p.units} uds · <span className="font-bold text-gray-900">{fmt(p.total)}</span></p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Genera lista de últimos N meses en formato YYYY-MM
function getMonthOptions(n = 6) {
  const opts = [];
  const now  = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    opts.push({ value: val, label: `${NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

export default function CompaniesTab({ data, month, onChangeMonth }: Props) {
  const monthOptions = getMonthOptions(6);
  const [modalCompany, setModalCompany] = useState<{ id: number; name: string } | null>(null);

  // Top 8 para la gráfica de barras
  const chartData = data.companies.slice(0, 8).map(c => ({
    name:  c.company.length > 14 ? c.company.slice(0, 14) + '…' : c.company,
    total: c.total,
    units: c.units,
  }));

  return (
    <div className="space-y-6">

      {/* ── Selector de mes ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">
          Consumo de empresas — <span style={{ color: NAVY }}>{data.month_label}</span>
        </h3>
        <select
          value={month}
          onChange={e => onChangeMonth(e.target.value)}
          className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total mes</p>
          <p className="text-xl font-black text-gray-900">{fmt(data.grand_total)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Unidades</p>
          <p className="text-xl font-black text-gray-900">{data.grand_units.toLocaleString('es-MX')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Visitas</p>
          <p className="text-xl font-black text-gray-900">{data.grand_visits}</p>
        </div>
      </div>

      {data.companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-400">Sin consumo de empresas en {data.month_label}</p>
        </div>
      ) : (
        <>
          {/* ── Tendencia diaria del mes ────────────────────────────────── */}
          {data.daily_trend.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Consumo diario del mes</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data.daily_trend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={MINT} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={MINT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area dataKey="total" stroke={NAVY} strokeWidth={2} fill="url(#compGrad)"
                    dot={false} activeDot={{ r: 5, fill: MINT, stroke: NAVY, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Ranking bar chart ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Ranking por monto {data.companies.length > 8 ? `(top 8 de ${data.companies.length})` : ''}
            </p>
            <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 42)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name" type="category"
                  tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                  width={110} axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="total" fill={NAVY} radius={[0, 6, 6, 0]}
                  label={{
                    position: 'right',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter: (v: any) => fmt(v),
                    fontSize: 11, fontWeight: 700, fill: '#374151',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Tabla detallada ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Detalle por empresa · {data.companies.length} empresa{data.companies.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-gray-400 font-semibold uppercase tracking-wide">Empresa</th>
                    <th className="text-center px-3 py-2.5 text-gray-400 font-semibold uppercase tracking-wide">Visitas</th>
                    <th className="text-center px-3 py-2.5 text-gray-400 font-semibold uppercase tracking-wide">Unidades</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-semibold uppercase tracking-wide">Monto</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {data.companies.map((row, i) => (
                    <CompanyRow
                      key={row.company_id}
                      row={row}
                      grandTotal={data.grand_total}
                      rank={i + 1}
                      onClickName={() => setModalCompany({ id: row.company_id, name: row.company })}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 text-xs font-black text-gray-700 uppercase tracking-wide">Total</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-gray-700">{data.grand_visits}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-gray-700">{data.grand_units}</td>
                    <td className="px-4 py-3 text-right text-sm font-black" style={{ color: NAVY }}>{fmt(data.grand_total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {modalCompany && (
        <CompanyDeliveriesModal
          companyId={modalCompany.id}
          companyName={modalCompany.name}
          month={month}
          monthLabel={data.month_label}
          onClose={() => setModalCompany(null)}
        />
      )}
    </div>
  );
}
