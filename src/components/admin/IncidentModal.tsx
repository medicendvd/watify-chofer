import { useState, type FormEvent } from 'react';

interface Props {
  drivers: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (data: { choferId: number; description: string; amount: number }) => Promise<void>;
}

export default function IncidentModal({ drivers, onClose, onSubmit }: Props) {
  const [choferId, setChoferId]     = useState(drivers[0]?.id ?? 0);
  const [description, setDescription] = useState('');
  const [amount, setAmount]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!description.trim())          { setError('Describe la incidencia'); return; }
    if (!amount || Number(amount) <= 0) { setError('Ingresa un monto mayor a $0'); return; }
    setLoading(true);
    try {
      await onSubmit({ choferId, description: description.trim(), amount: Number(amount) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a2fa8] px-5 py-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-white font-bold text-sm tracking-wide uppercase">Nueva incidencia</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              ¿Cuál es tu incidencia?
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1a2fa8] transition-colors"
              rows={3}
              placeholder="Ej: Préstamo a empleado, compra de gasolina, descuento..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Chofer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              ¿De cuál chofer descontaremos?
            </label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a2fa8] transition-colors bg-white"
              value={choferId}
              onChange={e => setChoferId(Number(e.target.value))}
            >
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              ¿Cuánto dinero vas a tomar del sobre de efectivo?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#1a2fa8] transition-colors"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a2fa8] hover:bg-[#1626a0] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? 'Guardando...' : 'Registrar incidencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
