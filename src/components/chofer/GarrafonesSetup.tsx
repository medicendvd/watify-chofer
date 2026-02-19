import { useState } from 'react';
import { api } from '../../lib/api';
import type { Route } from '../../types';

interface Props {
  userName: string;
  onRouteCreated: (route: Route) => void;
}

export default function GarrafonesSetup({ userName, onRouteCreated }: Props) {
  const [count, setCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const n = parseInt(count);
    if (!n || n <= 0) { setError('Ingresa un número válido'); return; }
    setLoading(true);
    setError('');
    try {
      const route = await api.createRoute(n) as Route;
      onRouteCreated(route);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-500 to-water-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-water-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">¡Hola, {userName}!</h1>
          <p className="text-water-100 text-sm mt-1">Antes de salir, confirma tu carga</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
            ¿Cuántos garrafones<br />cargaste hoy?
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6">
            Este será tu total de garrafones para la ruta
          </p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setCount(v => String(Math.max(0, parseInt(v || '0') - 1)))}
              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-2xl font-bold text-gray-600 flex items-center justify-center transition-colors"
            >−</button>
            <input
              type="number"
              value={count}
              onChange={e => setCount(e.target.value)}
              placeholder="0"
              min="0"
              className="w-24 text-center text-4xl font-bold text-water-700 border-b-2 border-water-300 focus:outline-none focus:border-water-600 py-2 bg-transparent"
            />
            <button
              onClick={() => setCount(v => String(parseInt(v || '0') + 1))}
              className="w-12 h-12 rounded-full bg-water-100 hover:bg-water-200 text-2xl font-bold text-water-600 flex items-center justify-center transition-colors"
            >+</button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4 bg-red-50 rounded-lg py-2">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !count || parseInt(count) <= 0}
            className="w-full py-4 bg-water-600 hover:bg-water-700 disabled:opacity-50 text-white font-bold text-lg rounded-2xl transition-colors"
          >
            {loading ? 'Iniciando ruta...' : 'Iniciar ruta →'}
          </button>
        </div>
      </div>
    </div>
  );
}
