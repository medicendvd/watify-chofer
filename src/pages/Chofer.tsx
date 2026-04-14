import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../store/authContext';
import { useCartStore } from '../store/cartStore';
import { api } from '../lib/api';
import { enqueue, type PendingTransaction } from '../lib/offlineQueue';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { Product, PaymentMethod, Company, Transaction, Route, ExtraLoad } from '../types';
import ProductCard from '../components/chofer/ProductCard';
import CartSummary from '../components/chofer/CartSummary';
import PaymentMethodCard from '../components/chofer/PaymentMethodCard';
import CompanySelector from '../components/chofer/CompanySelector';
import SaleModal from '../components/chofer/SaleModal';
import TransactionList from '../components/chofer/TransactionList';
import GarrafonesSetup from '../components/chofer/GarrafonesSetup';
import GarrafonesCounter from '../components/chofer/GarrafonesCounter';
import BrokenGarrafonModal from '../components/chofer/BrokenGarrafonModal';
import FinalizarRutaModal from '../components/chofer/FinalizarRutaModal';
import ExtraLoadModal from '../components/chofer/ExtraLoadModal';
import ProfileModal from '../components/shared/ProfileModal';


// Empresas con sucursales: requieren preguntar cuál antes de registrar
const BRANCH_QUESTIONS: Record<string, string> = {
  'Región Sanitaria': '¿A cuál centro de salud se le entregó?',
  'Creparis':         '¿Cuál sucursal es?',
};
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const getBranchQuestion = (name: string) =>
  Object.entries(BRANCH_QUESTIONS).find(([k]) => normalize(k) === normalize(name))?.[1] ?? null;

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 1, name: 'Efectivo',           color: '#22c55e', icon: 'banknote',         is_active: true },
  { id: 2, name: 'Tarjeta',            color: '#3b82f6', icon: 'credit-card',      is_active: true },
  { id: 4, name: 'Link',               color: '#f97316', icon: 'smartphone',       is_active: true },
  { id: 3, name: 'Negocios a crédito', color: '#7c3aed', icon: 'building-2',       is_active: true },
  { id: 6, name: 'Transferencia',      color: '#0369a1', icon: 'arrow-left-right', is_active: true },
  { id: 5, name: 'Distribuidores',     color: '#0d9488', icon: 'store',            is_active: true },
];

