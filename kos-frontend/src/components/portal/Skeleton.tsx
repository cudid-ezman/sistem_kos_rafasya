export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="mt-6 h-72" />
    </div>
  );
}
