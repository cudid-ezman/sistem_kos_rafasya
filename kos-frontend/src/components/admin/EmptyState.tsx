import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mb-3 flex justify-center text-gerbang/35">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
