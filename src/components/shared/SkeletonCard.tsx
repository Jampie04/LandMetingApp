import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="rounded-[16px] border bg-card p-5 space-y-3 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-24" />
      <div className="flex justify-end pt-1">
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
