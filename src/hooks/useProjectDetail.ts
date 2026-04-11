import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectDetail, ProjectWithProfile, ProjectDocument } from "@/lib/types";

export function useProjectDetail(projectId: string | null) {
  const supabase = createClient();
  const storageBucket =
    process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "project-documents";

  return useQuery<ProjectDetail | null>({
    queryKey: ["project", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [projectRes, docsRes] = await Promise.all([
        supabase
          .from("projects")
          .select(`*, profiles:assigned_landmeter_id(full_name, phone_number), priced_by_profile:priced_by_landmeter_id(full_name)`)
          .eq("id", projectId!)
          .single(),
        supabase
          .from("project_documents")
          .select("*")
          .eq("project_id", projectId!)
          .order("uploaded_at", { ascending: true }),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (docsRes.error) throw docsRes.error;

      const docsWithDownloadUrl = await Promise.all(
        ((docsRes.data ?? []) as ProjectDocument[]).map(async (doc) => {
          let downloadUrl: string | null = null;

          const { data: signedData } = await supabase.storage
            .from(storageBucket)
            .createSignedUrl(doc.file_path, 60 * 60 * 24);

          if (signedData?.signedUrl) {
            downloadUrl = signedData.signedUrl;
          } else {
            const { data: publicData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(doc.file_path);
            downloadUrl = publicData?.publicUrl ?? null;
          }

          return {
            ...doc,
            download_url: downloadUrl,
          };
        })
      );

      return {
        project: projectRes.data as ProjectWithProfile,
        documents: docsWithDownloadUrl,
      };
    },
  });
}
