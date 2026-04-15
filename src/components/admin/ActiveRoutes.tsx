import React, { useState, useEffect } from 'react';
import type { ActiveDriverRoute, FacturaGarrafon } from '../../types';
import { api } from '../../lib/api';

// ── Tipos internos ──────────────────────────────────────────────────────────
type AdminTx = ActiveDriverRoute['transactions'][number];
type EditItem = { product_id: number; product: string; quantity: number; unit_price: number };
type PMethod = { id: number; name: string; color: string; icon: string; is_active: boolean };
type Product = { id: number; name: string; base_price: number };
type Company = { id: number; name: string; special_prices: Record<number, number>; payment_method_id: number | null };

// Métodos que requieren seleccionar empresa
const NEEDS_COMPANY = ['Negocios', 'Distribuidores', 'Transferencia'];

// Empresas con sucursales: requieren preguntar cuál antes de registrar
const BRANCH_QUESTIONS: Record<string, string> = {
  'Región Sanitaria': '¿A cuál centro de salud se le entregó?',
  'Creparis':         '¿Cuál sucursal es?',
};
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const getBranchQuestion = (name: string) =>
  Object.entries(BRANCH_QUESTIONS).find(([k]) => normalize(k) === normalize(name))?.[1] ?? null;

// ── Ícono SVG de método de pago (replicado de PaymentMethodCard) ─────────────
function MethodIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const s = size;
  switch (icon) {
    case 'banknote': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
        <path d="M6 12h.01M18 12h.01"/>
      </svg>
    );
    case 'credit-card': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>
      </svg>
    );
    case 'building-2': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M3 21h18M3 9l9-7 9 7M4 10v11M20 10v11M9 10v4M15 10v4M9 17v4M15 17v4"/>
      </svg>
    );
    case 'smartphone': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01M9 8l2 2 4-4"/>
      </svg>
    );
    case 'store': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    );
    case 'arrow-left-right': return (
      <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M8 7l-5 5 5 5M3 12h18M16 7l5 5-5 5"/>
      </svg>
    );
    default: return null;
  }
}

// ── Modal para crear venta desde el admin ───────────────────────────────────
interface CreateSaleModalProps {
  route: ActiveDriverRoute;
  onClose: () => void;
  onSaved: () => void;
}

