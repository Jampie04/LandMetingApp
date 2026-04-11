"use client";

import { useState } from "react";
import { Search, FolderOpen, SlidersHorizontal } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDetailDrawer } from "@/components/projects/ProjectDetailDrawer";
import { SkeletonList } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ProjectStatus, ProjectWithProfile } from "@/lib/types";

type StatusFilter = ProjectStatus | "all";
type SortOrder = "desc" | "asc";

export default function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [search, setSearch] = useState("");

  const { data: profile } = useProfile();
  const { data: projects, isLoading } = useProjects({
    statusFilter,
    sortOrder,
    search,
  });

  function handleViewDetails(project: ProjectWithProfile) {
    setSelectedProjectId(project.id);
  }

  return (
    <>
      <div className="space-y-5">
        {/* Page header */}
        <div className="rounded-[16px] border bg-card px-5 py-4 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Projecten</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle aanvragen en projecten
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 rounded-[16px] border bg-card p-3 shadow-[0_2px_10px_rgba(31,29,26,0.06)] sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Zoek projecten…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 opacity-60" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="new">Nieuw</SelectItem>
              <SelectItem value="in_progress">In behandeling</SelectItem>
              <SelectItem value="completed">Afgerond</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort order */}
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sorteer op" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Nieuwste eerst</SelectItem>
              <SelectItem value="asc">Oudste eerst</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && projects && (
          <p className="text-xs text-muted-foreground">
            {projects.length}{" "}
            {projects.length === 1 ? "project" : "projecten"} gevonden
          </p>
        )}

        {/* Project list */}
        {isLoading ? (
          <SkeletonList count={4} />
        ) : projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Geen projecten gevonden"
            description={
              search || statusFilter !== "all"
                ? "Probeer andere zoek- of filteropties."
                : "Er zijn nog geen projecten aangemaakt."
            }
          />
        )}
      </div>

      <ProjectDetailDrawer
        projectId={selectedProjectId}
        currentProfile={profile ?? null}
        onClose={() => setSelectedProjectId(null)}
      />
    </>
  );
}
