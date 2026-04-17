"use client";

import { useState } from "react";
import { Search, FolderOpen, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
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

const PAGE_SIZE = 5;

export default function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  function handleStatusFilter(v: StatusFilter) { setStatusFilter(v); setPage(1); }
  function handleSortOrder(v: SortOrder) { setSortOrder(v); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  const { data: profile } = useProfile();
  const { data: projects, isLoading } = useProjects({
    statusFilter,
    sortOrder,
    search,
  });

  const totalCount = projects?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProjects = (projects ?? []).slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

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
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => handleStatusFilter(v as StatusFilter)}
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
            onValueChange={(v) => handleSortOrder(v as SortOrder)}
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
            {totalCount === 0
              ? "Geen projecten gevonden"
              : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, totalCount)} van ${totalCount} ${totalCount === 1 ? "project" : "projecten"}`}
          </p>
        )}

        {/* Project list */}
        {isLoading ? (
          <SkeletonList count={4} />
        ) : paginatedProjects.length > 0 ? (
          <div className="space-y-3">
            {paginatedProjects.map((project) => (
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

        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center justify-between rounded-[16px] border bg-card px-4 py-3 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Vorige
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    p === safePage
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              Volgende
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
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
