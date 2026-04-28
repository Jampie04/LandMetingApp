import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithProfile } from "@/lib/types";

// Returns the 5 most recently updated in-progress projects assigned to the given landmeter.
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
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as ProjectWithProfile[];
    },
  });
}