function CreateSaleModal({ route, onClose, onSaved }: CreateSaleModalProps) {
  const [products, setProducts]       = useState<Product[]>([]);
  const [methods, setMethods]         = useState<PMethod[]>([]);
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [loading, setLoading]         = useState(true);

  const [quantities, setQuantities]   = useState<Record<number, number>>({});
  const [methodId, setMethodId]       = useState<number | null>(null);
  const [companyId, setCompanyId]     = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([
      api.getProducts() as Promise<Product[]>,
      api.getPaymentMethods() as Promise<PMethod[]>,
      api.getCompanies() as Promise<Company[]>,
    ]).then(([prods, meths, comps]) => {
      setProducts(prods.map(p => ({ ...p, base_price: Number(p.base_price) })));
      setMethods(meths.filter(m => Number(m.is_active) === 1));
      setCompanies(comps);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const adjust = (productId: number, delta: number) =>
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] ?? 0) + delta) }));

  const selectedMethod  = methods.find(m => m.id === methodId);
  const needsCompany    = NEEDS_COMPANY.includes(selectedMethod?.name ?? '');
  const isDistribuidores = selectedMethod?.name === 'Distribuidores';

  // Empresas filtradas según el método seleccionado (igual que Chofer.tsx)
  const companiesForMethod = companies.filter(c => {
    if (!selectedMethod) return false;
    if (selectedMethod.name === 'Distribuidores') return Number(c.payment_method_id) === selectedMethod.id;
    if (selectedMethod.name === 'Transferencia')  return Number(c.payment_method_id) === selectedMethod.id;
    return c.payment_method_id === null;
  });

  const selectedCompany = companies.find(c => c.id === companyId);
  const branchQuestion  = selectedCompany ? getBranchQuestion(selectedCompany.name) : null;
  const getPrice = (p: Product) => {
    if (selectedCompany) {
      const special = selectedCompany.special_prices[p.id];
      if (special !== undefined) return Number(special);
    }
    return p.base_price;
  };

  const items = products
    .filter(p => (quantities[p.id] ?? 0) > 0)
    .map(p => ({ product_id: p.id, quantity: quantities[p.id], unit_price: getPrice(p) }));

  const total    = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const canSave  = items.length > 0 && methodId !== null && (!needsCompany || companyId !== null) && (!branchQuestion || customerName.trim() !== '');

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.createTransaction({
        route_id: route.route_id,
        user_id: route.chofer_id,
        payment_method_id: methodId,
        company_id: needsCompany ? companyId : null,
        customer_name: customerName.trim() || null,
        items,
      });
      onSaved();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm sm:max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-base">Crear venta</h3>
          <p className="text-xs text-gray-400 mt-0.5">Para {route.chofer_name}</p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <p className="text-sm text-gray-400">Cargando...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Productos */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {products.map(p => {
                  const qty = quantities[p.id] ?? 0;
                  return (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1 truncate">{p.name}</p>
                      <p className="text-sm text-gray-400 mb-2">${getPrice(p).toFixed(0)} c/u</p>
                      <div className="flex items-center justify-between gap-2">
                        <button onClick={() => adjust(p.id, -1)} disabled={qty === 0}
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold disabled:opacity-30 flex items-center justify-center text-base">−</button>
                        <span className={`font-bold text-sm w-5 text-center ${qty === 0 ? 'text-gray-300' : 'text-gray-900'}`}>{qty}</span>
                        <button onClick={() => adjust(p.id, 1)}
                          className="w-7 h-7 rounded-full bg-[#1a2fa8] text-white font-bold flex items-center justify-center text-base">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Método de pago — grid 3+3 igual que app chofer */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Método de pago</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {methods.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMethodId(m.id); setCompanyId(null); }}
                    className={`flex flex-col sm:flex-col items-center gap-1.5 p-2 rounded-xl transition-colors w-full border-2 bg-white ${methodId === m.id ? 'shadow-md' : 'border-transparent opacity-75'}`}
                    style={methodId === m.id ? { borderColor: m.color } : {}}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: m.color + '20', color: m.color }}>
                      <MethodIcon icon={m.icon} size={16} />
                    </div>
                    <span className="text-xs font-semibold leading-tight text-center"
                      style={{ color: methodId === m.id ? m.color : '#000000' }}>
                      {m.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Empresa para Distribuidores — cards clicables */}
            {needsCompany && isDistribuidores && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distribuidor</p>
                {companiesForMethod.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">Sin distribuidores registrados</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {companiesForMethod.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCompanyId(c.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${companyId === c.id ? 'shadow-sm' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        style={companyId === c.id ? { borderColor: selectedMethod!.color, color: selectedMethod!.color, backgroundColor: selectedMethod!.color + '10' } : {}}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empresa para Negocios — dropdown */}
            {needsCompany && !isDistribuidores && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Empresa</p>
                <select
                  value={companyId ?? ''}
                  onChange={e => setCompanyId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="">Seleccionar empresa…</option>
                  {companiesForMethod.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Pregunta de sucursal — solo cuando aplica */}
            {branchQuestion && (
              <div>
                <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">
                  {branchQuestion} <span className="text-red-400">*</span>
                </p>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Requerido"
                  className="w-full px-3 py-2.5 border border-[#1a2fa8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {!customerName.trim() && (
                  <p className="text-xs text-red-400 mt-1">Este campo es obligatorio para continuar</p>
                )}
              </div>
            )}

            {/* Nombre cliente (opcional) */}
            {!branchQuestion && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nombre cliente (opcional)</p>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-500">Total</span>
            <span className="text-lg font-bold text-gray-900">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !canSave}
              className="flex-1 py-3 bg-[#1a2fa8] text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const allZero = items.every(i => i.quantity === 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const validItems = items.filter(i => i.quantity > 0);
      if (validItems.length === 0) {
        await api.deleteTransaction(tx.id);
      } else {
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
      }
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
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50 text-white transition-colors ${allZero ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1a2fa8]'}`}>
            {saving ? (allZero ? 'Eliminando...' : 'Guardando...') : allZero ? 'Eliminar venta' : 'Guardar'}
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
  'Distribuidores': '🏪',
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
  const [draggingTxId, setDraggingTxId] = useState<number | null>(null);
  const [dropTarget,   setDropTarget]   = useState<number | null>(null);
  const [moveModalTx,  setMoveModalTx]  = useState<AdminTx | null>(null);
  const [moveSaving,   setMoveSaving]   = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [finishing,     setFinishing]     = useState(false);
  const [createSaleOpen, setCreateSaleOpen] = useState(false);
  const [allMethods,     setAllMethods]     = useState<PMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [deletingTxId,   setDeletingTxId]   = useState<number | null>(null);
  const [txToDelete,     setTxToDelete]     = useState<number | null>(null);
  const [reactivateConfirm, setReactivateConfirm] = useState(false);
  const [reactivating,      setReactivating]      = useState(false);

  const handleDeleteTx = async (txId: number) => {
    setDeletingTxId(txId);
    setTxToDelete(null);
    try {
      await api.deleteTransaction(txId);
      onRefresh?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeletingTxId(null);
    }
  };

  const ensureMethods = async () => {
    if (allMethods.length || loadingMethods) return;
    setLoadingMethods(true);
    try {
      const data = await api.getPaymentMethods() as PMethod[];
      setAllMethods(data.filter(m => Number(m.is_active) === 1));
    } catch { /* ignore */ }
    finally { setLoadingMethods(false); }
  };

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

  const handleMoveMethod = async (tx: AdminTx, newMethodId: number) => {
    if (tx.payment_method_id === newMethodId) return;
    setMoveSaving(true);
    try {
      await api.updateTransaction(tx.id, {
        customer_name: tx.customer_name,
        company_id: tx.company_id,
        payment_method_id: newMethodId,
        items: tx.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      setMoveModalTx(null);
      onRefresh?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al mover');
    } finally {
      setMoveSaving(false);
    }
  };

  const handleFinishRoute = async () => {
    setFinishing(true);
    try {
      await api.finishRoute(route.route_id);
      setFinishConfirm(false);
      onRefresh?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al finalizar');
    } finally {
      setFinishing(false);
    }
  };

  const handleReactivateRoute = async () => {
    setReactivating(true);
    try {
      await api.reactivateRoute(route.route_id);
      setReactivateConfirm(false);
      onRefresh?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al reactivar');
    } finally {
      setReactivating(false);
    }
  };

  const dropZone = (targetMethodId: number): React.HTMLAttributes<HTMLDivElement> => ({
    onDragOver(e: React.DragEvent<HTMLDivElement>) {
      if (draggingTxId === null) return;
      const tx = route.transactions.find(t => t.id === draggingTxId);
      if (tx?.payment_method_id === targetMethodId) return;
      e.preventDefault();
      setDropTarget(targetMethodId);
    },
    onDragLeave(e: React.DragEvent<HTMLDivElement>) {
      if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) {
        setDropTarget(null);
      }
    },
    onDrop(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault();
      if (draggingTxId !== null) {
        const tx = route.transactions.find(t => t.id === draggingTxId);
        if (tx) handleMoveMethod(tx, targetMethodId);
      }
      setDraggingTxId(null);
      setDropTarget(null);
    },
  });

  const efectivoEntries = route.by_method.filter(
    m => m.method === 'Efectivo' || m.method === 'Distribuidores' || m.method === 'Distribuidores'
  );
  const efectivoMethodId = efectivoEntries.find(m => m.method === 'Efectivo')?.id
    ?? efectivoEntries[0]?.id
    ?? 0;
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
         m.method !== 'Distribuidores' &&
         m.method !== 'Distribuidores' &&
         m.method !== 'Transferencia'
  );
  const g = route.garrafones;

  // Calcular split de efectivo si hay facturas (igual que weekly.php: garrafones × precio fijo de Recarga)
  const facturas = route.facturas ?? [];
  const garrafonesFact = facturas.reduce((s, f) => s + f.cantidad, 0);
  const montoFacturado = garrafonesFact * route.precio_recarga;
  const incidencias    = route.incidencias_total ?? 0;
  const efectivoHoy    = route.efectivo_hoy ?? efectivo?.total ?? 0;
  const montoDelDia    = Math.max(0, efectivoHoy - montoFacturado - Math.max(0, incidencias));

  const headerBg = muted ? '#6b7280' : '#0f1c5e';

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${muted ? 'border-gray-200 opacity-80' : 'border-gray-100'}`}>

      {/* Header del chofer */}
      <div className="text-white px-4 py-3 flex justify-between items-center" style={{ background: headerBg }}>
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
            <div className="flex items-center gap-1.5 mt-0.5">
              {!muted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />}
              <p className="text-xs text-white/60">
                {muted
                  ? `Finalizada · ${formatHour(route.started_at)} – ${route.finished_at ? formatHour(route.finished_at) : ''}`
                  : 'Ruta en curso'}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Total</p>
          <p className="font-bold text-xl leading-tight">
            ${Number(route.total_ventas).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs mt-0.5 font-semibold" style={{ color: '#10ffe0' }}>
            {route.transaction_count} venta{route.transaction_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Botón reactivar ruta — solo rutas finalizadas, encima de garrafones */}
        {muted && (
          <div className="flex justify-center">
            <button
              onClick={() => setReactivateConfirm(true)}
              className="flex items-center gap-1.5 font-bold text-sm rounded-xl"
              style={{ background: '#42ffff', color: '#000000', padding: '8px 20px' }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Reactivar ruta
            </button>
          </div>
        )}

        {/* Garrafones — sección destacada */}
        <div className={`rounded-2xl p-4 border ${muted ? 'bg-gray-50 border-gray-200' : 'border-gray-100'}`} style={!muted ? { background: '#f0fdf9' } : {}}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted ? 'text-gray-500' : 'text-emerald-700'}`}>
            Garrafones
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
          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 pt-3 pb-2">
              Productos vendidos
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
            <div
              className={`border-2 rounded-xl p-3 transition-colors ${dropTarget === efectivoMethodId && draggingTxId !== null ? 'bg-green-100 border-green-400 ring-2 ring-green-300' : 'bg-green-50 border-green-200'}`}
              {...dropZone(efectivoMethodId)}
            >
              {(() => {
                const distribEntry = route.by_method.find(m => m.method === 'Distribuidores');
                return (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                        💵 Efectivo a entregar
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {efectivo.count} venta{efectivo.count !== 1 ? 's' : ''} · {efectivo.garrafones} garr
                      </p>
                      {distribEntry && (
                        <span className="inline-block mt-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          incl. ${Number(distribEntry.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })} distribuidores
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      ${efectivoHoy.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                );
              })()}

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
              {route.transactions.filter(tx => tx.method === 'Efectivo' || tx.method === 'Distribuidores').length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
                  {route.transactions.filter(tx => tx.method === 'Efectivo' || tx.method === 'Distribuidores').map(tx => (
                    <div
                      key={tx.id}
                      draggable
                      onDragStart={(e) => { setDraggingTxId(tx.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setDraggingTxId(null); setDropTarget(null); }}
                      className={`flex items-center justify-between text-xs cursor-grab active:cursor-grabbing transition-opacity ${draggingTxId === tx.id ? 'opacity-40' : ''}`}
                    >
                      <span className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-green-700">
                          {tx.items.map(i => `${i.product} ×${i.quantity}`).join(', ')}
                        </span>
                        {(tx.customer_name || tx.company_name) && (
                          <span className="text-[10px] font-semibold text-teal-600 truncate max-w-[120px]">
                            {tx.customer_name ?? tx.company_name}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-green-800">${tx.total.toFixed(0)}</span>
                        <button
                          onClick={() => { setMoveModalTx(tx); ensureMethods(); }}
                          className="text-gray-300 hover:text-blue-400 transition-colors px-0.5 text-base leading-none"
                          title="Cambiar método de pago"
                        >
                          ⇄
                        </button>
                        <button onClick={() => setEditingTx(tx)}
                          className="text-gray-400 hover:text-gray-600 px-0.5">
                          ✏️
                        </button>
                        <button
                          onClick={() => setTxToDelete(tx.id)}
                          disabled={deletingTxId === tx.id}
                          className="text-gray-300 hover:text-red-400 transition-colors px-0.5 disabled:opacity-40"
                          title="Eliminar venta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                          </svg>
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
              className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Facturar garrafones
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

        {/* Botones de acción — solo rutas activas */}
        {!muted && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSendLoadOpen(true)}
              className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border border-amber-200 hover:border-amber-400"
              style={{ background: '#fffbeb', color: '#b45309' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Carga extra
            </button>
            <button
              onClick={() => setCreateSaleOpen(true)}
              className="py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors hover:opacity-90"
              style={{ background: '#1a2fa8' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Crear venta
            </button>
          </div>
        )}

        {/* Modal crear venta */}
        {createSaleOpen && (
          <CreateSaleModal
            route={route}
            onClose={() => setCreateSaleOpen(false)}
            onSaved={() => { setCreateSaleOpen(false); onRefresh?.(); }}
          />
        )}

        {/* Modal confirmar eliminación de venta */}
        {txToDelete !== null && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl p-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500">
                    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base">¿Eliminar venta?</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setTxToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTx(txToDelete)}
                  disabled={deletingTxId === txToDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {deletingTxId === txToDelete ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón finalizar ruta — solo rutas activas, para admin */}
        {!muted && (
          <button
            onClick={() => setFinishConfirm(true)}
            className="w-full py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            Finalizar ruta del chofer
          </button>
        )}

        {/* Modal confirmación finalizar ruta */}
        {finishConfirm && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">🏁 Finalizar ruta</h3>
                <p className="text-xs text-gray-400 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-sm text-gray-700 text-center">
                  ¿Finalizar la ruta de{' '}
                  <span className="font-bold text-gray-900">{route.chofer_name}</span>?
                </p>
                <p className="text-xs text-gray-400 text-center mt-1">
                  {route.transaction_count} venta{route.transaction_count !== 1 ? 's' : ''} ·{' '}
                  ${(efectivoHoy + otrosMethods.reduce((s, m) => s + m.total, 0)).toLocaleString('es-MX', { minimumFractionDigits: 0 })} total
                </p>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setFinishConfirm(false)}
                  disabled={finishing}
                  className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinishRoute}
                  disabled={finishing}
                  className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors"
                >
                  {finishing ? 'Finalizando...' : 'Finalizar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmación reactivar ruta */}
        {reactivateConfirm && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Reactivar ruta</h3>
                <p className="text-xs text-gray-400 mt-0.5">La ruta volverá a estar activa para edición</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-sm text-gray-700 text-center">
                  ¿Reactivar la ruta de{' '}
                  <span className="font-bold text-gray-900">{route.chofer_name}</span>?
                </p>
                <p className="text-xs text-amber-600 text-center mt-2 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  El chofer podrá ver y registrar ventas nuevamente hasta que se finalice de nuevo.
                </p>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setReactivateConfirm(false)}
                  disabled={reactivating}
                  className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReactivateRoute}
                  disabled={reactivating}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors"
                >
                  {reactivating ? 'Reactivando...' : 'Reactivar'}
                </button>
              </div>
            </div>
          </div>
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
                <div
                  key={m.method}
                  className={`bg-gray-50 rounded-xl border-l-4 overflow-hidden transition-all ${dropTarget === m.id && draggingTxId !== null ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''}`}
                  style={{ borderLeftColor: m.color }}
                  {...dropZone(m.id)}
                >
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
                          <div
                            key={tx.id}
                            draggable
                            onDragStart={(e) => { setDraggingTxId(tx.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => { setDraggingTxId(null); setDropTarget(null); }}
                            className={`px-3 py-2 flex justify-between items-center gap-2 cursor-grab active:cursor-grabbing transition-opacity ${draggingTxId === tx.id ? 'opacity-40' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{tx.customer_name || '—'}</p>
                              <p className="text-xs text-gray-400">{garrafones} garr</p>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 shrink-0">
                              ${Number(tx.total).toFixed(0)}
                            </span>
                            <button
                              onClick={() => { setMoveModalTx(tx); ensureMethods(); }}
                              className="text-gray-300 hover:text-blue-400 shrink-0 transition-colors px-0.5 text-base leading-none"
                              title="Cambiar método de pago"
                            >
                              ⇄
                            </button>
                            <button onClick={() => setEditingTx(tx)}
                              className="text-gray-400 hover:text-gray-600 shrink-0 px-1">
                              ✏️
                            </button>
                            <button
                              onClick={() => setTxToDelete(tx.id)}
                              disabled={deletingTxId === tx.id}
                              className="text-gray-300 hover:text-red-400 shrink-0 transition-colors px-0.5 disabled:opacity-40"
                              title="Eliminar venta"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                              </svg>
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

        {/* Modal cambiar método de pago */}
        {moveModalTx && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Cambiar método de pago</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  #{moveModalTx.id} · {moveModalTx.customer_name ?? moveModalTx.company_name ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: moveModalTx.color }}>
                    {moveModalTx.method}
                  </span>
                  <span className="text-gray-400 text-xs">→ ?</span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2">
                {(allMethods.length > 0 ? allMethods : route.by_method)
                  .filter(m => m.id !== moveModalTx.payment_method_id && ('method' in m ? m.method : m.name) !== 'Negocios')
                  .map(m => {
                    const existing = route.by_method.find(bm => bm.id === m.id);
                    const label = 'method' in m ? m.method : m.name;
                    return (
                      <button
                        key={m.id}
                        disabled={moveSaving}
                        onClick={() => handleMoveMethod(moveModalTx, m.id)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
                      >
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: m.color }}>
                          {label}
                        </span>
                        {existing && (
                          <span className="text-xs text-gray-400">
                            {existing.count} venta{existing.count !== 1 ? 's' : ''} · ${existing.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setMoveModalTx(null)}
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Helper: renderizar sección de empresas agrupadas por método */}
        {(['Distribuidores', 'Transferencia', 'Negocios'] as const).map(metodoClave => {
          const cfg = {
            Distribuidores: { label: '🚛 Distribuidores',    bg: 'bg-amber-50',  border: 'border-amber-100',  divider: 'border-amber-200',  text: 'text-amber-700',  total: 'text-amber-800' },
            Transferencia:  { label: '🔄 Transferencias',    bg: 'bg-blue-50',   border: 'border-blue-100',   divider: 'border-blue-200',   text: 'text-blue-700',   total: 'text-blue-800'  },
            Negocios:       { label: '🏢 Empresas a crédito', bg: 'bg-purple-50', border: 'border-purple-100', divider: 'border-purple-200', text: 'text-purple-700', total: 'text-purple-800' },
          }[metodoClave];

          const txs = route.transactions.filter(tx => tx.method === metodoClave);
          if (txs.length === 0) return null;

          const grouped = new Map<string, typeof txs>();
          for (const tx of txs) {
            const key = tx.company_name ?? '—';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(tx);
          }
          const groups = Array.from(grouped.entries()).map(([company, txList]) => ({
            company,
            txs: txList,
            total: txList.reduce((s, tx) => s + tx.total, 0),
            garrafones: txList.reduce((s, tx) => s + tx.items.reduce((si, i) => si + i.quantity, 0), 0),
          }));
          const sectionTotal = groups.reduce((s, g) => s + g.total, 0);

          return (
            <div key={metodoClave} className={`${cfg.bg} rounded-xl p-3 border ${cfg.border}`}>
              <p className={`text-xs font-semibold ${cfg.text} uppercase tracking-wide mb-2`}>
                {cfg.label}
              </p>
              <div className="space-y-1.5">
                {groups.map(g => (
                  <div key={g.company}>
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-700">{g.company}</span>
                        <span className="text-xs text-gray-400 ml-1.5">· {g.garrafones} garr</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        ${g.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    {g.txs.map(tx => {
                      const txGarr = tx.items.reduce((s, i) => s + i.quantity, 0);
                      return (
                        <div key={tx.id} className="mt-1.5 pl-2 border-l-2 border-gray-200">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              {tx.customer_name && (
                                <p className="text-xs font-semibold text-gray-700 truncate">{tx.customer_name}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {txGarr} garr · {tx.items.map(i => `${i.product} ×${i.quantity}`).join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-semibold text-gray-700">${tx.total.toFixed(0)}</span>
                              <button onClick={() => setEditingTx(tx)}
                                className="text-gray-400 hover:text-gray-600 px-0.5">
                                ✏️
                              </button>
                              <button
                                onClick={() => setTxToDelete(tx.id)}
                                disabled={deletingTxId === tx.id}
                                className="text-gray-300 hover:text-red-400 transition-colors px-0.5 disabled:opacity-40"
                                title="Eliminar venta"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className={`border-t ${cfg.divider} mt-2 pt-2 flex justify-between`}>
                <span className={`text-xs font-semibold ${cfg.text}`}>Total</span>
                <span className={`font-bold ${cfg.total} text-sm`}>
                  ${sectionTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          );
        })}

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
      <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <p className="font-semibold text-gray-500 text-sm">Sin rutas activas</p>
        <p className="text-xs text-gray-400 mt-1">Los choferes aparecerán aquí cuando inicien su ruta</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Rutas activas */}
      {active.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map(route => (
            <RouteCard key={route.route_id} route={route} routeNumber={routeNumById.get(route.route_id) ?? 1} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {/* Rutas finalizadas hoy */}
      {finished.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Rutas finalizadas hoy
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
          Actualizado a las {formatTime(lastUpdated)} · refresca cada 10 min
        </p>
      )}
    </div>
  );
}
