import type { ReactNode } from 'react';

export default function AuthIconBadge({ icon }: { icon: ReactNode }) {
  return (
    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-mint text-kos-600">
      {icon}
    </div>
  );
}
