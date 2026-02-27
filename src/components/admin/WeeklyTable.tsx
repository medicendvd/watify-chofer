import { useState } from 'react';
import type { WeeklyDayData, WeeklyIncident } from '../../types';

interface Props {
  days: WeeklyDayData[];
  weekStart: string;
  weekEnd: string;
  driverName: string;
  driverId: number;
  canConfirm: boolean;
  onConfirm: (choferId: number, date: string) => Promise<void>;
  onAdjustEfectivo?: (choferId: number, date: string, prevEfectivo: number, newEfectivo: number, description: string) => Promise<void>;
  onWithdrawCash?: (choferId: number, date: string, description: string, amount: number) => Promise<void>;
}

const WITHDRAW_REASONS = ['Compras de limpieza', 'Préstamo a personal', 'Pago a contador', 'Otro'] as const;

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
  { key: 'negocios',      label: 'Empresas',      collapsible: true },
  { key: 'link',          label: 'Link',          collapsible: true },
  { key: 'tarjeta',       label: 'Tarjeta',       collapsible: true },
  { key: 'transferencia', label: 'Transferencia', collapsible: true },
  { key: 'total',     label: 'Total',     highlight: true },
];

// ── Detalle de incidencias en una celda ─────────────────────────────────────
function IncidentsList({ list }: { list: WeeklyIncident[] }) {
  if (!list || list.length === 0) return null;
  return (
    <>
      {list.map(inc =>
        inc.type === 'ajuste' ? (
          <div key={inc.id} className="flex flex-col items-center mt-0.5">
            <span className="text-red-400 text-[10px] font-semibold line-through leading-none">
              {fmt(inc.prev_efectivo ?? 0)}
            </span>
            <span
              className="text-[9px] text-red-300 leading-tight mt-0.5 text-center"
              style={{ maxWidth: 64 }}
              title={inc.description}
            >
              {inc.description}
            </span>
          </div>
        ) : (
          <span key={inc.id} className="text-red-400 text-[10px] font-semibold leading-none">
            -{fmt(inc.amount)}
          </span>
        )
      )}
    </>
  );
}

