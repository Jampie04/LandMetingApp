"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, CheckCircle2, Loader2, X, FileText, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize } from "@/lib/utils";
import type { PickedLocation } from "@/components/shared/LocationPicker";

const LocationPicker = dynamic(
  () => import("@/components/shared/LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full rounded-xl border bg-secondary animate-pulse" />
    ),
  }
);

const schema = z.object({
  customer_first_name: z.string().min(1, "Voornaam is verplicht"),
  customer_last_name: z.string().min(1, "Achternaam is verplicht"),
  customer_phone: z
    .string()
    .min(7, "Vul een geldig telefoonnummer in")
    .regex(/^[+\d\s\-()]+$/, "Ongeldig telefoonnummer"),
  location_address: z.string().min(5, "Adres is verplicht"),
  neighborhood: z.string().optional(),
  district: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UploadedDocument {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function AanvraagForm() {
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const selected = Array.from(e.target.files ?? []);

    const invalid = selected.filter(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE
    );
    if (invalid.length > 0) {
      setFileError(
        "Alleen PDF, JPEG, PNG en WEBP bestanden tot 10 MB zijn toegestaan."
      );
      return;
    }

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const added = selected.filter((f) => !existing.has(f.name));
      return [...prev, ...added];
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleLocationChange(loc: PickedLocation) {
    setLocationError(null);
    setPickedLocation(loc);
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    if (!pickedLocation) {
      setLocationError("Pin de exacte locatie op de kaart.");
      setIsSubmitting(false);
      return;
    }

    if (files.length === 0) {
      setFileError("Upload minimaal één document voordat u indient.");
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const storageBucket =
        process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "project-documents";

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          customer_first_name: values.customer_first_name.trim(),
          customer_last_name: values.customer_last_name.trim(),
          customer_phone: values.customer_phone.trim(),
          location_address: values.location_address.trim(),
          latitude: pickedLocation?.lat ?? null,
          longitude: pickedLocation?.lng ?? null,
          neighborhood: values.neighborhood?.trim() || null,
          district: values.district?.trim() || null,
          status: "new",
          assigned_landmeter_id: null,
        })
        .select("id")
        .single();

      if (projectError) throw projectError;

      const projectId = project.id as string;

      const persistedDocuments = await Promise.all(
        files.map(async (file): Promise<UploadedDocument> => {
          const filePath = `${projectId}/${Date.now()}_${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from(storageBucket)
            .upload(filePath, file, { upsert: false });

          if (uploadError) {
            throw new Error(`Bestand upload mislukt (${file.name}): ${uploadError.message}`);
          }

          const { error: documentInsertError } = await supabase
            .from("project_documents")
            .insert({
              project_id: projectId,
              file_name: file.name,
              file_path: filePath,
              mime_type: file.type,
              file_size_bytes: file.size,
            });

          if (documentInsertError) {
            throw new Error(
              `Documentregistratie mislukt (${file.name}): ${documentInsertError.message}`
            );
          }

          let downloadUrl: string | null = null;
          const { data: signedData } = await supabase.storage
            .from(storageBucket)
            .createSignedUrl(filePath, 60 * 60 * 24 * 7);

          if (signedData?.signedUrl) {
            downloadUrl = signedData.signedUrl;
          } else {
            const { data: publicData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(filePath);
            downloadUrl = publicData?.publicUrl ?? null;
          }

          return {
            fileName: file.name,
            filePath,
            fileSize: file.size,
            mimeType: file.type,
            downloadUrl,
          };
        })
      );

      setUploadedDocuments(persistedDocuments);

      setSubmitted(true);
      reset();
      setFiles([]);
      setPickedLocation(null);
      setFileError(null);
      setLocationError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Er is een onbekende fout opgetreden.";

      if (/Bestand upload mislukt/i.test(message)) {
        setSubmitError(
          "Document upload mislukt. Controleer of de bucket bestaat en of `anon` uploadrechten heeft op `project-documents`."
        );
      } else if (/Documentregistratie mislukt/i.test(message)) {
        setSubmitError(
          "Document is geüpload maar metadata kon niet worden opgeslagen. Controleer RLS op `project_documents`."
        );
      } else if (/row-level security|42501/i.test(message)) {
        setSubmitError(
          "Database permissies zijn niet correct ingesteld (RLS). Controleer `anon INSERT` policy op `projects` en `project_documents`."
        );
      } else {
        setSubmitError(
          "Uw aanvraag kon niet worden ingediend. Probeer het opnieuw. (" +
            message +
            ")"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-[18px] border bg-card p-8 text-center shadow-[0_12px_34px_rgba(31,29,26,0.1)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-foreground">
            Aanvraag ingediend!
          </h2>
          <p className="text-sm text-muted-foreground">
            Uw aanvraag is succesvol ontvangen. Een landmeter neemt zo spoedig
            mogelijk contact met u op via het opgegeven telefoonnummer.
          </p>
          <Button className="w-full mt-2" onClick={() => setSubmitted(false)}>
            Nieuwe aanvraag indienen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-brand-dark text-sidebar-foreground px-4 py-4 border-b border-sidebar-border/80">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm tracking-wide">LandMeting Suriname</p>
            <p className="text-xs text-sidebar-muted">Aanvraagformulier</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Meting aanvragen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vul uw gegevens in. Een landmeter neemt contact met u op.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal info */}
          <section className="rounded-[16px] border bg-card p-5 space-y-4 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Uw gegevens
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">
                  Voornaam <span className="text-brand-red">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="Eric"
                  {...register("customer_first_name")}
                />
                {errors.customer_first_name && (
                  <p className="text-xs text-danger">
                    {errors.customer_first_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name">
                  Achternaam <span className="text-brand-red">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Doerga"
                  {...register("customer_last_name")}
                />
                {errors.customer_last_name && (
                  <p className="text-xs text-danger">
                    {errors.customer_last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Telefoonnummer(WhatsApp) <span className="text-brand-red">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+597 700 0000"
                {...register("customer_phone")}
              />
              {errors.customer_phone && (
                <p className="text-xs text-danger">
                  {errors.customer_phone.message}
                </p>
              )}
            </div>
          </section>

          {/* Location */}
          <section className="rounded-[16px] border bg-card p-5 space-y-4 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Locatie van de meting
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="address">
                Adres <span className="text-brand-red">*</span>
              </Label>
              <Textarea
                id="address"
                placeholder="Indira Ghandiweg 77"
                rows={2}
                {...register("location_address")}
              />
              {errors.location_address && (
                <p className="text-xs text-danger">
                  {errors.location_address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="neighborhood">Wijk</Label>
                <Input
                  id="neighborhood"
                  placeholder="Latour"
                  {...register("neighborhood")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  placeholder="Paramaribo"
                  {...register("district")}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Exacte locatie pinnen <span className="text-brand-red">*</span>
              </p>
              <LocationPicker
                value={pickedLocation}
                onChange={handleLocationChange}
              />
              {locationError && (
                <p className="text-xs text-danger mt-2">{locationError}</p>
              )}
            </div>
          </section>

          {/* Documents */}
          <section className="rounded-[16px] border bg-card p-5 space-y-4 shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Documenten <span className="text-brand-red">*</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload minimaal één document (eigendomsbewijs, kadasterkaart,
                etc.). Toegestaan: PDF, JPEG, PNG, WEBP — max 10 MB per bestand.
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/80"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="text-muted-foreground hover:text-danger transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fileError && (
              <p className="text-xs text-danger">{fileError}</p>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full justify-center px-4 py-3 border-2 border-dashed border-input rounded-xl text-sm text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
            >
              <Upload className="w-4 h-4" />
              Bestand toevoegen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </section>

          {submitError && (
            <div className="rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {submitError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Bezig met indienen…
              </>
            ) : (
              "Aanvraag indienen"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Door uw aanvraag in te dienen gaat u akkoord met de verwerking van
            uw gegevens voor de uitvoering van de meting.
          </p>
        </form>
      </main>
    </div>
  );
}
