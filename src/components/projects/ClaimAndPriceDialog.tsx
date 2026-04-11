"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  estimated_price: z
    .string()
    .min(1, "Verplicht")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Voer een geldig bedrag in (> 0)",
    }),
  currency: z.string().min(1, "Verplicht"),
  estimated_duration_value: z
    .string()
    .min(1, "Verplicht")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v)), {
      message: "Voer een geheel getal in (> 0)",
    }),
  estimated_duration_unit: z.enum(["hours", "days"], {
    required_error: "Selecteer een eenheid",
  }),
  pricing_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClaimAndPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: {
    estimated_price: number;
    currency: string;
    estimated_duration_value: number;
    estimated_duration_unit: "hours" | "days";
    pricing_notes: string | null;
  }) => Promise<void>;
  isPending: boolean;
}

export function ClaimAndPriceDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ClaimAndPriceDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: "SRD",
      estimated_duration_unit: undefined,
    },
  });

  const durationUnit = watch("estimated_duration_unit");

  async function onSubmit(values: FormValues) {
    await onConfirm({
      estimated_price: Number(values.estimated_price),
      currency: values.currency,
      estimated_duration_value: Number(values.estimated_duration_value),
      estimated_duration_unit: values.estimated_duration_unit,
      pricing_notes: values.pricing_notes?.trim() || null,
    });
    reset();
  }

  function handleOpenChange(open: boolean) {
    if (!isPending) {
      if (!open) reset();
      onOpenChange(open);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Oppakken &amp; prijs instellen</DialogTitle>
          <DialogDescription>
            Stel de prijs en geschatte duur in voor dit project. Na bevestiging
            wordt het project aan u toegewezen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Price + currency row */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
            <div className="space-y-1.5">
              <Label htmlFor="estimated_price">
                Geschatte prijs <span className="text-brand-red">*</span>
              </Label>
              <Input
                id="estimated_price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                {...register("estimated_price")}
              />
              {errors.estimated_price && (
                <p className="text-xs text-danger">{errors.estimated_price.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">
                Valuta <span className="text-brand-red">*</span>
              </Label>
              <Select
                defaultValue="SRD"
                onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
              >
                <SelectTrigger id="currency" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRD">SRD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-xs text-danger">{errors.currency.message}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
            <div className="space-y-1.5">
              <Label htmlFor="estimated_duration_value">
                Geschatte duur <span className="text-brand-red">*</span>
              </Label>
              <Input
                id="estimated_duration_value"
                type="number"
                min="1"
                step="1"
                placeholder="2"
                {...register("estimated_duration_value")}
              />
              {errors.estimated_duration_value && (
                <p className="text-xs text-danger">
                  {errors.estimated_duration_value.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estimated_duration_unit">
                Eenheid <span className="text-brand-red">*</span>
              </Label>
              <Select
                value={durationUnit}
                onValueChange={(v) =>
                  setValue("estimated_duration_unit", v as "hours" | "days", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="estimated_duration_unit" className="w-28">
                  <SelectValue placeholder="Kies…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Uren</SelectItem>
                  <SelectItem value="days">Dagen</SelectItem>
                </SelectContent>
              </Select>
              {errors.estimated_duration_unit && (
                <p className="text-xs text-danger">
                  {errors.estimated_duration_unit.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="pricing_notes">Opmerking</Label>
            <Textarea
              id="pricing_notes"
              placeholder="Optionele toelichting bij de prijs…"
              rows={3}
              {...register("pricing_notes")}
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Bezig…
                </>
              ) : (
                "Bevestigen"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
