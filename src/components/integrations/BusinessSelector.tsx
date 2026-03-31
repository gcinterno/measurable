type MetaOption = {
  id: string;
  name: string;
};

type BusinessSelectorProps = {
  businesses: MetaOption[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export function BusinessSelector({
  businesses,
  value,
  onChange,
  loading = false,
}: BusinessSelectorProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
        Businesses
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-slate-950">
        Selecciona un negocio
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Elige el negocio de Meta que quieres usar dentro del workspace activo.
      </p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || businesses.length === 0}
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
      >
        <option value="">Selecciona un negocio</option>
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}
          </option>
        ))}
      </select>
    </section>
  );
}