export default function WeeklyTable({ days, weekStart, weekEnd, driverName, driverId, canConfirm, onConfirm, onAdjustEfectivo, onWithdrawCash }: Props) {
  const [expanded, setExpanded]             = useState(false);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);

  // Estado para el modal de confirmación
  const [confirmDay, setConfirmDay]       = useState<{ date: string; efectivo: number } | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  // Estado para el modal de ajuste
  const [adjustDay, setAdjustDay]         = useState<{ date: string; efectivo: number } | null>(null);
  const [adjustNewTotal, setAdjustNewTotal] = useState('');
  const [adjustReason, setAdjustReason]   = useState('');
  const [adjustSaving, setAdjustSaving]   = useState(false);

  // Estado para el modal de sacar dinero
  const [withdrawDay,    setWithdrawDay]    = useState<{ date: string } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawCustom, setWithdrawCustom] = useState('');
  const [withdrawSaving, setWithdrawSaving] = useState(false);

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

  const handleConfirm = async () => {
    if (!confirmDay) return;
    setConfirmSaving(true);
    setConfirmingDate(confirmDay.date);
    try {
      await onConfirm(driverId, confirmDay.date);
      setConfirmDay(null);
    } finally {
      setConfirmSaving(false);
      setConfirmingDate(null);
    }
  };

  const openAdjust = (date: string, efectivo: number) => {
    setAdjustDay({ date, efectivo });
    setAdjustNewTotal(String(efectivo));
    setAdjustReason('');
  };

  const handleWithdrawSave = async () => {
    if (!withdrawDay) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    const description = withdrawReason === 'Otro' ? withdrawCustom.trim() : withdrawReason;
    if (!description) return;
    setWithdrawSaving(true);
    try {
      await onWithdrawCash?.(driverId, withdrawDay.date, `Sacar Dinero - ${description}`, amount);
      setWithdrawDay(null);
      setWithdrawAmount('');
      setWithdrawReason('');
      setWithdrawCustom('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setWithdrawSaving(false);
    }
  };

  const handleAdjustSave = async () => {
    if (!adjustDay || !adjustReason.trim()) return;
    const newTotal = parseFloat(adjustNewTotal);
    if (isNaN(newTotal) || newTotal < 0) return;
    setAdjustSaving(true);
    try {
      await onAdjustEfectivo?.(driverId, adjustDay.date, adjustDay.efectivo, newTotal, adjustReason.trim());
      setAdjustDay(null);
      setAdjustNewTotal('');
      setAdjustReason('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setAdjustSaving(false);
    }
  };

  return (
    <>
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
                      const incList  = d.incidents_list ?? [];

                      return (
                        <td
                          key={d.date}
                          className={`text-center px-2 py-2 ${isToday ? 'bg-water-400/20' : ''}`}
                        >
                          {sobre ? (
                            <div className="flex flex-col items-center gap-1">
                              {/* Monto neto actual */}
                              <span className={`font-bold ${isEmpty ? 'text-gray-300 text-xs' : 'text-[#1a2fa8] text-sm'}`}>
                                {isEmpty ? '—' : fmt(val)}
                              </span>

                              {/* Historial de incidencias */}
                              <IncidentsList list={incList} />

                              {/* Botón confirmar / check */}
                              {canConfirm && !isFuture && !isEmpty && (
                                d.confirmed ? (
                                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                    {d.confirmed_by_name && (
                                      <span className="text-[9px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-0.5 leading-tight whitespace-nowrap">
                                        {d.confirmed_by_name}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDay({ date: d.date, efectivo: val })}
                                    disabled={confirmingDate === d.date}
                                    className="mt-0.5 text-[10px] font-semibold text-[#1a2fa8] border border-[#1a2fa8]/30 rounded-full px-2 py-0.5 hover:bg-[#1a2fa8] hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap"
                                  >
                                    {confirmingDate === d.date ? '···' : 'Confirmar'}
                                  </button>
                                )
                              )}

                              {/* Botón corregir efectivo */}
                              {canConfirm && !isFuture && !isEmpty && onAdjustEfectivo && (
                                <button
                                  onClick={() => openAdjust(d.date, val)}
                                  className="text-[10px] font-semibold text-orange-500 border border-orange-300 rounded-full px-2 py-0.5 hover:bg-orange-500 hover:text-white transition-colors whitespace-nowrap"
                                >
                                  Corregir
                                </button>
                              )}

                              {/* Botón sacar dinero */}
                              {canConfirm && !isFuture && !isEmpty && onWithdrawCash && (
                                <button
                                  onClick={() => { setWithdrawDay({ date: d.date }); setWithdrawAmount(''); setWithdrawReason(''); setWithdrawCustom(''); }}
                                  className="text-[10px] font-semibold text-purple-600 border border-purple-300 rounded-full px-2 py-0.5 hover:bg-purple-600 hover:text-white transition-colors whitespace-nowrap"
                                >
                                  Sacar Dinero
                                </button>
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

      {/* Modal de confirmación del día */}
      {confirmDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">¿Confirmar total del día?</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {driverName} · {fmtDay(confirmDay.date)} {fmtMonth(confirmDay.date)}
              </p>
            </div>
            <div className="px-5 py-5 text-center">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">Total sobre del día</p>
              <p className="text-4xl font-black text-[#1a2fa8]">{fmt(confirmDay.efectivo)}</p>
              <p className="text-xs text-gray-400 mt-2">Esta acción registrará que el efectivo fue entregado y revisado.</p>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setConfirmDay(null)}
                disabled={confirmSaving}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmSaving}
                className="flex-1 py-3 bg-[#1a2fa8] text-white rounded-2xl text-sm font-semibold disabled:opacity-50 hover:bg-[#152690] transition-colors"
              >
                {confirmSaving ? 'Confirmando...' : 'Sí, confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sacar dinero */}
      {withdrawDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Sacar Dinero</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {driverName} · {fmtDay(withdrawDay.date)} {fmtMonth(withdrawDay.date)}
              </p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Cantidad a sacar</label>
                <input
                  type="number" inputMode="decimal" min={1}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">Motivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {WITHDRAW_REASONS.map(reason => (
                    <button
                      key={reason} type="button"
                      onClick={() => { setWithdrawReason(reason); if (reason !== 'Otro') setWithdrawCustom(''); }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors text-left ${
                        withdrawReason === reason
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                {withdrawReason === 'Otro' && (
                  <textarea
                    value={withdrawCustom}
                    onChange={e => setWithdrawCustom(e.target.value)}
                    placeholder="Describe el motivo..."
                    rows={2}
                    className="mt-2 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  />
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setWithdrawDay(null)}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdrawSave}
                disabled={
                  withdrawSaving || !withdrawAmount ||
                  isNaN(parseFloat(withdrawAmount)) || parseFloat(withdrawAmount) <= 0 ||
                  !withdrawReason || (withdrawReason === 'Otro' && !withdrawCustom.trim())
                }
                className="flex-1 py-3 bg-purple-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 hover:bg-purple-700 transition-colors"
              >
                {withdrawSaving ? 'Guardando...' : 'Registrar salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ajuste de efectivo */}
      {adjustDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Corregir efectivo</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {driverName} · {fmtDay(adjustDay.date)} {fmtMonth(adjustDay.date)}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                Total actual:{' '}
                <span className="font-bold text-[#1a2fa8]">{fmt(adjustDay.efectivo)}</span>
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  Nuevo total en efectivo
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={adjustNewTotal}
                  onChange={e => setAdjustNewTotal(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  ¿Por qué cambia este total?
                </label>
                <textarea
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Motivo del ajuste..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { setAdjustDay(null); setAdjustNewTotal(''); setAdjustReason(''); }}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdjustSave}
                disabled={
                  adjustSaving ||
                  !adjustReason.trim() ||
                  adjustNewTotal === '' ||
                  isNaN(parseFloat(adjustNewTotal)) ||
                  parseFloat(adjustNewTotal) < 0
                }
                className="flex-1 py-3 bg-orange-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
              >
                {adjustSaving ? 'Guardando...' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
