export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-xl bg-muted" />
        <div className="space-y-1.5">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-card border border-border/50" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-card border border-border/50" />
    </div>
  );
}
