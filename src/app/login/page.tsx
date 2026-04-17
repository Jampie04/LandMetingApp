"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Voer een geldig e-mailadres in"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<number>(0);

  const RATE_LIMIT_MS = 2000; // 2 seconds between attempts (client-side, additional protection server-side by Supabase)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    const now = Date.now();
    if (now - lastAttempt < RATE_LIMIT_MS) {
      setServerError("Wacht even voordat u opnieuw probeert.");
      return;
    }
    setLastAttempt(now);

    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Supabase Auth provides built-in rate limiting and brute force protection
      // Generic error message to prevent user enumeration
      setServerError("Ongeldig e-mailadres of wachtwoord.");
      return;
    }

    router.push("/dashboard/home");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <img src="/brand/grongmarki-icon.svg" alt="GrongMarki" className="h-14 w-14" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            GrongMarki
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grond helder in beeld.
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[18px] border bg-card p-8 shadow-[0_12px_34px_rgba(31,29,26,0.1)]">
          <h2 className="mb-6 font-heading text-xl font-semibold text-foreground">
            Inloggen
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                E-mailadres
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="naam@landmeting.sr"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Wachtwoord
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-[14px] border border-danger/30 bg-danger/10 px-3 py-2">
                <p className="text-sm text-danger">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Bezig met inloggen…
                </>
              ) : (
                "Inloggen"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Geen toegang? Neem contact op met de beheerder.
        </p>
      </div>
    </div>
  );
}