export default function Chofer() {
  const { user, logout } = useAuthContext();
  const { items, total, clearCart, setQuantity } = useCartStore();

  // Estado de ruta
  const [route, setRoute]               = useState<Route | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);

  // Datos de la app
  const [products, setProducts]             = useState<Product[]>([]);
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [transactions, setTransactions]     = useState<Transaction[]>([]);

  // Estado del POS
  const [customerName, setCustomerName]     = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [notes, setNotes]                   = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [showResumen, setShowResumen]       = useState(false);
  const [showNotes, setShowNotes]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState('');
  const [customerNameError, setCustomerNameError] = useState(false);

  const customerNameRef = useRef<HTMLDivElement>(null);

  // Modales
  const [showBroken, setShowBroken]           = useState(false);
  const [showFinalizar, setShowFinalizar]     = useState(false);

  // Carga extra pendiente
  const [pendingLoad, setPendingLoad] = useState<ExtraLoad | null>(null);

  // Perfil
  const [showProfile, setShowProfile] = useState(false);

  // Offline
  const [syncToast, setSyncToast] = useState('');
  const [pendingLocal, setPendingLocal] = useState<PendingTransaction[]>([]);

  const { isOnline, pendingCount, refreshCount, syncing } = useOfflineSync((synced) => {
    setSyncToast(`${synced} venta${synced > 1 ? 's' : ''} sincronizada${synced > 1 ? 's' : ''} ✓`);
    setPendingLocal([]);
    setTimeout(() => setSyncToast(''), 4000);
    loadTransactions();
    refreshRoute();
  });

  // Al cargar: verificar ruta activa
  useEffect(() => {
    api.getActiveRoute()
      .then(r => setRoute(r as Route | null))
      .catch(() => setRoute(null))
      .finally(() => setRouteLoading(false));
  }, []);

  // Cargar productos, empresas y transacciones cuando hay ruta
  useEffect(() => {
    if (!route) return;
    (api.getProducts() as Promise<Product[]>).then(prods => setProducts(prods));
    (api.getCompanies() as Promise<Company[]>).then(comps => setCompanies(comps)).catch(() => {});
    (api.getTransactions() as Promise<Transaction[]>).then(txs => setTransactions(txs));
  }, [route?.id]);

  const loadTransactions = async () => {
    const txs = await api.getTransactions() as Transaction[];
    setTransactions(txs);
  };

  const refreshRoute = async () => {
    const r = await api.getActiveRoute() as Route | null;
    setRoute(r);
  };

  // Polling de carga extra cada 10 s
  useEffect(() => {
    if (!route) return;
    const poll = async () => {
      const load = await api.getPendingExtraLoad().catch(() => null);
      if (load) setPendingLoad(load as ExtraLoad);
    };
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, [route?.id]);

  const handleAcceptLoad = async () => {
    if (!pendingLoad) return;
    await api.acceptExtraLoad(pendingLoad.id);
    setPendingLoad(null);
    await refreshRoute();
  };

  const company  = companies.find(c => c.id === selectedCompany) ?? null;
  const branchQ  = company ? getBranchQuestion(company.name) : null;

  const getPrice = (product: Product): number => {
    if (company && company.special_prices[product.id] !== undefined) {
      return Number(company.special_prices[product.id]);
    }
    return Number(product.base_price);
  };

  // Reprecia los items del carrito cuando cambia la empresa seleccionada
  useEffect(() => {
    if (items.length === 0) return;
    items.forEach(item => {
      setQuantity(item.product, getPrice(item.product), item.quantity);
    });
  }, [selectedCompany]);

  const handleRegister = () => {
    setError('');
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    if (['Negocios a crédito', 'Distribuidores', 'Transferencia'].includes(selectedMethod.name) && !selectedCompany) {
      setError('Selecciona la empresa'); return;
    }
    const needsName = selectedMethod.name === 'Efectivo' || selectedMethod.name === 'Link' || selectedMethod.name === 'Tarjeta';
    if (needsName && (customerName.match(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g) ?? []).length < 3) {
      setCustomerNameError(true);
      customerNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setCustomerNameError(false), 500);
      return;
    }
    if (branchQ && !customerName.trim()) {
      setCustomerNameError(true);
      customerNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setCustomerNameError(false), 500);
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const txData = {
      customer_name: customerName,
      company_id: selectedCompany,
      payment_method_id: selectedMethod.id,
      notes,
      route_id: route?.id ?? null,
      items: items.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    };
    try {
      await api.createTransaction(txData);
      clearCart();
      setCustomerName('');
      setNotes('');
      setShowNotes(false);
      setSelectedCompany(null);
      setSelectedMethod(PAYMENT_METHODS[0]);
      setShowModal(false);
      await Promise.all([loadTransactions(), refreshRoute()]);
    } catch (e: unknown) {
      // TypeError = sin conexión (fetch no pudo conectar)
      const isNetworkError = e instanceof TypeError;
      if (isNetworkError) {
        const pending = enqueue(txData, {
          customerName,
          companyName: company?.name ?? null,
          paymentMethodName: selectedMethod.name,
          paymentMethodColor: selectedMethod.color,
          total: total(),
          itemsSummary: items.map(i => `${i.product.name} ×${i.quantity}`).join(' · '),
        });
        setPendingLocal(prev => [...prev, pending]);
        refreshCount();
        clearCart();
        setCustomerName('');
        setNotes('');
        setShowNotes(false);
        setSelectedCompany(null);
        setSelectedMethod(PAYMENT_METHODS[0]);
        setShowModal(false);
      } else {
        alert(e instanceof Error ? e.message : 'Error al registrar');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla de carga inicial
  if (routeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-water-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-water-500 border-t-transparent" />
      </div>
    );
  }

  // Sin ruta activa → pantalla de configuración
  if (!route) {
    return (
      <GarrafonesSetup
        userName={user?.name ?? ''}
        onRouteCreated={r => {
          setRoute(r);
          setRouteLoading(false);
        }}
        onBack={logout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-water-600 text-white px-4 py-2 shadow-md flex justify-between items-center">
        <button onClick={() => setShowProfile(true)}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-sm uppercase transition-colors">
          {user?.name[0]}
        </button>
        <button onClick={logout}
          className="text-water-200 hover:text-white text-xs py-1 px-2.5 border border-water-400 rounded-lg transition-colors">
          Salir
        </button>
      </div>

      {/* Banner offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-sm font-medium px-4 py-2.5 flex items-center justify-between">
          <span>Sin conexión — las ventas se guardarán y sincronizarán al volver</span>
          {pendingCount > 0 && (
            <span className="bg-white text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full ml-3 shrink-0">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Banner sincronizando */}
      {isOnline && syncing && (
        <div className="bg-blue-500 text-white text-sm font-medium px-4 py-2.5 text-center">
          Sincronizando ventas pendientes...
        </div>
      )}

      {/* Toast sincronizado */}
      {syncToast && (
        <div className="bg-green-500 text-white text-sm font-semibold px-4 py-2.5 text-center">
          {syncToast}
        </div>
      )}

      <div className="px-4 mt-5 space-y-5 max-w-md mx-auto">

        {/* Nombre del cliente */}
        <div ref={customerNameRef}>
          <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${customerNameError && !branchQ ? 'text-red-500' : 'text-gray-500'}`}>
            Nombre del cliente
            {(selectedMethod.name === 'Efectivo' || selectedMethod.name === 'Link' || selectedMethod.name === 'Tarjeta') && (
              <span className="ml-1 text-red-400">*</span>
            )}
          </label>
          <input
            type="text"
            value={branchQ ? '' : customerName}
            onChange={e => { if (!branchQ) { setCustomerName(e.target.value); setCustomerNameError(false); } }}
            readOnly={!!branchQ}
            placeholder={selectedMethod.name === 'Efectivo' || selectedMethod.name === 'Link' || selectedMethod.name === 'Tarjeta' ? 'Requerido' : 'Opcional'}
            className={`w-full px-4 py-3 border rounded-xl text-gray-800 bg-white focus:outline-none text-sm transition-colors ${
              customerNameError && !branchQ
                ? 'border-red-400 ring-2 ring-red-300 animate-shake'
                : 'border-gray-200 focus:ring-2 focus:ring-water-400'
            } ${branchQ ? 'opacity-40 cursor-not-allowed' : ''}`}
          />
          {customerNameError && !branchQ && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">
              Es forzoso poner el nombre real del cliente (mín. 3 letras, sin puntos ni números)
            </p>
          )}
        </div>

        {/* Productos */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <ProductCard key={p.id} product={p} unitPrice={getPrice(p)} />
            ))}
          </div>
        </div>

        {/* Resumen carrito */}
        <CartSummary />

        {/* Método de pago */}
        <div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.slice(0, 3).map(pm => (
                <PaymentMethodCard
                  key={pm.id}
                  method={pm}
                  selected={selectedMethod.id === pm.id}
                  onSelect={() => {
                    setSelectedMethod(pm);
                    setSelectedCompany(null);
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.slice(3).map(pm => (
                <PaymentMethodCard
                  key={pm.id}
                  method={pm}
                  selected={selectedMethod.id === pm.id}
                  onSelect={() => {
                    setSelectedMethod(pm);
                    if (!['Negocios a crédito', 'Distribuidores', 'Transferencia'].includes(pm.name)) setSelectedCompany(null);
                  }}
                />
              ))}
            </div>
          </div>
          {['Negocios a crédito', 'Distribuidores', 'Transferencia'].includes(selectedMethod.name) && (
            <CompanySelector
              key={selectedMethod.id}
              companies={companies.filter(c => {
                if (selectedMethod.name === 'Negocios a crédito') return c.payment_method_id === null;
                if (selectedMethod.name === 'Distribuidores')     return c.payment_method_id === 5;
                if (selectedMethod.name === 'Transferencia')      return c.payment_method_id === 6;
                return false;
              })}
              value={selectedCompany}
              onChange={setSelectedCompany}
            />
          )}

          {/* Pregunta de sucursal — aparece justo debajo del selector de empresa */}
          {branchQ && (
            <div ref={customerNameRef} className="mt-3">
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${customerNameError ? 'text-red-500' : 'text-black'}`}>
                {branchQ} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => { setCustomerName(e.target.value); setCustomerNameError(false); }}
                placeholder="Requerido"
                className={`w-full px-4 py-3 border rounded-xl text-gray-800 bg-white focus:outline-none text-sm transition-colors ${
                  customerNameError
                    ? 'border-red-400 ring-2 ring-red-300 animate-shake'
                    : 'border-water-400 focus:ring-2 focus:ring-water-400'
                }`}
              />
              {customerNameError && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">Este campo es obligatorio</p>
              )}
            </div>
          )}
        </div>

        {/* Comentarios */}
        <div>
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="w-full py-3 border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 font-medium text-sm rounded-xl transition-colors text-center"
            >
              + Agregar comentario
            </button>
          ) : (
            <textarea
              autoFocus
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Comentario opcional..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-water-400 text-sm resize-none"
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm text-center rounded-xl py-3 px-4">{error}</div>
        )}

        {/* Botón registrar venta */}
        <button
          onClick={handleRegister}
          className="w-full py-4 bg-water-600 hover:bg-water-700 text-white font-bold text-lg rounded-2xl shadow-lg transition-colors"
        >
          Registrar venta →
        </button>

        {/* Ventas guardadas sin conexión */}
        {pendingLocal.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-3">Sin sincronizar</h2>
            <div className="space-y-2">
              {pendingLocal.map(p => (
                <div key={p.localId} className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-amber-400 flex items-start gap-3 opacity-80">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: p.meta.paymentMethodColor }}>
                        {p.meta.paymentMethodName}
                      </span>
                      {p.meta.customerName && (
                        <span className="text-xs text-gray-500 truncate">{p.meta.customerName}</span>
                      )}
                      {p.meta.companyName && (
                        <span className="text-xs text-purple-600 font-medium">{p.meta.companyName}</span>
                      )}
                      <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Pendiente</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.meta.itemsSummary}</div>
                  </div>
                  <span className="font-bold text-gray-900">${p.meta.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas 3 transacciones */}
        {transactions.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Últimas ventas</h2>
            <TransactionList
              transactions={transactions}
              onRefresh={loadTransactions}
              products={products}
              paymentMethods={PAYMENT_METHODS}
              compact={true}
            />
          </div>
        )}

        {/* Botón resumen del día */}
        {transactions.length > 0 && (
          <button
            onClick={() => setShowResumen(v => !v)}
            className="w-full py-3 border-2 border-water-300 text-water-700 font-semibold rounded-2xl hover:bg-water-50 transition-colors"
          >
            {showResumen ? 'Ocultar resumen' : 'Resumen del día'}
          </button>
        )}

        {showResumen && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Todas las ventas de hoy</h2>
            <TransactionList
              transactions={transactions}
              onRefresh={loadTransactions}
              products={products}
              paymentMethods={PAYMENT_METHODS}
              compact={false}
            />
          </div>
        )}

        {/* Contador de garrafones */}
        <GarrafonesCounter stats={route.garrafones} packsLoaded={route.packs_loaded} />

        {/* Botón garrafón quebrado */}
        <button
          onClick={() => setShowBroken(true)}
          className="w-full py-3 border-2 border-red-200 text-red-500 font-semibold rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>🫙</span> Registrar garrafón quebrado
        </button>

        {/* Separador */}
        <div className="border-t border-gray-200 pt-2" />

        {/* Botón finalizar ruta */}
        <button
          onClick={() => setShowFinalizar(true)}
          className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <span>🏁</span> Finalizar ruta actual
        </button>
      </div>

      {/* Modal venta */}
      {showModal && (
        <SaleModal
          items={items.filter(i => i.quantity > 0)}
          total={total()}
          paymentMethod={selectedMethod}
          customerName={customerName}
          company={company}
          notes={notes}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      )}

      {/* Modal garrafón quebrado */}
      {showBroken && (
        <BrokenGarrafonModal
          routeId={route.id}
          onRegistered={async () => {
            setShowBroken(false);
            await refreshRoute();
          }}
          onClose={() => setShowBroken(false)}
        />
      )}

      {/* Modal finalizar ruta */}
      {showFinalizar && (
        <FinalizarRutaModal
          routeId={route.id}
          onFinished={() => {}}
          onNuevaRuta={() => {
            setShowFinalizar(false);
            setRoute(null);
            setTransactions([]);
            clearCart();
          }}
          onClose={() => setShowFinalizar(false)}
        />
      )}

      {/* Modal carga extra */}
      {pendingLoad && (
        <ExtraLoadModal
          load={pendingLoad}
          onAccept={handleAcceptLoad}
        />
      )}

      {/* Modal perfil */}
      {showProfile && <ProfileModal user={user!} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
