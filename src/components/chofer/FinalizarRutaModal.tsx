import { useState } from 'react';
import { api } from '../../lib/api';
import type { RouteSummary } from '../../types';

interface Props {
  routeId: number;
  onFinished: () => void;
  onNuevaRuta: () => void;
  onClose: () => void;
}

export default function FinalizarRutaModal({ routeId, onFinished, onNuevaRuta, onClose }: Props) {
  const [step, setStep]         = useState<'confirm' | 'summary'>('confirm');
  const [summary, setSummary]   = useState<RouteSummary | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleFinalize = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.finishRoute(routeId) as RouteSummary;
      setSummary(data);
      setStep('summary');
      onFinished();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al finalizar');
    } finally {
      setLoading(false);
    }
  };

  const METHOD_ICONS: Record<string, string> = {
    Efectivo: '💵',
    Tarjeta:  '💳',
    Negocios: '🏢',
    Link:     '📲',
  };

  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <div className="p-7 text-center">
            <div className="text-5xl mb-4">🏁</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¿Finalizar ruta?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Se generará el corte de caja con el resumen de todo lo que hiciste en esta ruta.
            </p>
            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600">
                Cancelar
              </button>
              <button onClick={handleFinalize} disabled={loading}
                className="flex-1 py-3 bg-water-600 hover:bg-water-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold">
                {loading ? 'Cerrando...' : 'Finalizar ruta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // step === 'summary'
  const efectivo = summary!.by_method.find(m => m.method === 'Efectivo');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header — fijo */}
        <div className="bg-water-600 text-white rounded-t-3xl p-6 text-center flex-none">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold">Corte de ruta</h2>
          <p className="text-water-200 text-sm mt-1">Resumen de tu recorrido</p>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Efectivo destacado */}
          {efectivo && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                💵 Efectivo a entregar
              </p>
              <p className="text-4xl font-bold text-green-700">
                ${Number(efectivo.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-green-600 mt-0.5">{efectivo.count} venta{efectivo.count !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Por método (sin efectivo) */}
          {summary!.by_method.filter(m => m.method !== 'Efectivo').map(m => (
            <div key={m.method} className="bg-gray-50 rounded-xl p-3 flex justify-between items-center border-l-4" style={{ borderLeftColor: m.color }}>
              <div>
                <p className="font-semibold text-sm text-gray-800">
                  {METHOD_ICONS[m.method] ?? '💰'} {m.method}
                </p>
                <p className="text-xs text-gray-400">{m.count} venta{m.count !== 1 ? 's' : ''}</p>
              </div>
              <p className="font-bold text-gray-900">${Number(m.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
            </div>
          ))}

          {/* Empresas a crédito */}
          {summary!.companies.length > 0 && (
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">
                🏢 Empresas a crédito
              </p>
              <div className="space-y-2">
                {summary!.companies.map(c => (
                  <div key={c.company} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{c.company}</span>
                    <span className="font-semibold text-gray-900">
                      ${Number(c.total).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-purple-200 mt-3 pt-3 flex justify-between">
                <span className="text-sm font-semibold text-purple-700">Total crédito</span>
                <span className="font-bold text-purple-800">
                  ${Number(summary!.total_negocios).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}

          {/* Garrafones */}
          <div className="bg-water-50 rounded-2xl p-4 border border-water-100">
            <p className="text-xs font-semibold text-water-700 uppercase tracking-wide mb-3">
              🫙 Garrafones
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Cargaste</span><span className="font-medium">{summary!.garrafones.cargados}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Recargas vendidas</span><span className="font-medium">{summary!.garrafones.recargas_vendidas}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Nuevos vendidos</span><span className="font-medium text-orange-600">−{summary!.garrafones.nuevos_vendidos}</span></div>
              {summary!.garrafones.total_quebrados > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">Quebrados</span><span className="font-medium text-red-500">−{summary!.garrafones.total_quebrados}</span></div>
              )}
              <div className="border-t border-water-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-water-800">Debes regresar</span>
                <span className="font-bold text-water-800">{summary!.garrafones.total_a_regresar}</span>
              </div>
              <p className="text-xs text-gray-400">
                {summary!.garrafones.llenos_a_regresar} llenos · {summary!.garrafones.vacios_a_regresar} vacíos
              </p>
            </div>
          </div>

        </div>

        {/* Botón nueva ruta — fijo al fondo */}
        <div className="px-5 py-4 border-t border-gray-100 flex-none">
          <button
            onClick={onNuevaRuta}
            className="w-full py-4 bg-water-600 hover:bg-water-700 text-white font-bold text-base rounded-2xl transition-colors"
          >
            Iniciar nueva ruta →
          </button>
        </div>

      </div>
    </div>
  );
}
