import { useState } from 'react';
import type { User } from '../../types';
import { api } from '../../lib/api';

interface Props {
  user: User;
  onClose: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  Admin:    'bg-purple-100 text-purple-700',
  Chofer:   'bg-blue-100 text-blue-700',
  Sucursal: 'bg-emerald-100 text-emerald-700',
  Visor:    'bg-gray-100 text-gray-600',
};

export default function ProfileModal({ user, onClose }: Props) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const roleColor = ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPwd.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPwd, newPwd);
      setSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Mi perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-2 pt-6 pb-4">
          <div className="w-16 h-16 rounded-full bg-water-500 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-md">
            {user.name[0]}
          </div>
          <p className="text-base font-semibold text-gray-900 capitalize">{user.name}</p>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${roleColor}`}>
            {user.role}
          </span>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cambiar contraseña</p>

          <input
            type="password"
            placeholder="Contraseña actual"
            value={currentPwd}
            onChange={e => { setCurrentPwd(e.target.value); setError(''); setSuccess(false); }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
            autoComplete="current-password"
          />
          <input
            type="password"
            placeholder="Nueva contraseña (mín. 4 caracteres)"
            value={newPwd}
            onChange={e => { setNewPwd(e.target.value); setError(''); setSuccess(false); }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirmPwd}
            onChange={e => { setConfirmPwd(e.target.value); setError(''); setSuccess(false); }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 font-medium">Contraseña actualizada ✓</p>
          )}

          <button
            type="submit"
            disabled={saving || !currentPwd || !newPwd || !confirmPwd}
            className="w-full py-3 bg-water-600 hover:bg-water-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm mt-1"
          >
            {saving ? 'Guardando...' : 'Actualizar contraseña'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            Cerrar
          </button>
        </form>
      </div>
    </div>
  );
}
