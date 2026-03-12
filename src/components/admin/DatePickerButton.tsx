import { useState, useEffect, useRef } from 'react';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatLabel(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (toYMD(date) === toYMD(today)) return 'Hoy';
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DatePickerButton({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = value.split('-').map(Number);
    return { year: y, month: m - 1 }; // month 0-indexed
  });
  const ref = useRef<HTMLDivElement>(null);
  const todayYMD = toYMD(new Date());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => setCursor(c => {
    if (c.month === 0) return { year: c.year - 1, month: 11 };
    return { year: c.year, month: c.month - 1 };
  });
  const nextMonth = () => setCursor(c => {
    if (c.month === 11) return { year: c.year + 1, month: 0 };
    return { year: c.year, month: c.month + 1 };
  });

  // Build calendar grid
  const firstDay = new Date(cursor.year, cursor.month, 1);
  const lastDay  = new Date(cursor.year, cursor.month + 1, 0);
  // Monday-first: 0=Mon … 6=Sun
  const startPad = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(cursor.year, cursor.month, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const isToday = (day: number) => toYMD(new Date(cursor.year, cursor.month, day)) === todayYMD;
  const isSelected = (day: number) => toYMD(new Date(cursor.year, cursor.month, day)) === value;
  const isFuture = (day: number) => toYMD(new Date(cursor.year, cursor.month, day)) > todayYMD;

  const selectDay = (day: number) => {
    const ymd = toYMD(new Date(cursor.year, cursor.month, day));
    if (ymd > todayYMD) return;
    onChange(ymd);
    setOpen(false);
  };

  const isCurrentMonth = cursor.year === new Date().getFullYear() && cursor.month === new Date().getMonth();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
        style={value !== todayYMD
          ? { borderColor: '#1a2fa8', color: '#1a2fa8', background: '#eff2ff' }
          : { borderColor: '#e5e7eb', color: '#6b7280', background: '#fff' }
        }
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        {formatLabel(value)}
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 select-none"
          style={{ width: 260, padding: '12px 12px 14px' }}
        >
          {/* Header mes */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span className="text-xs font-bold text-gray-800 capitalize">{monthLabel}</span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Días semana */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grid días */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const future   = isFuture(day);
              const selected = isSelected(day);
              const today    = isToday(day);
              return (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  disabled={future}
                  className="w-full aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center"
                  style={
                    selected
                      ? { background: '#1a2fa8', color: '#fff', fontWeight: 700 }
                      : today
                      ? { background: '#eff2ff', color: '#1a2fa8', fontWeight: 700 }
                      : future
                      ? { color: '#d1d5db', cursor: 'not-allowed' }
                      : { color: '#374151' }
                  }
                  onMouseEnter={e => { if (!selected && !future) (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
                  onMouseLeave={e => { if (!selected && !future && !today) (e.currentTarget as HTMLButtonElement).style.background = ''; else if (today && !selected) (e.currentTarget as HTMLButtonElement).style.background = '#eff2ff'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Atajo: hoy */}
          {value !== todayYMD && (
            <button
              onClick={() => { onChange(todayYMD); setOpen(false); }}
              className="mt-3 w-full text-xs font-semibold text-center py-1.5 rounded-lg transition-colors"
              style={{ color: '#1a2fa8', background: '#eff2ff' }}
            >
              Ir a hoy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
