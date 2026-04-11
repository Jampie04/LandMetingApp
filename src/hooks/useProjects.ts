import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectStatus, ProjectWithProfile } from "@/lib/types";

interface UseProjectsOptions {
  statusFilter: ProjectStatus | "all";
  sortOrder: "desc" | "asc";
  search: string;
}

export function useProjects({
  statusFilter,
  sortOrder,
  search,
}: UseProjectsOptions) {
  const supabase = createClient();

  return useQuery<ProjectWithProfile[]>({
    queryKey: ["projects", "list", statusFilter, sortOrder, search],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select(`*, profiles:assigned_landmeter_id(full_name, phone_number)`)
        .order("created_at", { ascending: sortOrder === "asc" });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          [
            `customer_first_name.ilike.${term}`,
            `customer_last_name.ilike.${term}`,
            `customer_phone.ilike.${term}`,
            `location_address.ilike.${term}`,
            `district.ilike.${term}`,
            `neighborhood.ilike.${term}`,
          ].join(",")
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProjectWithProfile[];
    },
  });
}
