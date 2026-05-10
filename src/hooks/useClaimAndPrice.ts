import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { sanitizeString } from "@/lib/sanitize";

export interface ClaimAndPriceArgs {
  projectId: string;
  estimated_price: number;
  currency: string;
  estimated_duration_value: number;
  estimated_duration_unit: "hours" | "days";
  pricing_notes: string | null;
}

export function useClaimAndPrice() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      estimated_price,
      currency,
      estimated_duration_value,
      estimated_duration_unit,
      pricing_notes,
    }: ClaimAndPriceArgs) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Niet ingelogd");

      const now = new Date().toISOString();

      // Conditional transition: only succeed if still 'new'. .select() lets us
      // detect races and skip the history insert when a retry hits a row we
      // already transitioned ourselves.
      const { data: updated, error } = await supabase
        .from("projects")
        .update({
          status: "in_progress",
          assigned_landmeter_id: user.id,
          estimated_price,
          currency,
          estimated_duration_value,
          estimated_duration_unit,
          pricing_notes: pricing_notes ? sanitizeString(pricing_notes) : null,
          priced_at: now,
          priced_by_landmeter_id: user.id,
        })
        .eq("id", projectId)
        .eq("status", "new")
        .select("id");

      if (error) throw error;

      if (!updated || updated.length === 0) {
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
        // Already ours — keep the latest pricing fields by reapplying without
        // the status guard, but do not write another history row.
        const { error: priceUpdateError } = await supabase
          .from("projects")
          .update({
            estimated_price,
            currency,
            estimated_duration_value,
            estimated_duration_unit,
            pricing_notes: pricing_notes ? sanitizeString(pricing_notes) : null,
            priced_at: now,
            priced_by_landmeter_id: user.id,
          })
          .eq("id", projectId);
        if (priceUpdateError) throw priceUpdateError;
        return;
      }

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
