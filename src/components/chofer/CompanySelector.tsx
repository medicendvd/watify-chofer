import type { Company } from '../../types';

interface Props {
  companies: Company[];
  value: number | null;
  onChange: (companyId: number | null) => void;
}

export default function CompanySelector({ companies, value, onChange }: Props) {
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
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
