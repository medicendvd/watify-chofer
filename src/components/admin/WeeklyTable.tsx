import { useState } from 'react';
import type { WeeklyDayData } from '../../types';

interface Props {
  days: WeeklyDayData[];
  weekStart: string;
  weekEnd: string;
  driverName: string;
  driverId: number;
  canConfirm: boolean;
  onConfirm: (choferId: number, date: string) => Promise<void>;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 });
}

function fmtDay(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').getDate();
}

function fmtMonth(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' });
}

const ROWS: { key: keyof WeeklyDayData; label: string; highlight?: boolean; sobre?: boolean; collapsible?: boolean }[] = [
  { key: 'efectivo',  label: 'Total sobre del día', sobre: true },
  { key: 'facturado', label: 'Efectivo facturado' },
  { key: 'nuevos',    label: 'Gf. Nuevos' },
  { key: 'negocios',  label: 'Empresas',  collapsible: true },
  { key: 'link',      label: 'Link',      collapsible: true },
  { key: 'tarjeta',   label: 'Tarjeta',   collapsible: true },
  { key: 'total',     label: 'Total',     highlight: true },
];

export default function WeeklyTable({ days, weekStart, weekEnd, driverName, driverId, canConfirm, onConfirm }: Props) {
  const [expanded, setExpanded]           = useState(false);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const weekLabel = (() => {
    const s = new Date(weekStart + 'T12:00:00');
    const e = new Date(weekEnd + 'T12:00:00');
    return `${s.getDate()} – ${e.getDate()} de ${e.toLocaleDateString('es-MX', { month: 'long' })}`;
  })();

  const weekTotals = ROWS.reduce((acc, { key }) => {
    acc[key] = days.reduce((sum, d) => sum + ((d[key] as number) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const visibleRows = ROWS.filter(r => !r.collapsible || expanded);

  const handleConfirm = async (date: string) => {
    setConfirmingDate(date);
    try { await onConfirm(driverId, date); }
    finally { setConfirmingDate(null); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a2fa8] px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">{driverName}</h3>
        <span className="text-white/60 text-xs">{weekLabel}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">&nbsp;</th>
              {days.map((d, i) => {
                const isToday = d.date === today;
                return (
                  <th key={d.date} className={`text-center px-2 py-2 ${isToday ? 'bg-water-400/10' : ''}`}>
                    <span className={`block text-xs font-semibold ${isToday ? 'text-[#1a2fa8]' : 'text-gray-400'}`}>
                      {DAY_NAMES[i]}
                    </span>
                    <span className={`block text-base font-bold leading-tight ${isToday ? 'text-[#1a2fa8]' : 'text-gray-700'}`}>
                      {fmtDay(d.date)}
                    </span>
                    <span className={`block text-xs ${isToday ? 'text-[#1a2fa8]/60' : 'text-gray-400'}`}>
                      {fmtMonth(d.date)}
                    </span>
                  </th>
                );
              })}
              <th className="text-center px-3 py-2 border-l border-gray-100">
                <span className="block text-xs font-black text-[#1a2fa8] uppercase">Total</span>
                <span className="block text-xs text-gray-400">semana</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ key, label, highlight, sobre }) => {
              const weekTotal = weekTotals[key];
              const weekEmpty = weekTotal === 0;
              return (
                <tr
                  key={key}
                  className={`border-b ${
                    sobre     ? 'border-water-200 bg-water-400/10' :
                    highlight ? 'border-gray-100 bg-gray-50' :
                                'border-gray-50'
                  }`}
                >
                  <td className={`px-4 whitespace-nowrap ${
                    sobre     ? 'py-2 text-xs font-black uppercase tracking-wide text-[#1a2fa8]' :
                    highlight ? 'py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600' :
                                'py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400'
                  }`}>
                    {label}
                  </td>

                  {days.map((d) => {
                    const val      = (d[key] as number) || 0;
                    const isToday  = d.date === today;
                    const isFuture = d.date > today;
                    const isEmpty  = val === 0;

                    return (
                      <td
                        key={d.date}
                        className={`text-center px-2 py-2 ${isToday ? 'bg-water-400/20' : ''}`}
                      >
                        {sobre ? (
                          <div className="flex flex-col items-center gap-1">
                            {/* Monto */}
                            <span className={`font-bold ${isEmpty ? 'text-gray-300 text-xs' : 'text-[#1a2fa8] text-sm'}`}>
                              {isEmpty ? '—' : fmt(val)}
                            </span>
                            {/* Incidencias deducidas */}
                            {d.incidencias > 0 && (
                              <span className="text-red-400 text-[10px] font-semibold leading-none">
                                -{fmt(d.incidencias)}
                              </span>
                            )}
                            {/* Botón confirmar / check */}
                            {canConfirm && !isFuture && !isEmpty && (
                              d.confirmed ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 rounded-full mt-0.5">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleConfirm(d.date)}
                                  disabled={confirmingDate === d.date}
                                  className="mt-0.5 text-[10px] font-semibold text-[#1a2fa8] border border-[#1a2fa8]/30 rounded-full px-2 py-0.5 hover:bg-[#1a2fa8] hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap"
                                >
                                  {confirmingDate === d.date ? '···' : 'Confirmar'}
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <span className={`font-bold ${
                            isEmpty   ? 'text-gray-300 text-xs' :
                            highlight ? 'text-[#1a2fa8] text-xs' :
                                        'text-gray-700 text-xs'
                          }`}>
                            {isEmpty ? '—' : fmt(val)}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Columna total semana */}
                  <td className="text-center px-3 border-l border-gray-100 py-2">
                    <span className={`font-black ${
                      weekEmpty ? 'text-gray-300 text-xs' :
                      sobre     ? 'text-[#1a2fa8] text-base' :
                      highlight ? 'text-[#1a2fa8] text-sm' :
                                  'text-gray-700 text-xs'
                    }`}>
                      {weekEmpty ? '—' : fmt(weekTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Toggle desglose */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {expanded ? 'Ocultar desglose' : 'Ver desglose (Empresas, Link, Tarjeta)'}
      </button>
    </div>
  );
}
