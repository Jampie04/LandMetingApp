import { MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { formatRelative } from "@/lib/utils";
import type { ProjectWithProfile } from "@/lib/types";

interface ProjectCardProps {
  project: ProjectWithProfile;
  onViewDetails: (project: ProjectWithProfile) => void;
}

export function ProjectCard({ project, onViewDetails }: ProjectCardProps) {
  const customerName = `${project.customer_first_name} ${project.customer_last_name}`;

  return (
    <div className="rounded-[16px] border bg-card p-5 space-y-3 shadow-[0_2px_10px_rgba(31,29,26,0.06)] transition-shadow hover:shadow-[0_7px_18px_rgba(31,29,26,0.1)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-base text-foreground truncate">
            {customerName}
          </p>
          {project.profiles && (
            <p className="text-xs text-muted-foreground mt-1">
              Behandelaar: {project.profiles.full_name}
            </p>
          )}
        </div>
        <StatusBadge status={project.status} className="shrink-0" />
      </div>

      {/* Location */}
      <div className="rounded-xl border border-border/80 bg-secondary/50 px-3 py-2.5">
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          <p className="text-xs line-clamp-2">{project.location_address}</p>
        </div>
      </div>

      {project.district || project.neighborhood ? (
        <p className="text-xs text-muted-foreground">
          {[project.neighborhood, project.district].filter(Boolean).join(", ")}
        </p>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatRelative(project.created_at)}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewDetails(project)}
          className="text-xs h-8"
        >
          Bekijk details
        </Button>
      </div>
    </div>
  );
}
