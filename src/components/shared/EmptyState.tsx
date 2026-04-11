import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border bg-card px-6 py-12 text-center shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
