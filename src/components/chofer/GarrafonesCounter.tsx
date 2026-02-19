import type { GarrafonStats } from '../../types';

interface Props {
  stats: GarrafonStats;
}

export default function GarrafonesCounter({ stats }: Props) {
  return (
    <div className="bg-water-50 border border-water-200 rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-water-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z" />
        </svg>
        Garrafones de la ruta
      </h3>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
          <p className="text-2xl font-bold text-water-700">{stats.cargados}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cargados</p>
        </div>
        <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{stats.recargas_vendidas + stats.nuevos_vendidos}</p>
          <p className="text-xs text-gray-400 mt-0.5">Vendidos</p>
        </div>
        <div className="bg-white rounded-xl py-2 px-1 shadow-sm">
          <p className="text-2xl font-bold text-red-500">{stats.total_quebrados}</p>
          <p className="text-xs text-gray-400 mt-0.5">Quebrados</p>
        </div>
      </div>

      <div className="mt-3 bg-white rounded-xl px-4 py-2.5 flex justify-between items-center shadow-sm">
        <span className="text-sm text-gray-600 font-medium">A regresar</span>
        <div className="text-right">
          <span className="text-xl font-bold text-water-800">{stats.total_a_regresar}</span>
          <p className="text-xs text-gray-400">
            {stats.llenos_a_regresar} llenos · {stats.vacios_a_regresar} vacíos
          </p>
        </div>
      </div>
    </div>
  );
}
