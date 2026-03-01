import { useState } from 'react';
import type { ActiveDriverRoute, FacturaGarrafon } from '../../types';
import { api } from '../../lib/api';

// ── Tipos internos ──────────────────────────────────────────────────────────
type AdminTx = ActiveDriverRoute['transactions'][number];
type EditItem = { product_id: number; product: string; quantity: number; unit_price: number };

// ── Modal de edición de venta ───────────────────────────────────────────────
function EditTxModal({ tx, onSave, onClose }: {
  tx: AdminTx;
  onSave: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<EditItem[]>(tx.items.map(i => ({ ...i })));
  const [saving, setSaving] = useState(false);

  const adjust = (productId: number, delta: number) =>
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
    ));

  const handleSave = async () => {
    const validItems = items.filter(i => i.quantity > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      await api.updateTransaction(tx.id, {
        customer_name: tx.customer_name,
        company_id: tx.company_id,
        payment_method_id: tx.payment_method_id,
        items: validItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      onSave();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tx.color }}>
              {tx.method}
            </span>
            <p className="font-bold text-gray-900 text-sm truncate">
              {tx.customer_name ?? tx.company_name ?? 'Sin nombre'}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Venta #{tx.id}</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {items.map(i => (
            <div key={i.product_id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{i.product}</p>
                <p className="text-xs text-gray-400">${i.unit_price.toFixed(0)} c/u</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => adjust(i.product_id, -1)} disabled={i.quantity === 0}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg disabled:opacity-30 flex items-center justify-center">
                  −
                </button>
                <span className={`w-6 text-center font-bold text-base ${i.quantity === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                  {i.quantity}
                </span>
                <button onClick={() => adjust(i.product_id, 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">
                  +
                </button>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="text-sm font-semibold text-gray-500">Total</span>
            <span className="text-sm font-bold text-gray-900">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || items.every(i => i.quantity === 0)}
            className="flex-1 py-3 bg-[#1a2fa8] text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  routes: ActiveDriverRoute[];
  lastUpdated: Date | null;
  onRefresh?: () => void;
}

const METHOD_ICONS: Record<string, string> = {
  Efectivo:              '💵',
  Tarjeta:               '💳',
  Negocios:              '🏢',
  Link:                  '📲',
  'Negocios en Efectivo': '🏪',
};

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ── Modal para facturar garrafones ──────────────────────────────────────────
interface FacturarModalProps {
  routeId: number;
  maxGarrafones: number;
  facturas: FacturaGarrafon[];
  onClose: () => void;
  onRefresh: () => void;
}

function FacturarModal({ routeId, maxGarrafones, facturas, onClose, onRefresh }: FacturarModalProps) {
  const [cantidad, setCantidad] = useState('');
  const [cliente, setCliente] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const garrafonesFact = facturas.reduce((s, f) => s + f.cantidad, 0);
  const disponibles = maxGarrafones - garrafonesFact;

  const handleSave = async () => {
    const qty = parseInt(cantidad, 10);
    if (!qty || qty <= 0) return;
    if (!cliente.trim()) return;
    if (qty > disponibles) return;
    setSaving(true);
    try {
      await api.createFactura(routeId, qty, cliente.trim());
      setCantidad('');
      setCliente('');
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.deleteFactura(id);
      onRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">🧾 Facturar Garrafones</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {garrafonesFact} de {maxGarrafones} garrafones de efectivo facturados
          </p>
        </div>

        {/* Facturas existentes */}
        {facturas.length > 0 && (
          <div className="px-5 pt-4 space-y-2">
            {facturas.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.cliente}</p>
                  <p className="text-xs text-amber-700">{f.cantidad} garrafones</p>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={deleting === f.id}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 disabled:opacity-40"
                >
                  {deleting === f.id ? '...' : 'Eliminar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulario nuevo */}
        {disponibles > 0 && (
          <div className="px-5 pt-4 pb-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                ¿Cuántos garrafones vas a facturar?
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={disponibles}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder={`Máx. ${disponibles}`}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                ¿A quién le facturamos estos garrafones?
              </label>
              <input
                type="text"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                placeholder="Nombre o empresa"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !cantidad || !cliente.trim() || parseInt(cantidad) <= 0 || parseInt(cantidad) > disponibles}
              className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors"
            >
              {saving ? 'Guardando...' : 'Registrar factura'}
            </button>
          </div>
        )}

        {disponibles === 0 && (
          <p className="text-center text-xs text-gray-400 px-5 pt-4 pb-4">
            Todos los garrafones de efectivo ya están facturados.
          </p>
        )}

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal envío de carga extra ───────────────────────────────────────────────
interface SendLoadModalProps {
  routeId: number;
  choferName: string;
  onClose: () => void;
  onSent?: () => void;
}

function SendLoadModal({ routeId, choferName, onClose, onSent }: SendLoadModalProps) {
  const [cantidad, setCantidad] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const qty = parseInt(cantidad, 10);

  const handleSend = async () => {
    if (!qty || qty <= 0) return;
    setSending(true);
    try {
      await api.sendExtraLoad(routeId, qty);
      setSent(true);
      onSent?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">🎰 Enviar carga extra</h3>
          <p className="text-xs text-gray-400 mt-0.5">Para {choferName}</p>
        </div>

        {sent ? (
          <div className="px-5 py-8 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-semibold text-gray-700">¡Enviado!</p>
            <p className="text-xs text-gray-400 mt-1">{qty} garrafones en camino al chofer</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">
                ¿Cuántos garrafones?
              </label>
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => setCantidad(String(Math.max(1, (qty || 0) - 1)))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-xl flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="0"
                  className="w-16 text-center text-2xl font-bold border border-gray-200 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  onClick={() => setCantidad(String((qty || 0) + 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-xl flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !qty || qty <= 0}
              className="w-full py-3 bg-amber-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors"
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        )}

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
          >
            {sent ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de ruta ─────────────────────────────────────────────────────────
interface RouteCardProps {
  route: ActiveDriverRoute;
  muted?: boolean;
  routeNumber?: number;
  onRefresh?: () => void;
}

function RouteCard({ route, muted = false, routeNumber = 1, onRefresh }: RouteCardProps) {
  const [facturarOpen, setFacturarOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<AdminTx | null>(null);
  const [editingGarrafones, setEditingGarrafones] = useState(false);
  const [garrafonesInput, setGarrafonesInput] = useState(route.garrafones.cargados);
  const [savingGarrafones, setSavingGarrafones] = useState(false);
  const [sendLoadOpen, setSendLoadOpen] = useState(false);

  const handleSaveGarrafones = async () => {
    if (garrafonesInput <= 0) return;
    setSavingGarrafones(true);
    try {
      await api.updateRouteGarrafones(route.route_id, garrafonesInput);
      setEditingGarrafones(false);
      onRefresh?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingGarrafones(false);
    }
  };

  const efectivoEntries = route.by_method.filter(
    m => m.method === 'Efectivo' || m.method === 'Negocios en Efectivo'
  );
  const efectivo = efectivoEntries.length > 0 ? {
    ...efectivoEntries[0],
    method:     'Efectivo',
    total:      efectivoEntries.reduce((s, m) => s + m.total, 0),
    count:      efectivoEntries.reduce((s, m) => s + m.count, 0),
    garrafones: efectivoEntries.reduce((s, m) => s + m.garrafones, 0),
  } : undefined;
  const otrosMethods = route.by_method.filter(
    m => m.method !== 'Efectivo' &&
         m.method !== 'Negocios' &&
         m.method !== 'Negocios en Efectivo'
  );
  const g = route.garrafones;

  // Calcular split de efectivo si hay facturas (igual que weekly.php: garrafones × precio fijo de Recarga)
  const facturas = route.facturas ?? [];
  const garrafonesFact = facturas.reduce((s, f) => s + f.cantidad, 0);
  const montoFacturado = garrafonesFact * route.precio_recarga;
  const incidencias    = route.incidencias_total ?? 0;
  const efectivoHoy    = route.efectivo_hoy ?? efectivo?.total ?? 0;
  const montoDelDia    = Math.max(0, efectivoHoy - montoFacturado - incidencias);

  const headerBg = muted ? 'bg-gray-400' : 'bg-[#1a2fa8]';

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${muted ? 'border-gray-200 opacity-80' : 'border-gray-100'}`}>

      {/* Header del chofer */}
      <div className={`${headerBg} text-white px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-base uppercase shrink-0">
            {route.chofer_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base leading-tight">{route.chofer_name}</p>
              {routeNumber > 1 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">
                  {routeNumber === 2 ? '2ª ruta' : `${routeNumber}ª ruta`}
                </span>
              )}
            </div>
            <p className="text-xs text-white/60">
              {muted
                ? `Finalizada · ${formatHour(route.started_at)} – ${route.finished_at ? formatHour(route.finished_at) : ''}`
                : 'Ruta en curso'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60">Total ventas</p>
          <p className="font-bold text-lg">
            ${Number(route.total_ventas).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <p className="mt-0.5 font-bold" style={{ fontSize: '18px', color: '#41ffac' }}>
            👤 {route.transaction_count} venta{route.transaction_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Garrafones — sección destacada */}
        <div className={`rounded-2xl p-4 border-2 ${muted ? 'bg-gray-50 border-gray-200' : 'bg-water-50 border-water-300'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${muted ? 'text-gray-500' : 'text-water-700'}`}>
            🫙 Garrafones
          </p>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            {/* Tile Cargados — editable por admin */}
            <div className="bg-white rounded-xl py-2 px-1 shadow-sm relative">
              {editingGarrafones ? (
                <div className="flex flex-col items-center gap-1 px-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={garrafonesInput}
                    onChange={e => setGarrafonesInput(Number(e.target.value))}
                    className="w-full text-center text-base font-bold border border-blue-300 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{ color: muted ? '#9ca3af' : '#002eca' }}
                    autoFocus
                  />
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={handleSaveGarrafones}
                      disabled={savingGarrafones || garrafonesInput <= 0}
                      className="flex-1 text-xs font-semibold bg-blue-600 text-white rounded-md py-0.5 disabled:opacity-40"
                    >
                      {savingGarrafones ? '…' : '✓'}
                    </button>
                    <button
                      onClick={() => { setEditingGarrafones(false); setGarrafonesInput(g.cargados); }}
                      className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-md py-0.5"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xl font-bold" style={{ color: muted ? '#9ca3af' : '#002eca' }}>{g.cargados}</p>
                    {!muted && (
                      <button
                        onClick={() => { setGarrafonesInput(g.cargados); setEditingGarrafones(true); }}
                        className="text-gray-400 hover:text-blue-500 transition-colors leading-none"
                        title="Editar cantidad cargada"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L4.75 8.774a2.75 2.75 0 0 0-.596.892l-.848 2.303a.75.75 0 0 0 .97.97l2.303-.848a2.75 2.75 0 0 0 .892-.596l6.261-6.263a1.75 1.75 0 0 0 0-2.475ZM9.016 5.43 10.57 6.984 5.781 11.77a1.25 1.25 0 0 1-.405.271l-1.173.432.432-1.173a1.25 1.25 0 0 1 .271-.405L9.016 5.43Zm2.02-1.544.974.974a.25.25 0 0 1 0 .354l-.86.86L9.696 4.53l.86-.86a.25.25 0 0 1 .48 0Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Cargados</p>
                </>
              )}
            </div>
            <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
              <p className="text-xl font-bold" style={{ color: muted ? '#9ca3af' : '#002eca' }}>{g.recargas_vendidas + g.nuevos_vendidos}</p>
              <p className="text-xs text-gray-400 mt-0.5">Vendidos</p>
            </div>
            <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
              <p className="text-xl font-bold text-red-500">{g.total_quebrados}</p>
              <p className="text-xs text-gray-400 mt-0.5">Quebrados</p>
            </div>
          </div>

          {/* Debe regresar */}
          <div className={`rounded-xl px-4 pt-3 pb-4 ${muted ? 'bg-gray-500' : 'bg-[#1a2fa8]'}`}>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide text-center mb-2">
              Debe regresar
            </p>
            <div className="grid grid-cols-3 items-center text-center gap-2">
              {/* Llenos */}
              <div className={`rounded-lg py-2.5 ${muted ? 'bg-gray-400' : 'bg-[#1626a0]'}`}>
                <p className="text-2xl font-bold text-white">{g.llenos_a_regresar}</p>
                <p className="text-xs text-white/70 mt-0.5 font-medium">llenos</p>
              </div>
              {/* Total */}
              <div>
                <p className={`text-5xl font-black leading-none ${muted ? 'text-white' : 'text-water-400'}`}>{g.total_a_regresar}</p>
                <p className="text-xs text-white/50 mt-1">total</p>
              </div>
              {/* Vacíos */}
              <div className={`rounded-lg py-2.5 ${muted ? 'bg-gray-400' : 'bg-[#1626a0]'}`}>
                <p className={`text-2xl font-bold ${muted ? 'text-white' : 'text-water-400'}`}>{g.vacios_a_regresar}</p>
                <p className="text-xs text-white/70 mt-0.5 font-medium">vacíos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Productos vendidos */}
        {route.products.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 pt-3 pb-2">
              📦 Productos vendidos
            </p>
            <div className="divide-y divide-gray-100">
              {route.products.map(p => (
                <div key={p.product} className="flex justify-between items-center px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.product}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 font-semibold px-1.5 py-0.5 rounded-full">
                      ×{p.units}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    ${Number(p.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Efectivo a entregar */}
        {efectivo && (
          <div className="space-y-2">
            {/* Bloque principal */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    💵 Efectivo a entregar
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {efectivo.count} venta{efectivo.count !== 1 ? 's' : ''} · {efectivo.garrafones} garr
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  ${efectivoHoy.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
              </div>

              {/* Split si hay facturas */}
              {garrafonesFact > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl px-3 py-2 text-center">
                    <p className="text-xs text-green-600 font-semibold">Sobre del día</p>
                    <p className="text-lg font-bold text-green-700">
                      ${montoDelDia.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-xl px-3 py-2 text-center border border-amber-200">
                    <p className="text-xs text-amber-700 font-semibold">Sobre de facturas</p>
                    <p className="text-lg font-bold text-amber-700">
                      ${montoFacturado.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-amber-500 mt-0.5">{garrafonesFact} garr</p>
                  </div>
                </div>
              )}

              {/* Facturas registradas */}
              {facturas.length > 0 && (
                <div className="mt-2 space-y-1">
                  {facturas.map(f => (
                    <div key={f.id} className="flex justify-between items-center text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                      <span>🧾 {f.cliente}</span>
                      <span className="font-semibold">{f.cantidad} garr</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Transacciones individuales de efectivo */}
              {route.transactions.filter(tx => tx.method === 'Efectivo' || tx.method === 'Negocios en Efectivo').length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
                  {route.transactions.filter(tx => tx.method === 'Efectivo' || tx.method === 'Negocios en Efectivo').map(tx => (
                    <div key={tx.id} className="flex items-center justify-between text-xs">
                      <span className="text-green-700">
                        {tx.items.map(i => `${i.product} ×${i.quantity}`).join(', ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-800">${tx.total.toFixed(0)}</span>
                        <button onClick={() => setEditingTx(tx)}
                          className="text-gray-400 hover:text-gray-600 px-1">
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón Facturar */}
            <button
              onClick={() => setFacturarOpen(true)}
              className="w-full py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              🧾 Facturar garrafones
            </button>
          </div>
        )}

        {/* Modal facturación */}
        {facturarOpen && efectivo && (
          <FacturarModal
            routeId={route.route_id}
            maxGarrafones={efectivo.garrafones}
            facturas={facturas}
            onClose={() => setFacturarOpen(false)}
            onRefresh={() => { onRefresh?.(); }}
          />
        )}

        {/* Modal edición de venta */}
        {editingTx && (
          <EditTxModal
            tx={editingTx}
            onSave={() => { setEditingTx(null); onRefresh?.(); }}
            onClose={() => setEditingTx(null)}
          />
        )}

        {/* Botón enviar carga extra — solo rutas activas */}
        {!muted && (
          <button
            onClick={() => setSendLoadOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-amber-400 text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5"
          >
            🎰 Enviar carga extra
          </button>
        )}

        {/* Modal envío de carga extra */}
        {sendLoadOpen && (
          <SendLoadModal
            routeId={route.route_id}
            choferName={route.chofer_name}
            onClose={() => setSendLoadOpen(false)}
            onSent={onRefresh}
          />
        )}

        {/* Otros métodos (Tarjeta, Link) — desglose por cliente */}
        {otrosMethods.length > 0 && (
          <div className="space-y-2">
            {otrosMethods.map(m => {
              const methodTxs = route.transactions.filter(tx => tx.method === m.method);
              return (
                <div key={m.method} className="bg-gray-50 rounded-xl border-l-4 overflow-hidden" style={{ borderLeftColor: m.color }}>
                  {/* Header del método */}
                  <div className="px-3 py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {METHOD_ICONS[m.method] ?? '💰'} {m.method}
                      </p>
                      <p className="text-xs text-gray-400">
                        {m.count} venta{m.count !== 1 ? 's' : ''} · {m.garrafones} garr
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">
                      ${Number(m.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  {/* Clientes individuales */}
                  {methodTxs.length > 0 && (
                    <div className="border-t border-gray-200 divide-y divide-gray-100">
                      {methodTxs.map(tx => {
                        const garrafones = tx.items.reduce((s, i) => s + i.quantity, 0);
                        return (
                          <div key={tx.id} className="px-3 py-2 flex justify-between items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{tx.customer_name || '—'}</p>
                              <p className="text-xs text-gray-400">{garrafones} garr</p>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 shrink-0">
                              ${Number(tx.total).toFixed(0)}
                            </span>
                            <button onClick={() => setEditingTx(tx)}
                              className="text-gray-400 hover:text-gray-600 shrink-0 px-1">
                              ✏️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empresas a crédito */}
        {route.companies.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
              🏢 Empresas a crédito
            </p>
            <div className="space-y-1.5">
              {route.companies.map(c => {
                const companyTxs = route.transactions.filter(tx => tx.company_name === c.company);
                return (
                  <div key={c.company}>
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-700">{c.company}</span>
                        <span className="text-xs text-gray-400 ml-1.5">· {c.garrafones} garr</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        ${Number(c.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    {companyTxs.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between mt-1 pl-2 text-xs text-gray-500">
                        <span>{tx.items.map(i => `${i.product} ×${i.quantity}`).join(', ')}</span>
                        <button onClick={() => setEditingTx(tx)}
                          className="text-gray-400 hover:text-gray-600 ml-2 px-1">
                          ✏️
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-purple-200 mt-2 pt-2 flex justify-between">
              <span className="text-xs font-semibold text-purple-700">Total crédito</span>
              <span className="font-bold text-purple-800 text-sm">
                ${Number(route.total_negocios).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ActiveRoutes({ routes, lastUpdated, onRefresh }: Props) {
  const active   = routes.filter(r => r.status === 'active');
  const finished = routes.filter(r => r.status === 'finished');

  // Precalcula el número de ruta por route_id (1ª, 2ª, …) ordenado por hora de inicio
  const routeNumById = new Map<number, number>();
  const counterPerChofer = new Map<number, number>();
  [...routes]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .forEach(r => {
      const n = (counterPerChofer.get(r.chofer_id) ?? 0) + 1;
      counterPerChofer.set(r.chofer_id, n);
      routeNumById.set(r.route_id, n);
    });

  if (routes.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10 text-sm bg-white rounded-2xl">
        <div className="text-4xl mb-3">🛣️</div>
        <p className="font-medium text-gray-500">Sin rutas activas en este momento</p>
        <p className="text-xs mt-1">Los choferes aparecerán aquí cuando inicien su ruta</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Rutas activas */}
      {active.length > 0 && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map(route => (
              <RouteCard key={route.route_id} route={route} routeNumber={routeNumById.get(route.route_id) ?? 1} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Rutas finalizadas hoy */}
      {finished.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            ✅ Rutas finalizadas hoy
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {finished.map(route => (
              <RouteCard key={route.route_id} route={route} muted routeNumber={routeNumById.get(route.route_id) ?? 1} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="text-center text-xs text-gray-400 pb-2">
          Actualizado a las {formatTime(lastUpdated)} · se refresca cada 10 min
        </p>
      )}
    </div>
  );
}
