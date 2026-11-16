interface Tab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (key: T) => void;
}

export default function FilterTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
            value === t.key
              ? 'bg-kos-600 text-white shadow-sm shadow-kos-600/25'
              : 'border border-slate-200 bg-white text-ink-soft hover:border-slate-300 hover:text-ink'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                value === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-soft'
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
