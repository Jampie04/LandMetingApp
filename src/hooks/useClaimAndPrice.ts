import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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

      const { error } = await supabase
        .from("projects")
        .update({
          status: "in_progress",
          assigned_landmeter_id: user.id,
          estimated_price,
          currency,
          estimated_duration_value,
          estimated_duration_unit,
          pricing_notes: pricing_notes ?? null,
          priced_at: now,
          priced_by_landmeter_id: user.id,
        })
        .eq("id", projectId);

      if (error) throw error;

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
