import { useState, useEffect } from 'react';
import type { ExtraLoad } from '../../types';

interface Props {
  load: ExtraLoad;
  onAccept: () => void;
}

export default function ExtraLoadModal({ load, onAccept }: Props) {
  const [displayNum, setDisplayNum] = useState(0);
  const [phase, setPhase] = useState<'spinning' | 'landing' | 'ready'>('spinning');

  useEffect(() => {
    // Phase 1: spin random digits 0–1500 ms
    const spinInterval = setInterval(() => {
      setDisplayNum(Math.floor(Math.random() * 99) + 1);
    }, 80);

    const landingTimer = setTimeout(() => {
      clearInterval(spinInterval);
      setDisplayNum(load.cantidad);
      setPhase('landing');
    }, 1500);

    const readyTimer = setTimeout(() => {
      setPhase('ready');
    }, 2200);

    return () => {
      clearInterval(spinInterval);
      clearTimeout(landingTimer);
      clearTimeout(readyTimer);
    };
  }, [load.cantidad]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-xs rounded-3xl overflow-hidden flex flex-col items-center text-center py-8 px-6"
        style={{
          backgroundColor: '#0d1b4b',
          border: '2px solid #f59e0b',
          boxShadow: '0 0 40px #f59e0b80',
        }}
      >
        {/* Header */}
        <p
          className="text-xl font-black tracking-widest mb-6"
          style={{ color: '#f59e0b' }}
        >
          🎰 ¡CARGA RECIBIDA! 🎰
        </p>

        {/* Animated number */}
        <div
          className="flex items-center justify-center w-40 h-40 rounded-2xl mb-2"
          style={{
            backgroundColor: '#0a1540',
            border: '2px solid #f59e0b40',
            transition: phase === 'landing' ? 'transform 0.15s ease-out' : undefined,
            transform: phase === 'landing' ? 'scale(1.12)' : 'scale(1)',
          }}
        >
          <span
            className="text-8xl font-black"
            style={{
              color: phase === 'landing' ? '#f59e0b' : 'white',
              transition: 'color 0.3s ease',
              textShadow: phase === 'landing' ? '0 0 20px #f59e0b' : undefined,
            }}
          >
            {displayNum}
          </span>
        </div>

        <p className="text-sm font-medium mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
          garrafones extra
        </p>

        {/* Accept button — fades in after phase 'ready' */}
        <button
          onClick={onAccept}
          disabled={phase !== 'ready'}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all"
          style={{
            backgroundColor: '#f59e0b',
            color: '#1a0a00',
            opacity: phase === 'ready' ? 1 : 0,
            transform: phase === 'ready' ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: phase === 'ready' ? 'auto' : 'none',
          }}
        >
          ✅ ¡Aceptar carga!
        </button>
      </div>
    </div>
  );
}
