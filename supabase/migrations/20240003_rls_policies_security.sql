-- =============================================================================
-- Migration: RLS Policy Security Fixes
-- Purpose  : Replace overly permissive RLS policies with proper authorization
--
-- WARNING: Run this in Supabase SQL Editor after reviewing the policies below.
--          This replaces existing policies with more restrictive ones.
-- =============================================================================


-- -------------------------
-- PROJECTS
-- -------------------------

-- DROP old overly permissive policy
DROP POLICY IF EXISTS "projects: authenticated update" ON projects;

-- Only the assigned landmeter can update their own projects
CREATE POLICY "projects: assigned landmeter update"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_landmeter_id)
  WITH CHECK (auth.uid() = assigned_landmeter_id);

-- Only assigned landmeter can complete their own project
CREATE POLICY "projects: assigned landmeter complete"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_landmeter_id
    AND status = 'in_progress'
  )
  WITH CHECK (
    auth.uid() = assigned_landmeter_id
    AND status = 'completed'
  );

-- Keep the read-all policy for dashboard functionality
-- (This is acceptable for MVP as long as UPDATE is restricted)
DROP POLICY IF EXISTS "projects: authenticated read all" ON projects;
CREATE POLICY "projects: authenticated read all"
  ON projects FOR SELECT
  TO authenticated
  USING (true);


-- -------------------------
-- PROFILES
-- -------------------------

-- DROP old overly permissive policy
DROP POLICY IF EXISTS "profiles: authenticated read all" ON profiles;

-- Users can only read their own profile
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Keep the update-own policy (already secure)
DROP POLICY IF EXISTS "profiles: update own" ON profiles;
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- -------------------------
-- PROJECT_DOCUMENTS
-- -------------------------

-- DROP old overly permissive policy
DROP POLICY IF EXISTS "project_documents: authenticated read all" ON project_documents;

-- Users can only read documents for their assigned projects
CREATE POLICY "project_documents: read assigned projects"
  ON project_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_documents.project_id
      AND projects.assigned_landmeter_id = auth.uid()
    )
  );

-- Keep the insert policy for form submissions (allow both anon and authenticated)
DROP POLICY IF EXISTS "project_documents: anon insert" ON project_documents;
DROP POLICY IF EXISTS "project_documents: public insert" ON project_documents;
CREATE POLICY "project_documents: public insert"
  ON project_documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- -------------------------
-- PROJECT_STATUS_HISTORY
-- -------------------------

-- DROP old overly permissive policies
DROP POLICY IF EXISTS "project_status_history: authenticated read all" ON project_status_history;
DROP POLICY IF EXISTS "project_status_history: authenticated insert" ON project_status_history;

-- Users can only read history for their assigned projects
CREATE POLICY "project_status_history: read assigned projects"
  ON project_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_status_history.project_id
      AND projects.assigned_landmeter_id = auth.uid()
    )
  );

-- Users can insert history for projects they modify
CREATE POLICY "project_status_history: insert own changes"
  ON project_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_status_history.project_id
      AND projects.assigned_landmeter_id = auth.uid()
    )
  );
