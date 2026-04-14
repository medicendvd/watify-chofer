const KEY = 'watify_offline_queue';

export interface PendingTransaction {
  localId: string;
  queuedAt: string;
  data: {
    customer_name: string;
    company_id: number | null;
    payment_method_id: number;
    notes: string;
    route_id: number | null;
    items: { product_id: number; quantity: number; unit_price: number }[];
  };
  // Para mostrar en UI sin hacer fetch
  meta: {
    customerName: string;
    companyName: string | null;
    paymentMethodName: string;
    paymentMethodColor: string;
    total: number;
    itemsSummary: string;
  };
}

export function getQueue(): PendingTransaction[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingTransaction[]) {
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function enqueue(
  data: PendingTransaction['data'],
  meta: PendingTransaction['meta']
): PendingTransaction {
  const item: PendingTransaction = {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    queuedAt: new Date().toISOString(),
    data,
    meta,
  };
  saveQueue([...getQueue(), item]);
  return item;
}

export function dequeue(localId: string) {
  saveQueue(getQueue().filter((i) => i.localId !== localId));
}

export function queueCount(): number {
  return getQueue().length;
}
