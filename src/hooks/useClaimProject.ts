import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface ClaimProjectArgs {
  projectId: string;
}

export function useClaimProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId }: ClaimProjectArgs) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Niet ingelogd");

      // Conditional update: only transition if the project is still 'new'.
      // .select() returns the rows actually updated so we can detect races
      // and skip the history insert on retries (idempotent).
      const { data: updated, error } = await supabase
        .from("projects")
        .update({
          status: "in_progress",
          assigned_landmeter_id: user.id,
        })
        .eq("id", projectId)
        .eq("status", "new")
        .select("id");

      if (error) throw error;

      if (!updated || updated.length === 0) {
        // No row transitioned. Either someone else claimed it, or a previous
        // attempt by us already succeeded at this step. Inspect to decide.
        const { data: current, error: readError } = await supabase
          .from("projects")
          .select("assigned_landmeter_id, status")
          .eq("id", projectId)
          .maybeSingle();
        if (readError) throw readError;
        if (!current) throw new Error("Project niet gevonden");
        if (current.assigned_landmeter_id !== user.id) {
          throw new Error("Dit project is al door iemand anders geclaimd.");
        }
        // Already ours from a previous attempt — do not insert another history row.
        return;
      }

      // Fresh transition — write the audit log entry.
      const { error: historyError } = await supabase
        .from("project_status_history")
        .insert({
          project_id: projectId,
          changed_by: user.id,
          from_status: "new",
          to_status: "in_progress",
        });

      if (historyError) throw historyError;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}
