"use client";

import { useState } from "react";
import {
  Phone,
  CheckCircle2,
  FileText,
  Loader2,
  ExternalLink,
  User,
  Download,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ClaimAndPriceDialog } from "./ClaimAndPriceDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatFileSize, buildMapsUrl } from "@/lib/utils";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { useClaimAndPrice } from "@/hooks/useClaimAndPrice";
import { useCompleteProject } from "@/hooks/useCompleteProject";
import type { Profile } from "@/lib/types";

interface ProjectDetailDrawerProps {
  projectId: string | null;
  currentProfile: Profile | null;
  onClose: () => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export function ProjectDetailDrawer({
  projectId,
  currentProfile,
  onClose,
}: ProjectDetailDrawerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  const { data, isLoading } = useProjectDetail(projectId);
  const claimAndPrice = useClaimAndPrice();
  const completeProject = useCompleteProject();

  const project = data?.project ?? null;
  const documents = data?.documents ?? [];

  const isOpen = !!projectId;
  const currentUserId = currentProfile?.id ?? null;

  const canClaim =
    project?.status === "new" && project.assigned_landmeter_id === null;

  const canComplete =
    project?.status === "in_progress" &&
    project.assigned_landmeter_id === currentUserId;

  async function handleClaimAndPrice(values: {
    estimated_price: number;
    currency: string;
    estimated_duration_value: number;
    estimated_duration_unit: "hours" | "days";
    pricing_notes: string | null;
  }) {
    if (!project || !currentUserId) return;
    try {
      await claimAndPrice.mutateAsync({
        projectId: project.id,
        landmeterId: currentUserId,
        ...values,
      });
      toast.success("Project opgenomen en prijs ingesteld.");
      setClaimDialogOpen(false);
    } catch {
      toast.error("Kon project niet oppakken. Probeer opnieuw.");
    }
  }

  async function handleComplete() {
    if (!project || !currentUserId) return;
    try {
      await completeProject.mutateAsync({
        projectId: project.id,
        landmeterId: currentUserId,
      });
      toast.success("Project afgerond.");
      setConfirmOpen(false);
    } catch {
      toast.error("Kon project niet afronden. Probeer opnieuw.");
    }
  }

  const mapsUrl = project
    ? buildMapsUrl(project.latitude, project.longitude)
    : null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto flex flex-col p-0"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b bg-card/90 backdrop-blur">
            <div className="flex items-center justify-between pr-6">
              <SheetTitle className="font-heading text-lg">Projectdetails</SheetTitle>
              {project && <StatusBadge status={project.status} />}
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-background/60">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            ) : project ? (
              <>
                {/* Customer info */}
                <section className="space-y-3 rounded-2xl border bg-secondary/40 p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Klantgegevens
                  </h3>
                  <DetailRow
                    label="Naam"
                    value={`${project.customer_first_name} ${project.customer_last_name}`}
                  />
                  <DetailRow
                    label="Telefoonnummer"
                    value={
                      <a
                        href={`tel:${project.customer_phone}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {project.customer_phone}
                      </a>
                    }
                  />
                </section>

                {/* Location */}
                <section className="space-y-3 rounded-2xl border bg-secondary/40 p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Locatie
                  </h3>
                  <DetailRow
                    label="Adres"
                    value={project.location_address}
                  />
                  {project.neighborhood && (
                    <DetailRow label="Wijk" value={project.neighborhood} />
                  )}
                  {project.district && (
                    <DetailRow label="District" value={project.district} />
                  )}
                  {(project.latitude || project.longitude) && (
                    <DetailRow
                      label="Coördinaten"
                      value={
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {project.latitude}, {project.longitude}
                          </span>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open in Maps
                            </a>
                          )}
                        </span>
                      }
                    />
                  )}
                </section>

                {/* Workflow */}
                <section className="space-y-3 rounded-2xl border bg-secondary/40 p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Workflow
                  </h3>
                  <DetailRow
                    label="Aangemaakt op"
                    value={formatDate(project.created_at)}
                  />
                  {project.profiles && (
                    <DetailRow
                      label="Behandelaar"
                      value={
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {project.profiles.full_name}
                        </span>
                      }
                    />
                  )}
                  {project.completed_at && (
                    <DetailRow
                      label="Afgerond op"
                      value={
                        <span className="flex items-center gap-1 text-success font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {formatDate(project.completed_at)}
                        </span>
                      }
                    />
                  )}
                </section>

                {/* Pricing */}
                {project.estimated_price !== null && (
                  <section className="space-y-3 rounded-2xl border bg-secondary/40 p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Prijsstelling
                    </h3>
                    <DetailRow
                      label="Geschatte prijs"
                      value={
                        <span className="font-semibold text-foreground">
                          {project.currency}{" "}
                          {Number(project.estimated_price).toLocaleString("nl-SR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      }
                    />
                    {project.estimated_duration_value !== null &&
                      project.estimated_duration_unit && (
                        <DetailRow
                          label="Geschatte duur"
                          value={`${project.estimated_duration_value} ${
                            project.estimated_duration_unit === "hours"
                              ? "uur"
                              : "dagen"
                          }`}
                        />
                      )}
                    {project.pricing_notes && (
                      <DetailRow label="Opmerking" value={project.pricing_notes} />
                    )}
                    {project.priced_by_profile && (
                      <DetailRow
                        label="Prijs ingesteld door"
                        value={
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {project.priced_by_profile.full_name}
                          </span>
                        }
                      />
                    )}
                    {project.priced_at && (
                      <DetailRow
                        label="Prijs ingesteld op"
                        value={formatDate(project.priced_at)}
                      />
                    )}
                  </section>
                )}

                {/* Documents */}
                {documents.length > 0 && (
                  <>
                    <section className="space-y-3 rounded-2xl border bg-secondary/40 p-4">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Documenten ({documents.length})
                      </h3>
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-2 p-3 rounded-xl border border-border/80 bg-card"
                          >
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.mime_type ?? "Onbekend type"} ·{" "}
                                {formatFileSize(doc.file_size_bytes)}
                              </p>
                            </div>
                            {doc.download_url ? (
                              <a
                                href={doc.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={doc.file_name}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Geen link
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </>
            ) : null}
          </div>

          {/* Actions footer */}
          {project && (canClaim || canComplete) && (
            <div className="px-6 py-4 border-t bg-card/90 backdrop-blur">
              {canClaim && (
                <Button
                  className="w-full"
                  onClick={() => setClaimDialogOpen(true)}
                  disabled={claimAndPrice.isPending}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Oppakken &amp; prijs instellen
                </Button>
              )}
              {canComplete && (
                <Button
                  className="w-full bg-success hover:bg-success/90 text-white"
                  onClick={() => setConfirmOpen(true)}
                  disabled={completeProject.isPending}
                >
                  {completeProject.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Bezig…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Afronden
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Claim + pricing dialog */}
      <ClaimAndPriceDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        onConfirm={handleClaimAndPrice}
        isPending={claimAndPrice.isPending}
      />

      {/* Confirmation dialog for "Afronden" */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Project afronden?</DialogTitle>
            <DialogDescription>
              Weet u zeker dat de meting volledig is afgerond? Deze actie kan
              niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={completeProject.isPending}
            >
              Annuleren
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-white"
              onClick={handleComplete}
              disabled={completeProject.isPending}
            >
              {completeProject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Bezig…
                </>
              ) : (
                "Ja, afronden"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
