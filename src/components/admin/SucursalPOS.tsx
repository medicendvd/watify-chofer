import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type { SucursalProduct, Company } from '../../types';

interface Props {
  onSaleComplete: () => void;
}

export default function SucursalPOS({ onSaleComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);

  const [products, setProducts] = useState<SucursalProduct[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [routeId, setRouteId] = useState<number | null>(null);

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [paymentMethodId, setPaymentMethodId] = useState<1 | 2 | 3>(1);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const initialize = useCallback(async () => {
    if (initialized) return;
    setLoadingInit(true);
    setError('');
    try {
      const [prods, comps, route] = await Promise.all([
        api.getSucursalProducts() as Promise<SucursalProduct[]>,
        api.getCompanies() as Promise<Company[]>,
        api.getSucursalRoute() as Promise<{ route_id: number; started_at: string }>,
      ]);
      setProducts(prods);
      setCompanies(comps.filter(c => c.is_active));
      setRouteId(route.route_id);
      setInitialized(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoadingInit(false);
    }
  }, [initialized]);

  const handleToggle = () => {
    if (!open) initialize();
    setOpen(prev => !prev);
  };

  const changeQty = (productId: number, delta: number) => {
    setQuantities(prev => {
      const cur = prev[productId] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const total = products.reduce((sum, p) => {
    const qty = quantities[p.id] ?? 0;
    return sum + qty * p.base_price;
  }, 0);

  const resetForm = () => {
    setQuantities({});
    setPaymentMethodId(1);
    setSelectedCompanyId('');
    setCustomerName('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!routeId) { setError('Ruta no inicializada'); return; }
    const items = products
      .filter(p => (quantities[p.id] ?? 0) > 0)
      .map(p => ({ product_id: p.id, quantity: quantities[p.id], unit_price: p.base_price }));
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    if (paymentMethodId === 3 && !selectedCompanyId) { setError('Selecciona una empresa'); return; }

    setSaving(true);
    setError('');
    try {
      await api.createSucursalSale({
        route_id: routeId,
        customer_name: customerName || null,
        company_id: paymentMethodId === 3 ? selectedCompanyId : null,
        payment_method_id: paymentMethodId,
        items,
      });
      resetForm();
      setSuccessMsg('¡Venta registrada!');
      setTimeout(() => {
        setSuccessMsg('');
        onSaleComplete();
      }, 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar venta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#2543e3', boxShadow: '0 0 0 2px #08ffbe, 0 0 16px 4px #08ffbe55' }}>
      {/* Header colapsable */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-white"
        style={{ background: '#2543e3' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🏪</span>
          <span className="font-semibold text-sm">Venta en Sucursal</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-white px-4 py-4 space-y-4">
          {loadingInit && (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: '#2543e3', borderTopColor: 'transparent' }} />
            </div>
          )}

          {!loadingInit && initialized && (
            <>
              {/* Fila de productos */}
              {(() => {
                const FEATURED = new Set(['45 Recarga', 'Pack', 'Nuevo']);
                const ORDER = ['45 Recarga', 'Nuevo', 'Pack', '50 Recarga', 'Mini completo', 'Envase 10L', 'Envase 5L'];
                const sorted = [...products].sort((a, b) => {
                  const ia = ORDER.indexOf(a.name);
                  const ib = ORDER.indexOf(b.name);
                  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                });
                return (
                  <div className="flex gap-1 w-full">
                    {sorted.map(p => {
                      const qty = quantities[p.id] ?? 0;
                      const featured = FEATURED.has(p.name);
                      return (
                        <div
                          key={p.id}
                          className="rounded-xl border-2 transition-colors min-w-0"
                          style={{
                            flex: featured ? '0 0 15%' : '1',
                            padding: featured ? '8px 6px 7px' : '6px 4px 5px',
                            ...(qty > 0
                              ? { borderColor: '#2543e3', backgroundColor: '#eef0fd' }
                              : { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }),
                          }}
                        >
                          <p
                            className="font-semibold text-gray-800 leading-tight mb-0.5 truncate"
                            style={{ fontSize: featured ? 12 : 10 }}
                          >{p.name}</p>
                          <p
                            className="text-gray-500 mb-1.5"
                            style={{ fontSize: featured ? 11 : 10 }}
                          >${p.base_price.toFixed(0)}</p>
                          <div className="flex items-center" style={{ gap: featured ? 4 : 2 }}>
                            <button
                              onClick={() => changeQty(p.id, -1)}
                              className="rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-300 transition-colors flex-none"
                              style={{ width: featured ? 20 : 15, height: featured ? 20 : 15, fontSize: featured ? 12 : 10 }}
                            >−</button>
                            <span
                              className="font-bold text-gray-800 text-center flex-none"
                              style={{ fontSize: featured ? 12 : 10, width: featured ? 14 : 10 }}
                            >{qty}</span>
                            <button
                              onClick={() => changeQty(p.id, 1)}
                              className="rounded-full text-white font-bold flex items-center justify-center transition-colors flex-none"
                              style={{ width: featured ? 20 : 15, height: featured ? 20 : 15, fontSize: featured ? 12 : 10, backgroundColor: '#2543e3' }}
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Método de pago */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Método de pago</p>
                <div className="flex gap-2">
                  {([
                    { id: 1 as const, label: 'Efectivo' },
                    { id: 2 as const, label: 'Tarjeta' },
                    { id: 3 as const, label: 'Empresas' },
                  ]).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethodId(m.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors"
                      style={paymentMethodId === m.id
                        ? { borderColor: '#2543e3', backgroundColor: '#2543e3', color: '#fff' }
                        : { borderColor: '#e5e7eb', color: '#4b5563' }
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector empresa (solo Negocios/Empresas) */}
              {paymentMethodId === 3 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Empresa</p>
                  <select
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#2543e3' } as React.CSSProperties}
                  >
                    <option value="">Seleccionar empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nombre cliente (opcional) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cliente (opcional)</p>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#2543e3' } as React.CSSProperties}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}

              {/* Éxito */}
              {successMsg && (
                <p className="text-emerald-600 text-sm font-semibold text-center">{successMsg}</p>
              )}

              {/* Footer: total + botón */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={saving || total === 0}
                  className="disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                  style={{ backgroundColor: '#2543e3' }}
                >
                  {saving ? 'Registrando...' : 'Registrar venta'}
                </button>
              </div>
            </>
          )}

          {!loadingInit && error && !initialized && (
            <p className="text-red-500 text-sm text-center py-4">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
