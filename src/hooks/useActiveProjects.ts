import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithProfile } from "@/lib/types";

// Returns projects that are in_progress and assigned to the given landmeter.
export function useActiveProjects(landmeterId: string | null) {
  const supabase = createClient();

  return useQuery<ProjectWithProfile[]>({
    queryKey: ["projects", "active", landmeterId],
    enabled: !!landmeterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`*, profiles:assigned_landmeter_id(full_name, phone_number)`)
        .eq("status", "in_progress")
        .eq("assigned_landmeter_id", landmeterId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ProjectWithProfile[];
    },
  });
}
