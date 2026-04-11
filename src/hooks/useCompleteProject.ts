import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface CompleteProjectArgs {
  projectId: string;
  landmeterId: string;
}

export function useCompleteProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, landmeterId }: CompleteProjectArgs) => {
      const completedAt = new Date().toISOString();

      const { error } = await supabase
        .from("projects")
        .update({
          status: "completed",
          completed_at: completedAt,
        })
        .eq("id", projectId);

      if (error) throw error;

      // Insert a status history record
      const { error: historyError } = await supabase
        .from("project_status_history")
        .insert({
          project_id: projectId,
          changed_by: landmeterId,
          from_status: "in_progress",
          to_status: "completed",
        });

      if (historyError) throw historyError;
    },
    onSuccess: (_data, { projectId }: CompleteProjectArgs) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}
