import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../store/authContext';
import type { Role } from '../types';

function roleHome(role: Role) {
  if (role === 'Admin') return '/admin';
  if (role === 'Visor') return '/visor';
  return '/chofer';
}

export default function Login() {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(name.trim(), password);
      navigate(roleHome(user.role), { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-500 to-water-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-water-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Watify</h1>
          <p className="text-water-100 text-sm mt-1">Sistema de corte de caja</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 text-gray-900"
                placeholder="tu usuario"
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 text-gray-900"
                placeholder="••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2 px-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-water-600 hover:bg-water-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
