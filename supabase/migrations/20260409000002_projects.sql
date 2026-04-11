-- =============================================================================
-- Migration: 0002 – Projects
-- Purpose  : Core table. One row per customer survey/land-measurement request.
--             Created when the customer submits the public intake form.
-- =============================================================================

CREATE TABLE projects (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer details
  -- Denormalized intentionally: no separate customers table for MVP.
  -- Customers are one-time form submitters; no login required.
  customer_first_name   TEXT           NOT NULL,
  customer_last_name    TEXT           NOT NULL,
  customer_phone        TEXT           NOT NULL,   -- text, NOT numeric (preserves '+597...' format)

  -- Location
  -- Stored in full so the landmeter never has to look it up again.
  location_address      TEXT           NOT NULL,   -- human-readable street address
  latitude              NUMERIC(10, 7),            -- e.g. 5.8520000
  longitude             NUMERIC(10, 7),            -- e.g. -55.2038000
  neighborhood          TEXT,                      -- optional
  district              TEXT,                      -- optional (e.g. Paramaribo, Wanica)

  -- Workflow
  status                project_status NOT NULL DEFAULT 'new',
  assigned_landmeter_id UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  -- NULL  → project is unclaimed (status = 'new')
  -- non-NULL → project has been claimed (status = 'in_progress' or 'completed')

  -- Timestamps
  completed_at          TIMESTAMPTZ,               -- set when status transitions to 'completed'
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  projects                       IS 'One row per customer survey request. Created on public form submission.';
COMMENT ON COLUMN projects.customer_phone        IS 'Stored as text to support leading zeros and international formats (e.g. +597...).';
COMMENT ON COLUMN projects.assigned_landmeter_id IS 'NULL when unclaimed. Set when a landmeter claims the project.';
COMMENT ON COLUMN projects.completed_at          IS 'Populated when status transitions to ''completed''. NULL otherwise.';
COMMENT ON COLUMN projects.latitude              IS 'WGS84 decimal degrees. Up to 7 decimal places (~1 cm precision).';
COMMENT ON COLUMN projects.longitude             IS 'WGS84 decimal degrees. Up to 7 decimal places (~1 cm precision).';
