import { useState } from 'react';
import type { Company } from '../../types';

interface Props {
  companies: Company[];
  value: number | null;
  onChange: (companyId: number | null) => void;
}

export default function CompanySelector({ companies, value, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);

  const zoneCompanies  = companies.filter(c => c.is_zone);
  const extraCompanies = companies.filter(c => !c.is_zone);
  const hasExtra       = extraCompanies.length > 0;

  const visible = showAll ? companies : zoneCompanies;

  return (
    <div className="mt-3">
      <label className="block text-xs font-semibold text-purple-700 mb-1.5 uppercase tracking-wide">
        Selecciona la empresa
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-500 text-sm"
      >
        <option value="">— Elige una empresa —</option>
        {visible.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {hasExtra && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-1.5 text-xs text-purple-500 hover:text-purple-700 underline"
        >
          {showAll
            ? `Ver solo mi zona (${zoneCompanies.length})`
            : `Ver más empresas (+${extraCompanies.length})`}
        </button>
      )}
    </div>
  );
}
