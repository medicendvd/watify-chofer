export type Role = 'Admin' | 'Visor' | 'Chofer';

export interface User {
  id: number;
  name: string;
  role: Role;
}

export interface Product {
  id: number;
  name: string;
  base_price: number;
  display_order: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  color: string;
  icon: string;
  is_active: boolean;
}

export interface Company {
  id: number;
  name: string;
  is_active: boolean;
  special_prices: Record<number, number>; // product_id -> price
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

export interface TransactionItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  chofer_name: string;
  customer_name: string | null;
  company_id: number | null;
  company_name: string | null;
  payment_method_id: number;
  payment_method_name: string;
  payment_method_color: string;
  payment_method_icon: string;
  total: number;
  notes: string | null;
  transaction_date: string;
  items: TransactionItem[];
}

export interface GarrafonStats {
  cargados: number;
  recargas_vendidas: number;
  nuevos_vendidos: number;
  total_quebrados: number;
  quebrados_llenos: number;
  quebrados_vacios: number;
  llenos_a_regresar: number;
  vacios_a_regresar: number;
  total_a_regresar: number;
}

export interface Route {
  id: number;
  garrafones_loaded: number;
  status: 'active' | 'finished';
  started_at: string;
  garrafones: GarrafonStats;
}

export interface RouteSummary {
  route_id: number;
  by_method: { method: string; color: string; icon: string; total: number; count: number }[];
  companies: { company: string; total: number; count: number }[];
  total_negocios: number;
  garrafones: GarrafonStats;
}

export interface StripeMatch {
  stripe_session_id: string;
  stripe_name: string;
  stripe_email: string | null;
  stripe_amount: number;
  stripe_date: string;
  match: {
    transaction_id: number;
    customer_name: string;
    garrafones: number;
    total: number;
    delivery_date: string;
    score: number;
  } | null;
}

export interface LinkPayment {
  transaction_id: number;
  customer_name: string | null;
  garrafones: number;
  total: number;
  delivery_date: string;
  paid_at: string | null;
  paid_by_name: string | null;
}

export interface FacturaGarrafon {
  id: number;
  cantidad: number;
  cliente: string;
}

export interface ActiveDriverRoute {
  route_id: number;
  chofer_id: number;
  chofer_name: string;
  status: 'active' | 'finished';
  started_at: string;
  finished_at: string | null;
  total_ventas: number;
  transaction_count: number;
  products: { product: string; units: number; total: number }[];
  by_method: { method: string; color: string; icon: string; total: number; count: number; garrafones: number }[];
  companies: { company: string; total: number; count: number; garrafones: number }[];
  total_negocios: number;
  garrafones: GarrafonStats;
  facturas: FacturaGarrafon[];
  transactions: {
    id: number;
    customer_name: string | null;
    company_name: string | null;
    company_id: number | null;
    payment_method_id: number;
    method: string;
    color: string;
    total: number;
    time: string;
    items: { product_id: number; unit_price: number; product: string; quantity: number }[];
  }[];
}

export interface LiveSaleDetail {
  customer_name: string | null;
  garrafones: number;
}

export interface LiveRoute {
  route_id: number;
  chofer_id: number;
  chofer_name: string;
  status: 'active' | 'finished';
  started_at: string;
  finished_at: string | null;
  transaction_count: number;
  garrafones: GarrafonStats;
  companies: { company: string; garrafones: number }[];
  link_sales: LiveSaleDetail[];
  tarjeta_sales: LiveSaleDetail[];
}

export interface WeeklyIncident {
  id: number;
  amount: number;
  description: string;
  type: 'deduccion' | 'ajuste';
  prev_efectivo: number | null;
}

export interface WeeklyDayData {
  date: string;        // 'YYYY-MM-DD'
  efectivo: number;
  incidencias: number;
  incidents_list: WeeklyIncident[];
  negocios: number;
  link: number;
  tarjeta: number;
  nuevos: number;
  facturado: number;
  total: number;
  confirmed: boolean;
}

export interface WeeklyDriverData {
  id: number;
  name: string;
  days: WeeklyDayData[];
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  drivers: WeeklyDriverData[];
}

export interface SimplirouteVisit {
  order: number;
  title: string;
  address: string;
  lat: number;
  lng: number;
  status: 'pending' | 'completed' | 'failed' | 'partial';
  checkout_lat: number | null;
  checkout_lng: number | null;
  checkout_time: string | null;
}

export interface SimplirouteRoute {
  route_id: string;
  vehicle_name: string;
  driver_name: string;
  driver_phone: string;
  color: string;
  total_visits: number;
  completed: number;
  last_position: { lat: number; lng: number } | null;
  visits: SimplirouteVisit[];
}

export interface SimplirouteMapData {
  routes: SimplirouteRoute[];
  date: string;
}

export interface DashboardData {
  date: string;
  grand_total: number;
  by_method: { method: string; color: string; icon: string; total: number; count: number }[];
  by_product: { product: string; units: number; total: number }[];
  by_driver: {
    id: number;
    name: string;
    total: number;
    methods: {
      method: string;
      color: string;
      icon: string;
      company_name: string | null;
      total: number;
      count: number;
      garrafones: number;
      customers: { name: string; garrafones: number }[];
    }[];
  }[];
  weekly: { day: string; total: number }[];
  dod: { today: number; yesterday: number; pct: number | null };
  wow: { this_week_day: number; last_week_day: number; pct: number | null };
  mom: { this_month: number; last_month: number; pct: number | null };
}
