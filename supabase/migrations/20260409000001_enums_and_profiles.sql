-- =============================================================================
-- Migration: 0001 – Enums and Profiles
-- Purpose  : Define app-wide enums and the profiles table, which extends
--             Supabase auth.users with landmeter-specific metadata.
-- =============================================================================

-- -------------------------
-- ENUMS
-- -------------------------

-- Roles kept minimal for MVP. Extend later (e.g. 'supervisor', 'viewer').
CREATE TYPE user_role AS ENUM ('landmeter', 'admin');

-- Project lifecycle states.
CREATE TYPE project_status AS ENUM ('new', 'in_progress', 'completed');


-- -------------------------
-- PROFILES
-- One row per auth.users entry.
-- Created automatically via trigger on auth.users INSERT.
-- -------------------------

CREATE TABLE profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT        NOT NULL,
  phone_number   TEXT,                              -- stored as text, not numeric
  role           user_role   NOT NULL DEFAULT 'landmeter',
  is_active      BOOLEAN     NOT NULL DEFAULT true, -- soft-disable without deleting auth user
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  profiles              IS 'App-specific user metadata. One row per Supabase auth.users entry.';
COMMENT ON COLUMN profiles.role        IS 'MVP roles: landmeter (default) or admin. Extend enum later as needed.';
COMMENT ON COLUMN profiles.is_active   IS 'Set false to disable login access without removing the auth account.';
COMMENT ON COLUMN profiles.phone_number IS 'Stored as text to support international prefixes and leading zeros.';


-- -------------------------
-- AUTO-CREATE PROFILE ON SIGN-UP
-- Fires whenever a new row is inserted into auth.users (Supabase Auth).
-- full_name is seeded from user_metadata if provided at sign-up.
-- -------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
