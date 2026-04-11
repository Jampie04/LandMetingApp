"use client";

import { useState } from "react";
import { ClipboardList, Activity } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useRecentProjects } from "@/hooks/useRecentProjects";
import { useActiveProjects } from "@/hooks/useActiveProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDetailDrawer } from "@/components/projects/ProjectDetailDrawer";
import { SkeletonList } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ProjectWithProfile } from "@/lib/types";

export default function HomePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const { data: profile } = useProfile();
  const { data: recentProjects, isLoading: loadingRecent } =
    useRecentProjects();
  const { data: activeProjects, isLoading: loadingActive } = useActiveProjects(
    profile?.id ?? null
  );

  function handleViewDetails(project: ProjectWithProfile) {
    setSelectedProjectId(project.id);
  }

  return (
    <>
      <div className="space-y-8">
        {/* Page header */}
        <div className="rounded-[16px] border bg-card px-5 py-4 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Welkom,{" "}
            {profile?.full_name?.split(" ")[0] ?? "Landmeter"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overzicht van recente activiteit
          </p>
        </div>

        {/* Recent projects */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Recente aanvragen
            </h2>
            <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Laatste 5
            </span>
          </div>

          {loadingRecent ? (
            <SkeletonList count={3} />
          ) : recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Geen recente aanvragen"
              description="Nieuwe aanvragen van klanten verschijnen hier."
            />
          )}
        </section>

        {/* Active projects */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Mijn actieve projecten
            </h2>
          </div>

          {loadingActive ? (
            <SkeletonList count={2} />
          ) : activeProjects && activeProjects.length > 0 ? (
            <div className="space-y-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="Geen actieve projecten"
              description="Projecten die u oppakt verschijnen hier."
            />
          )}
        </section>
      </div>

      <ProjectDetailDrawer
        projectId={selectedProjectId}
        currentProfile={profile ?? null}
        onClose={() => setSelectedProjectId(null)}
      />
    </>
  );
}
