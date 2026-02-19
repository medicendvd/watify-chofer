import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { DashboardData } from '../../types';

interface Props {
  data: DashboardData;
}

const COLORS = ['#22c55e', '#3b82f6', '#7c3aed', '#f97316', '#06b6d4', '#ec4899'];

function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currencyFormatter = (v: any) => [`$${Number(v).toFixed(0)}`];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const salesFormatter   = (v: any) => [`$${Number(v).toFixed(0)}`, 'Ventas'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const totalFormatter   = (v: any) => [`$${Number(v).toFixed(0)}`, 'Total'];

export default function PerformanceCharts({ data }: Props) {
  const weeklyFormatted = data.weekly.map((w) => ({
    day: formatDay(w.day),
    total: Number(w.total),
  }));

  const methodData = data.by_method.map((m) => ({
    name: m.method,
    value: Number(m.total),
  }));

  const productData = data.by_product.map((p) => ({
    name: p.product,
    total: Number(p.total),
    units: Number(p.units),
  }));

  return (
    <div className="space-y-5">

      {/* Desempeño semanal — full width */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Últimos 7 días</h3>
        {weeklyFormatted.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyFormatted} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={salesFormatter} labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" fill="#00bcd4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Sin datos esta semana</p>
        )}
      </div>

      {/* Pie + Barras horizontales — lado a lado en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {methodData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Por método de pago</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${percent != null ? (percent * 100).toFixed(0) : 0}%`
                  }
                  labelLine={false}
                >
                  {methodData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={currencyFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {productData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Por producto (monto)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={productData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 13 }} width={60} />
                <Tooltip formatter={totalFormatter} />
                <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}
