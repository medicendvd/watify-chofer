const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no-JSON del servidor [${res.status}]: ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Error de servidor');
  return data as T;
}

export const api = {
  // Auth
  login: (name: string, password: string) =>
    request('/auth/login.php', { method: 'POST', body: JSON.stringify({ name, password }) }),

  logout: () => request('/auth/logout.php', { method: 'POST' }),

  me: () => request('/auth/me.php'),

  // Products
  getProducts: () => request('/products/index.php'),

  // Companies
  getCompanies: () => request('/companies/index.php'),
  createCompany: (name: string) =>
    request('/companies/index.php', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCompanyPrice: (company_id: number, product_id: number, price: number) =>
    request('/companies/prices.php', {
      method: 'PUT',
      body: JSON.stringify({ company_id, product_id, price }),
    }),

  // Transactions
  getTransactions: (date?: string, user_id?: number) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (user_id) params.set('user_id', String(user_id));
    return request(`/transactions/index.php?${params}`);
  },
  createTransaction: (data: object) =>
    request('/transactions/index.php', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: object) =>
    request(`/transactions/edit.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) =>
    request(`/transactions/edit.php?id=${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return request(`/dashboard/index.php${params}`);
  },

  // Routes
  getActiveRoute: () => request('/routes/index.php'),
  getActiveRoutes: () => request('/routes/active_all.php'),
  getLiveRoutes: () => request('/routes/live.php'),
  createRoute: (garrafones_loaded: number) =>
    request('/routes/index.php', { method: 'POST', body: JSON.stringify({ garrafones_loaded }) }),
  finishRoute: (route_id: number) =>
    request('/routes/finish.php', { method: 'POST', body: JSON.stringify({ route_id }) }),

  // Broken garrafones
  registerBroken: (route_id: number, was_full: boolean, condition_type: string) =>
    request('/broken/index.php', { method: 'POST', body: JSON.stringify({ route_id, was_full, condition_type }) }),

  // Stripe sync
  getStripeMatches: () => request('/stripe/sync.php'),

  // Pagos por Link
  getLinkPayments: () => request('/link-payments/index.php'),
  markLinkPaymentPaid: (transaction_id: number) =>
    request('/link-payments/mark.php', { method: 'POST', body: JSON.stringify({ transaction_id }) }),

  // Facturas de garrafones
  createFactura: (route_id: number, cantidad: number, cliente: string) =>
    request('/routes/facturas.php', { method: 'POST', body: JSON.stringify({ route_id, cantidad, cliente }) }),
  deleteFactura: (id: number) =>
    request(`/routes/facturas.php?id=${id}`, { method: 'DELETE' }),
};
