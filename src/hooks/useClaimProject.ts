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

      const { error } = await supabase
        .from("projects")
        .update({
          status: "in_progress",
          assigned_landmeter_id: user.id,
        })
        .eq("id", projectId);

      if (error) throw error;

      // Insert a status history record
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
