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
    <div className="flex flex-wrap gap-x-6 gap-y-2" role="tablist">
      {tabs.map((t) => {
        const aktif = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={aktif}
            onClick={() => onChange(t.key)}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 pb-1.5 text-[13px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600 ${
              aktif
                ? 'border-kos-600 font-bold text-ink'
                : 'border-transparent font-medium text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs tabular-nums ${aktif ? 'text-kos-700' : 'text-ink-soft'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
