import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface ClaimProjectArgs {
  projectId: string;
  landmeterId: string;
}

export function useClaimProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, landmeterId }: ClaimProjectArgs) => {
      const { error } = await supabase
        .from("projects")
        .update({
          status: "in_progress",
          assigned_landmeter_id: landmeterId,
        })
        .eq("id", projectId);

      if (error) throw error;

      // Insert a status history record
      const { error: historyError } = await supabase
        .from("project_status_history")
        .insert({
          project_id: projectId,
          changed_by: landmeterId,
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
