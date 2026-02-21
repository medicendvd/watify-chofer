import type { DashboardData } from '../../types';

interface Props {
  drivers: DashboardData['by_driver'];
}

export default function DriverSummary({ drivers }: Props) {
  if (drivers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-6 text-sm bg-white rounded-2xl">
        Sin actividad de choferes hoy
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {drivers.map((driver) => {
        const efectivo = driver.methods
          .filter((m) => m.method === 'Efectivo')
          .reduce((s, m) => s + m.total, 0);

        return (
          <div key={driver.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header del chofer */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-water-100 text-water-700 flex items-center justify-center font-bold text-sm uppercase">
                  {driver.name[0]}
                </div>
                <span className="font-semibold text-gray-800">{driver.name}</span>
              </div>
              <span className="font-bold text-gray-900">
                ${Number(driver.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </span>
            </div>

            {/* Métodos */}
            <div className="px-4 py-3 space-y-3">
              {driver.methods.map((m, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.method}
                      </span>
                      {m.company_name && (
                        <span className="text-xs font-medium text-gray-700">{m.company_name}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {m.count} vta{m.count !== 1 ? 's' : ''} · {m.garrafones} garr
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      ${Number(m.total).toFixed(0)}
                    </span>
                  </div>

                  {/* Clientes con nombre (Link / Tarjeta) */}
                  {m.customers.length > 0 && (
                    <div className="mt-1.5 ml-2 space-y-0.5">
                      {m.customers.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-1 h-1 rounded-full bg-gray-300 inline-block flex-shrink-0" />
                          <span>{c.name}</span>
                          <span className="text-gray-400">· {c.garrafones} garr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Efectivo destacado */}
            {efectivo > 0 && (
              <div className="mx-4 mb-4 bg-green-50 rounded-xl px-4 py-2.5 flex justify-between items-center border border-green-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm font-medium text-green-800">Efectivo a entregar</span>
                </div>
                <span className="font-bold text-green-700 text-lg">${efectivo.toFixed(0)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
