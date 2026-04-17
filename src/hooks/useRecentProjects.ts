import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithProfile } from "@/lib/types";

export function useRecentProjects() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Realtime: re-fetch when any project is inserted or updated (e.g., claimed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const channel = supabase
      .channel("recent-new-projects")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        () => queryClient.invalidateQueries({ queryKey: ["projects", "recent"] })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        () => queryClient.invalidateQueries({ queryKey: ["projects", "recent"] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return useQuery<ProjectWithProfile[]>({
    queryKey: ["projects", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`*, profiles:assigned_landmeter_id(full_name, phone_number)`)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as ProjectWithProfile[];
    },
    refetchInterval: 30_000,
  });
}
