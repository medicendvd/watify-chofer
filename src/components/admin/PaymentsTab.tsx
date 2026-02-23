import { useState } from 'react';
import type { LinkPayment, StripeMatch } from '../../types';
import { api } from '../../lib/api';

// ── Modal de sincronización Stripe ──────────────────────────────────────────
function StripeModal({ onClose, onRefresh, pendingPayments }: {
  onClose: () => void;
  onRefresh: () => void;
  pendingPayments: LinkPayment[];
}) {
  const [loading, setLoading]   = useState(true);
  const [matches, setMatches]   = useState<StripeMatch[]>([]);
  const [error, setError]       = useState('');
  const [confirming, setConfirming]   = useState<string | null>(null);
  const [confirmed, setConfirmed]     = useState<Set<string>>(new Set());
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set());

  // Asignación manual: qué sesión está en modo picker
  const [assigning, setAssigning]     = useState<string | null>(null);
  // Selección manual: stripe_session_id → transaction_id elegido
  const [manualSel, setManualSel]     = useState<Record<string, number>>({});

  // Cargar al montar
  useState(() => {
    api.getStripeMatches()
      .then(data => setMatches(data as StripeMatch[]))
      .catch(e => setError(e instanceof Error ? e.message : 'Error al conectar con Stripe'))
      .finally(() => setLoading(false));
  });

  const handleConfirm = async (stripeSessionId: string, transactionId: number) => {
    setConfirming(stripeSessionId);
    try {
      await api.markLinkPaymentPaid(transactionId);
      setConfirmed(prev => new Set(prev).add(stripeSessionId));
      setAssigning(null);
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setConfirming(null);
    }
  };

  const visible = matches.filter(m => !dismissed.has(m.stripe_session_id));

  const scoreColor = (score: number) =>
    score >= 0.85 ? 'text-emerald-600 bg-emerald-50' :
    score >= 0.6  ? 'text-amber-600 bg-amber-50' :
                    'text-gray-400 bg-gray-50';

  const scoreLabel = (score: number) =>
    score >= 0.85 ? 'Coincidencia alta' :
    score >= 0.6  ? 'Coincidencia parcial' : 'Coincidencia baja';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Verificar con Stripe</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pagos completados hoy en Stripe</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2">×</button>
          </div>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-water-400 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-600 text-center">{error}</div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-medium text-gray-500">Sin pagos de Stripe hoy</p>
              <p className="text-xs mt-1">o todos ya fueron confirmados</p>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="space-y-3">
              {visible.map(m => {
                const isConfirmed  = confirmed.has(m.stripe_session_id);
                const isConfirming = confirming === m.stripe_session_id;
                const isAssigning  = assigning === m.stripe_session_id;
                const selTxId      = manualSel[m.stripe_session_id];

                return (
                  <div key={m.stripe_session_id}
                    className={`rounded-2xl border p-4 transition-all ${isConfirmed ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    {/* Pago Stripe */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Stripe</span>
                          <p className="text-sm font-semibold text-gray-800">{m.stripe_name}</p>
                        </div>
                        {m.stripe_email && <p className="text-xs text-gray-400 mt-0.5">{m.stripe_email}</p>}
                        <p className="text-xs text-gray-400">{new Date(m.stripe_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <p className="font-bold text-gray-900 shrink-0">${m.stripe_amount.toFixed(0)}</p>
                    </div>

                    {isConfirmed ? (
                      <div className="bg-emerald-100 rounded-xl px-3 py-2 text-center">
                        <span className="text-xs font-bold text-emerald-700">✓ Pago confirmado</span>
                      </div>
                    ) : isAssigning ? (
                      /* ── Picker de asignación manual ── */
                      <div className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2">
                        <p className="text-xs font-semibold text-indigo-600 mb-1">Asignar a cliente pendiente:</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {pendingPayments.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">Sin pendientes registrados</p>
                          ) : pendingPayments.map(p => (
                            <button
                              key={p.transaction_id}
                              onClick={() => setManualSel(prev => ({ ...prev, [m.stripe_session_id]: p.transaction_id }))}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                selTxId === p.transaction_id
                                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <span className="font-semibold">{p.customer_name}</span>
                              <span className="text-gray-400 ml-2">{p.garrafones} garr · ${p.total.toFixed(0)}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { setAssigning(null); setManualSel(prev => { const n = {...prev}; delete n[m.stripe_session_id]; return n; }); }}
                            className="flex-1 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => selTxId && handleConfirm(m.stripe_session_id, selTxId)}
                            disabled={!selTxId || isConfirming}
                            className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 transition-colors"
                          >
                            {isConfirming ? '...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Coincidencia automática (o sin coincidencia) ── */
                      <>
                        {m.match && (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex-1 h-px bg-gray-200" />
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(m.match.score)}`}>
                                {scoreLabel(m.match.score)} {Math.round(m.match.score * 100)}%
                              </span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100 mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-700">{m.match.customer_name}</p>
                                <p className="text-xs text-gray-400">{m.match.garrafones} garr · ${m.match.total.toFixed(0)} pendiente</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setDismissed(prev => new Set(prev).add(m.stripe_session_id))}
                                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg border border-gray-200 bg-white"
                                >
                                  Ignorar
                                </button>
                                <button
                                  onClick={() => handleConfirm(m.stripe_session_id, m.match!.transaction_id)}
                                  disabled={isConfirming}
                                  className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
                                >
                                  {isConfirming ? '...' : '✓ Confirmar'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Botón asignar manualmente (siempre visible si no confirmado) */}
                        <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${m.match ? 'border-gray-100 bg-white' : 'border-orange-100 bg-orange-50'}`}>
                          <p className="text-xs text-gray-400">
                            {m.match ? 'Asignar a otro cliente' : 'Sin coincidencia automática'}
                          </p>
                          <div className="flex gap-2">
                            {!m.match && (
                              <button
                                onClick={() => setDismissed(prev => new Set(prev).add(m.stripe_session_id))}
                                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                              >
                                Ignorar
                              </button>
                            )}
                            <button
                              onClick={() => setAssigning(m.stripe_session_id)}
                              className="text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Asignar manualmente
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  payments: LinkPayment[];
  onRefresh: () => void;
}

type Filter = 'pendientes' | 'pagados' | 'todos';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function PaymentsTab({ payments, onRefresh }: Props) {
  const [filter, setFilter] = useState<Filter>('pendientes');
  const [marking, setMarking] = useState<number | null>(null);
  const [stripeOpen, setStripeOpen] = useState(false);

  const pending = payments.filter(p => !p.paid_at);
  const paid    = payments.filter(p => !!p.paid_at);

  const displayed = filter === 'pendientes' ? pending
    : filter === 'pagados' ? paid
    : payments;

  const totalPendiente = pending.reduce((s, p) => s + p.total, 0);
  const totalCobrado   = paid.reduce((s, p) => s + p.total, 0);

  const handleMark = async (transaction_id: number) => {
    setMarking(transaction_id);
    try {
      await api.markLinkPaymentPaid(transaction_id);
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al marcar');
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Pendiente de cobro</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">
            ${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-orange-400 mt-0.5">{pending.length} cliente{pending.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Cobrado</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ${totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-emerald-400 mt-0.5">{paid.length} cliente{paid.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Acción Stripe */}
      <div className="flex justify-end">
        <button
          onClick={() => setStripeOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <span>⚡</span> Verificar con Stripe
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {([
          { key: 'pendientes', label: `Pendientes (${pending.length})` },
          { key: 'pagados',    label: `Pagados (${paid.length})` },
          { key: 'todos',      label: 'Todos' },
        ] as { key: Filter; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f.key
                ? 'bg-water-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla / Lista */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl text-gray-400">
          <p className="text-3xl mb-2">{filter === 'pagados' ? '📭' : '✅'}</p>
          <p className="text-sm font-medium text-gray-500">
            {filter === 'pendientes' ? '¡Todo cobrado!' : 'Sin registros'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha entrega</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Garrafones</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha pago</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(p => (
                  <tr key={p.transaction_id} className={p.paid_at ? 'opacity-60' : ''}>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(p.delivery_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                          {(p.customer_name ?? '?')[0]}
                        </div>
                        <span className="font-medium text-gray-800">{p.customer_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                        {p.garrafones}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      ${p.total.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {p.paid_at ? (
                        <span className="text-emerald-600 font-medium">{formatDate(p.paid_at)}</span>
                      ) : (
                        <span className="text-orange-400 font-medium">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.paid_at && (
                        <button
                          onClick={() => handleMark(p.transaction_id)}
                          disabled={marking === p.transaction_id}
                          className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {marking === p.transaction_id ? '...' : '✓ Pagado'}
                        </button>
                      )}
                      {p.paid_at && p.paid_by_name && (
                        <span className="text-xs text-gray-400">por {p.paid_by_name}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {displayed.map(p => (
              <div key={p.transaction_id} className={`bg-white rounded-2xl p-4 border ${p.paid_at ? 'border-gray-100 opacity-70' : 'border-orange-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold uppercase shrink-0">
                      {(p.customer_name ?? '?')[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{p.customer_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{p.garrafones} garr · ${p.total.toFixed(0)}</p>
                    </div>
                  </div>
                  {!p.paid_at && (
                    <button
                      onClick={() => handleMark(p.transaction_id)}
                      disabled={marking === p.transaction_id}
                      className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-lg disabled:opacity-40 shrink-0"
                    >
                      {marking === p.transaction_id ? '...' : '✓ Pagado'}
                    </button>
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-400">
                  <span>Entrega: {formatDateShort(p.delivery_date)}</span>
                  {p.paid_at
                    ? <span className="text-emerald-600 font-medium">Pagado: {formatDateShort(p.paid_at)}</span>
                    : <span className="text-orange-500 font-medium">Pendiente</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {stripeOpen && (
        <StripeModal
          onClose={() => setStripeOpen(false)}
          onRefresh={onRefresh}
          pendingPayments={pending}
        />
      )}
    </div>
  );
}
