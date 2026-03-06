import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../store/authContext';
import type { Role } from '../types';
import logoLight from '../assets/logo-watify-light.svg';

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
    <div
      className="min-h-screen flex items-center justify-center p-5 overflow-hidden relative"
      style={{ background: '#040c1a' }}
    >
      {/* Blobs de fondo */}
      <div
        className="animate-blob absolute rounded-full opacity-20 pointer-events-none"
        style={{
          width: 480, height: 480,
          background: 'radial-gradient(circle, #10ffe0 0%, transparent 70%)',
          top: '-120px', left: '-120px',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="animate-blob delay-2000 absolute rounded-full opacity-15 pointer-events-none"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, #1a2fa8 0%, transparent 70%)',
          bottom: '-80px', right: '-80px',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="animate-blob delay-4000 absolute rounded-full opacity-10 pointer-events-none"
        style={{
          width: 300, height: 300,
          background: 'radial-gradient(circle, #00E5B9 0%, transparent 70%)',
          top: '50%', left: '60%',
          filter: 'blur(80px)',
        }}
      />

      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
          opacity: 0.4,
        }}
      />

      {/* Tarjeta principal */}
      <div className="relative w-full max-w-[380px] z-10">

        {/* Logo oficial */}
        <div className="text-center mb-8 animate-fade-up">
          <img
            src={logoLight}
            alt="Watify"
            className="w-56 mx-auto"
            style={{ filter: 'drop-shadow(0 0 18px rgba(16,255,224,0.25))' }}
          />
          <p
            className="text-sm mt-3 tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em' }}
          >
            Gestión de ventas
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-3xl p-8 animate-fade-up delay-100"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuario */}
            <div className="animate-fade-up delay-200">
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.14em' }}
              >
                Usuario
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`login-input${error ? ' error' : ''}`}
                placeholder="tu usuario"
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
            </div>

            {/* Contraseña */}
            <div className="animate-fade-up delay-300">
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.14em' }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`login-input${error ? ' error' : ''}`}
                placeholder="••••••"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-center animate-fade-up"
                style={{
                  background: 'rgba(255,107,107,0.12)',
                  border: '1px solid rgba(255,107,107,0.3)',
                  color: '#ff9090',
                }}
              >
                {error}
              </div>
            )}

            {/* Botón */}
            <div className="animate-fade-up delay-400 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-sm py-4 rounded-2xl transition-all duration-200 relative overflow-hidden"
                style={{
                  background: loading
                    ? 'rgba(16,255,224,0.5)'
                    : 'linear-gradient(135deg, #10ffe0 0%, #00c9a7 100%)',
                  color: '#040c1a',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(16,255,224,0.3)',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6 animate-fade-up delay-500"
          style={{ color: 'rgba(255,255,255,0.18)' }}
        >
          © {new Date().getFullYear()} Watify
        </p>
      </div>
    </div>
  );
}
