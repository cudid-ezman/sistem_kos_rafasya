import { SearchIcon } from '../portal/icons';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export default function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative w-full sm:w-72">
      <SearchIcon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-field-line bg-field pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-kos-600 focus:ring-2 focus:ring-kos-600/20"
      />
    </div>
  );
}
