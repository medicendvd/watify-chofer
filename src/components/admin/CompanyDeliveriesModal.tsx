import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { CompanyDeliveriesData, CompanyDelivery } from '../../types';

interface Props {
  companyId:   number;
  companyName: string;
  month:       string;
  monthLabel:  string;
  onClose:     () => void;
}

const MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 });
}


function DeliveryRow({ d }: { d: CompanyDelivery }) {
  const itemsSummary = d.items.map(i => `${i.product} ×${i.quantity}`).join(' · ');

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between gap-3">
        {/* Fecha */}
        <div className="shrink-0 w-12 text-center">
          <p className="text-lg font-black text-gray-800 leading-none">{parseInt(d.date.split('-')[2])}</p>
          <p className="text-[10px] font-semibold text-gray-400 uppercase">{MONTH_NAMES[parseInt(d.date.split('-')[1])]}</p>
        </div>

        {/* Detalle */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{itemsSummary || `${d.units} uds`}</p>
          {d.customer_name && (
            <p className="text-xs text-teal-600 font-semibold mt-0.5 truncate">
              📍 {d.customer_name}
            </p>
          )}
          {d.notes && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate">
              "{d.notes}"
            </p>
          )}
          <p className="text-[10px] text-gray-300 mt-1">{d.chofer}</p>
        </div>

        {/* Monto */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-gray-900">{fmt(d.total)}</p>
          <p className="text-[10px] text-gray-400">{d.units} uds</p>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDeliveriesModal({ companyId, companyName, month, monthLabel, onClose }: Props) {
  const [data, setData]       = useState<CompanyDeliveriesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCompanyDeliveries(companyId, month)
      .then(d => setData(d as CompanyDeliveriesData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [companyId, month]);

  const grandTotal = data?.deliveries.reduce((s, d) => s + d.total, 0) ?? 0;
  const grandUnits = data?.deliveries.reduce((s, d) => s + d.units, 0) ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{monthLabel}</p>
            <h2 className="text-base font-black text-gray-900 leading-tight">{companyName}</h2>
            {!loading && data && (
              <p className="text-xs text-gray-400 mt-1">
                {data.deliveries.length} entrega{data.deliveries.length !== 1 ? 's' : ''} · {grandUnits} uds · <span className="font-bold text-gray-700">{fmt(grandTotal)}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0 mt-0.5"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#0f1c5e] border-t-transparent" />
            </div>
          ) : !data || data.deliveries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sin entregas este mes</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.deliveries.map(d => (
                <DeliveryRow key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>

        {/* Footer total */}
        {!loading && data && data.deliveries.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total del mes</span>
            <span className="text-xl font-black text-[#0f1c5e]">{fmt(grandTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
