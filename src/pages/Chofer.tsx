import { useState, useEffect } from 'react';
import { useAuthContext } from '../store/authContext';
import { useCartStore } from '../store/cartStore';
import { api } from '../lib/api';
import type { Product, PaymentMethod, Company, Transaction, Route } from '../types';
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

function formatDate(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 1, name: 'Efectivo', color: '#22c55e', icon: 'banknote',    is_active: true },
  { id: 2, name: 'Tarjeta',  color: '#3b82f6', icon: 'credit-card', is_active: true },
  { id: 3, name: 'Negocios', color: '#7c3aed', icon: 'building-2',  is_active: true },
  { id: 4, name: 'Link',     color: '#f97316', icon: 'smartphone',  is_active: true },
];

export default function Chofer() {
  const { user, logout } = useAuthContext();
  const { items, total, clearCart } = useCartStore();

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
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState('');

  // Modales
  const [showBroken, setShowBroken]           = useState(false);
  const [showFinalizar, setShowFinalizar]     = useState(false);

  const today = new Date();

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
    Promise.all([
      api.getProducts() as Promise<Product[]>,
      api.getCompanies() as Promise<Company[]>,
      api.getTransactions() as Promise<Transaction[]>,
    ]).then(([prods, comps, txs]) => {
      setProducts(prods);
      setCompanies(comps);
      setTransactions(txs);
    });
  }, [route?.id]);

  const loadTransactions = async () => {
    const txs = await api.getTransactions() as Transaction[];
    setTransactions(txs);
  };

  const refreshRoute = async () => {
    const r = await api.getActiveRoute() as Route | null;
    setRoute(r);
  };

  const company = companies.find(c => c.id === selectedCompany) ?? null;

  const getPrice = (product: Product): number => {
    if (company && company.special_prices[product.id] !== undefined) {
      return Number(company.special_prices[product.id]);
    }
    return Number(product.base_price);
  };

  const handleRegister = () => {
    setError('');
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    if (selectedMethod.name === 'Negocios' && !selectedCompany) {
      setError('Selecciona la empresa'); return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.createTransaction({
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
      });
      clearCart();
      setCustomerName('');
      setNotes('');
      setSelectedCompany(null);
      setSelectedMethod(PAYMENT_METHODS[0]);
      setShowModal(false);
      await Promise.all([loadTransactions(), refreshRoute()]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al registrar');
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-water-600 text-white px-4 pt-8 pb-5 shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <p className="capitalize text-sm text-water-100">{formatDate(today)}</p>
            <h1 className="text-xl font-bold mt-0.5">Hola, {user?.name}</h1>
          </div>
          <button onClick={logout}
            className="text-water-200 hover:text-white text-sm py-1.5 px-3 border border-water-400 rounded-lg transition-colors">
            Salir
          </button>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5 max-w-md mx-auto">

        {/* Contador de garrafones */}
        <GarrafonesCounter stats={route.garrafones} />

        {/* Nombre del cliente */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nombre del cliente
          </label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Opcional"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
          />
        </div>

        {/* Productos */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Productos</h2>
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
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Método de pago</h2>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map(pm => (
              <PaymentMethodCard
                key={pm.id}
                method={pm}
                selected={selectedMethod.id === pm.id}
                onSelect={() => {
                  setSelectedMethod(pm);
                  if (pm.name !== 'Negocios') setSelectedCompany(null);
                }}
              />
            ))}
          </div>
          {selectedMethod.name === 'Negocios' && (
            <CompanySelector companies={companies} value={selectedCompany} onChange={setSelectedCompany} />
          )}
        </div>

        {/* Comentarios */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Comentarios
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Opcional..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-water-400 text-sm resize-none"
          />
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
    </div>
  );
}
