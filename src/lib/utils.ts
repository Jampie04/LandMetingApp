import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProjectStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a timestamp to a readable Dutch date string
export function formatDate(dateString: string): string {
  return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: nl });
}

// Format a timestamp as a relative time string
export function formatRelative(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale: nl,
  });
}

// Format a file size in bytes to human-readable
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Dutch label for each status value
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  new: "Nieuw",
  in_progress: "In behandeling",
  completed: "Afgerond",
};

// Tailwind classes for each status badge
export const STATUS_COLORS: Record<
  ProjectStatus,
  { bg: string; text: string; border: string }
> = {
  new: {
    bg: "bg-warning/15",
    text: "text-warning",
    border: "border-warning/40",
  },
  in_progress: {
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/35",
  },
  completed: {
    bg: "bg-success/15",
    text: "text-success",
    border: "border-success/35",
  },
};

// Build a Google Maps link from lat/lng
export function buildMapsUrl(
  lat: number | null,
  lng: number | null
): string | null {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
