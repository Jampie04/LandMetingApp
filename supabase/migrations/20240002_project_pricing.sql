-- Migration: add pricing fields to projects table
-- Run manually in Supabase SQL editor or via supabase db push

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS estimated_price      numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency             text NOT NULL DEFAULT 'SRD',
  ADD COLUMN IF NOT EXISTS estimated_duration_value integer,
  ADD COLUMN IF NOT EXISTS estimated_duration_unit  text,
  ADD COLUMN IF NOT EXISTS pricing_notes        text,
  ADD COLUMN IF NOT EXISTS priced_at            timestamptz,
  ADD COLUMN IF NOT EXISTS priced_by_landmeter_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Check constraints
ALTER TABLE projects
  ADD CONSTRAINT chk_estimated_price_positive
    CHECK (estimated_price IS NULL OR estimated_price > 0),
  ADD CONSTRAINT chk_estimated_duration_value_positive
    CHECK (estimated_duration_value IS NULL OR estimated_duration_value > 0),
  ADD CONSTRAINT chk_estimated_duration_unit_valid
    CHECK (estimated_duration_unit IS NULL OR estimated_duration_unit IN ('hours', 'days')),
  ADD CONSTRAINT chk_currency_nonempty
    CHECK (char_length(trim(currency)) > 0);

-- RLS: existing authenticated-user UPDATE policy already covers these columns
-- because it targets the entire row. No new policy needed if your current
-- policy allows landmeters to update projects they are claiming.
-- If you have a restrictive column-level policy, add the new columns there.
