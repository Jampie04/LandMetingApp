-- =============================================================================
-- Migration: 20260413000002 – RLS Policy Cleanup
-- Purpose  : Fix remaining issues found after applying 20260413000001:
--
--   1. CRITICAL – Drop duplicate/over-permissive INSERT policies on projects
--                 ("public insert" allowed authenticated users to insert;
--                  "public can submit" was a redundant second anon policy)
--   2. HIGH     – Admin users had no visibility into project_documents or
--                 project_status_history (read policies only checked the
--                 assigned landmeter, never the admin role)
--   3. MEDIUM   – Tighten "authenticated read all" on projects so landmeters
--                 only see new (claimable) projects + their own assigned ones;
--                 admins retain full visibility
--
-- Requires: is_active_user() and current_user_role() from migration 20260413000001
-- =============================================================================


-- -------------------------
-- PROJECTS: Fix INSERT policies
-- Drop the duplicate anon policy and the over-permissive anon+authenticated one.
-- Replace with a single, clean anon-only policy.
-- -------------------------

DROP POLICY IF EXISTS "projects: public insert" ON projects;
DROP POLICY IF EXISTS "projects: anon insert" ON projects;
DROP POLICY IF EXISTS "public can submit project requests" ON projects;

CREATE POLICY "projects: public insert"
  ON projects FOR INSERT
  TO anon
  WITH CHECK (
    status = 'new'
    AND assigned_landmeter_id IS NULL
  );


-- -------------------------
-- PROJECTS: Tighten SELECT policy
-- All authenticated users could previously read every project row (qual: true),
-- exposing customer PII to all landmeters regardless of assignment.
--
-- New rules:
--   admin        → all projects
--   landmeter    → new (unclaimed, so they can claim them)
--                  + their own assigned projects
-- -------------------------

DROP POLICY IF EXISTS "projects: authenticated read all" ON projects;

CREATE POLICY "projects: authenticated read"
  ON projects FOR SELECT
  TO authenticated
  USING (
    current_user_role() = 'admin'
    OR status = 'new'
    OR assigned_landmeter_id = auth.uid()
  );


-- -------------------------
-- PROJECT_DOCUMENTS: Add admin read access
-- The existing policy only allowed reading docs for personally assigned projects.
-- Admins need full read access for oversight.
-- -------------------------

DROP POLICY IF EXISTS "project_documents: read assigned projects" ON project_documents;

CREATE POLICY "project_documents: read assigned projects"
  ON project_documents FOR SELECT
  TO authenticated
  USING (
    current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_documents.project_id
        AND projects.assigned_landmeter_id = auth.uid()
    )
  );


-- -------------------------
-- PROJECT_STATUS_HISTORY: Add admin read access
-- Same reasoning as project_documents above.
-- -------------------------

DROP POLICY IF EXISTS "project_status_history: read assigned projects" ON project_status_history;

CREATE POLICY "project_status_history: read assigned projects"
  ON project_status_history FOR SELECT
  TO authenticated
  USING (
    current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_status_history.project_id
        AND projects.assigned_landmeter_id = auth.uid()
    )
  );
