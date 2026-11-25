import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from './icons';

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

export default function PageHeader({ crumbs, title, subtitle, badge, action }: Props) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs.length > 2 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-ink-soft">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRightIcon size={13} className="text-slate-300" />}
              {c.to ? (
                <Link to={c.to} className="transition hover:text-kos-700">
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-kos-700">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
