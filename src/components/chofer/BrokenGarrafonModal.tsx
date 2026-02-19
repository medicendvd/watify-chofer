import { useState } from 'react';
import { api } from '../../lib/api';

interface Props {
  routeId: number;
  onRegistered: () => void;
  onClose: () => void;
}

type Condition = 'buen_estado' | 'uso_leve' | 'parchado' | 'tostado';

const CONDITIONS: { value: Condition; label: string; emoji: string }[] = [
  { value: 'buen_estado', label: 'Buen estado',  emoji: '✅' },
  { value: 'uso_leve',    label: 'Uso leve',     emoji: '🟡' },
  { value: 'parchado',    label: 'Parchado',     emoji: '🟠' },
  { value: 'tostado',     label: 'Tostado',      emoji: '🔴' },
];

export default function BrokenGarrafonModal({ routeId, onRegistered, onClose }: Props) {
  const [step, setStep]         = useState<1 | 2>(1);
  const [wasFull, setWasFull]   = useState<boolean | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleNext = () => {
    if (wasFull === null) { setError('Selecciona si estaba lleno o vacío'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!condition) { setError('Selecciona el estado del envase'); return; }
    setLoading(true);
    setError('');
    try {
      await api.registerBroken(routeId, wasFull!, condition);
      onRegistered();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 text-center">Garrafón quebrado</h2>
          <div className="flex justify-center gap-2 mt-3">
            <div className={`w-8 h-1.5 rounded-full ${step >= 1 ? 'bg-red-400' : 'bg-gray-200'}`} />
            <div className={`w-8 h-1.5 rounded-full ${step >= 2 ? 'bg-red-400' : 'bg-gray-200'}`} />
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <>
              <p className="text-sm font-semibold text-gray-700 text-center mb-5">
                ¿El garrafón estaba lleno o vacío?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: true, label: 'Lleno', icon: '🫙', color: 'border-blue-400 bg-blue-50 text-blue-700' },
                  { value: false, label: 'Vacío', icon: '⬜', color: 'border-gray-400 bg-gray-50 text-gray-700' }
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setWasFull(opt.value)}
                    className={`py-5 rounded-2xl border-2 text-center transition-all ${
                      wasFull === opt.value ? opt.color + ' border-2 scale-[1.02]' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-3xl mb-1">{opt.icon}</div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-gray-700 text-center mb-5">
                ¿En qué estado estaba el envase?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CONDITIONS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCondition(c.value)}
                    className={`py-4 rounded-2xl border-2 text-center transition-all ${
                      condition === c.value
                        ? 'border-red-400 bg-red-50 scale-[1.02]'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{c.emoji}</div>
                    <div className="font-semibold text-xs text-gray-700">{c.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center mt-4 bg-red-50 rounded-lg py-2">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={step === 1 ? onClose : () => setStep(1)}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600">
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          {step === 1 ? (
            <button onClick={handleNext}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold">
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold">
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
