-- =============================================================================
-- Migration: 20260413000001 – Security Hardening
-- Purpose  : Fix critical and high-severity RLS vulnerabilities discovered
--             in security audit (April 2026).
--
-- Fixes applied:
--   1. Helper functions: is_active_user(), current_user_role()
--   2. CRITICAL – Add claim policy: new projects had NO valid UPDATE path
--   3. CRITICAL – Enforce is_active on all sensitive UPDATE/INSERT policies
--   4. HIGH     – Replace wide-open project_documents INSERT with targeted policies
--   5. HIGH     – Replace profiles read policy with role-aware version
--   6. LOW      – Validate full_name length in handle_new_user trigger
-- =============================================================================


-- -------------------------
-- HELPER FUNCTIONS
-- SECURITY DEFINER bypasses RLS, preventing infinite recursion when these
-- functions are referenced inside RLS policies on the same tables.
-- -------------------------

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM profiles WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$;


-- -------------------------
-- PROJECTS: Add missing claim policy
--
-- CRITICAL FIX: The existing UPDATE policies (assigned landmeter update/complete)
-- both use USING (auth.uid() = assigned_landmeter_id). For new projects where
-- assigned_landmeter_id IS NULL, this evaluates to NULL (falsy) — meaning no
-- one could ever claim a project. This policy fills that gap.
-- -------------------------

CREATE POLICY "projects: authenticated claim new"
  ON projects FOR UPDATE
  TO authenticated
  USING  (
    status = 'new'
    AND assigned_landmeter_id IS NULL
    AND is_active_user()
  )
  WITH CHECK (
    auth.uid() = assigned_landmeter_id
    AND status = 'in_progress'
    AND is_active_user()
  );


-- -------------------------
-- PROJECTS: Rebuild existing UPDATE policies with is_active guard
-- -------------------------

DROP POLICY IF EXISTS "projects: assigned landmeter update" ON projects;
CREATE POLICY "projects: assigned landmeter update"
  ON projects FOR UPDATE
  TO authenticated
  USING  (auth.uid() = assigned_landmeter_id AND is_active_user())
  WITH CHECK (auth.uid() = assigned_landmeter_id AND is_active_user());

DROP POLICY IF EXISTS "projects: assigned landmeter complete" ON projects;
CREATE POLICY "projects: assigned landmeter complete"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_landmeter_id
    AND status = 'in_progress'
    AND is_active_user()
  )
  WITH CHECK (
    auth.uid() = assigned_landmeter_id
    AND status = 'completed'
    AND is_active_user()
  );


-- -------------------------
-- PROJECT_DOCUMENTS: Replace wide-open INSERT with targeted policies
--
-- HIGH FIX: WITH CHECK (true) for both anon and authenticated allowed any
-- authenticated user to attach documents to any project they do not own.
-- -------------------------

DROP POLICY IF EXISTS "project_documents: public insert" ON project_documents;
DROP POLICY IF EXISTS "project_documents: anon insert" ON project_documents;
DROP POLICY IF EXISTS "project_documents: anon insert new projects" ON project_documents;
DROP POLICY IF EXISTS "project_documents: authenticated insert assigned" ON project_documents;

-- Anon: only for projects still at 'new' status (public form submission)
CREATE POLICY "project_documents: anon insert new projects"
  ON project_documents FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_documents.project_id
        AND status = 'new'
        AND assigned_landmeter_id IS NULL
    )
  );

-- Authenticated: only for their own assigned projects
CREATE POLICY "project_documents: authenticated insert assigned"
  ON project_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_documents.project_id
        AND assigned_landmeter_id = auth.uid()
    )
    AND is_active_user()
  );


-- -------------------------
-- PROJECT_STATUS_HISTORY: Add is_active guard to insert
-- -------------------------

DROP POLICY IF EXISTS "project_status_history: insert own changes" ON project_status_history;
CREATE POLICY "project_status_history: insert own changes"
  ON project_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_status_history.project_id
        AND projects.assigned_landmeter_id = auth.uid()
    )
    AND is_active_user()
  );


-- -------------------------
-- PROFILES: Replace 'read own' with role-aware policy
--
-- HIGH FIX: 'read own' broke dashboard FK joins (profiles on projects returned
-- NULL for other landmeters). current_user_role() is SECURITY DEFINER to avoid
-- self-referential RLS recursion.
--
-- Readable by:
--   - The user themselves (always)
--   - Admins (all profiles)
--   - Any profile referenced as assigned_landmeter_id on a project
--     (required for dashboard JOIN: projects -> profiles)
-- -------------------------

DROP POLICY IF EXISTS "profiles: read own" ON profiles;
DROP POLICY IF EXISTS "profiles: authenticated read" ON profiles;

CREATE POLICY "profiles: authenticated read"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR current_user_role() = 'admin'
    OR id IN (
      SELECT DISTINCT assigned_landmeter_id
      FROM projects
      WHERE assigned_landmeter_id IS NOT NULL
    )
  );


-- -------------------------
-- PROFILES: Add is_active guard to own-update policy
-- -------------------------

DROP POLICY IF EXISTS "profiles: update own" ON profiles;
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  TO authenticated
  USING     (auth.uid() = id AND is_active_user())
  WITH CHECK (auth.uid() = id AND is_active_user());


-- -------------------------
-- HANDLE_NEW_USER: Validate full_name length
--
-- LOW FIX: raw_user_meta_data is client-supplied and unvalidated.
-- Truncate to 100 characters to prevent oversized input.
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
    LEFT(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)), 100)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
