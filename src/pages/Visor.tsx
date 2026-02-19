import { useState, useEffect } from 'react';
import { useAuthContext } from '../store/authContext';
import { api } from '../lib/api';
import type { DashboardData } from '../types';
import SummaryCards from '../components/admin/SummaryCards';
import DriverSummary from '../components/admin/DriverSummary';

export default function Visor() {
  const { user, logout } = useAuthContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then((d) => setData(d as DashboardData))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-water-600 text-white px-4 pt-8 pb-5 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Vista Visor</h1>
            <p className="text-water-200 text-sm">{user?.name}</p>
          </div>
          <button onClick={logout} className="text-water-200 hover:text-white text-sm py-1.5 px-3 border border-water-400 rounded-lg">
            Salir
          </button>
        </div>
      </div>

      <div className="px-4 mt-5 max-w-xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-water-400 border-t-transparent" />
          </div>
        ) : data ? (
          <>
            <SummaryCards data={data} />
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por chofer</h2>
              <DriverSummary drivers={data.by_driver} />
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 py-10">No hay datos disponibles</p>
        )}
      </div>
    </div>
  );
}
