import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-[0_1px_2px_rgba(31,29,26,0.08)]",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
