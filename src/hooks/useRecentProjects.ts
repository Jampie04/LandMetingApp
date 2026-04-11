import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithProfile } from "@/lib/types";

export function useRecentProjects() {
  const supabase = createClient();

  return useQuery<ProjectWithProfile[]>({
    queryKey: ["projects", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`*, profiles:assigned_landmeter_id(full_name, phone_number)`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as ProjectWithProfile[];
    },
  });
}
