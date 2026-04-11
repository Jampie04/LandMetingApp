-- =============================================================================
-- Migration: 0006 – Row Level Security (RLS) Policies
-- Purpose  : MVP-safe RLS for Supabase. Simple rules that cover the product
--             requirements without over-engineering.
--
-- Key actors:
--   anon         → customer submitting the public intake form (unauthenticated)
--   authenticated → landmeter or admin logged in via Supabase Auth
--
-- NOTE: The anon INSERT on projects/documents assumes the public form calls
-- Supabase directly with the anon key. If you prefer an Edge Function with
-- the service_role key instead, remove the anon INSERT policies and restrict
-- inserts to service_role only.
-- =============================================================================


-- -------------------------
-- PROFILES
-- -------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any logged-in user can read all profiles.
-- Required so the dashboard can display landmeter names on projects.
CREATE POLICY "profiles: authenticated read all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users may only update their own profile row.
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- -------------------------
-- PROJECTS
-- -------------------------

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Customer (anon) can insert a new project via the public form.
CREATE POLICY "projects: anon insert"
  ON projects FOR INSERT
  TO anon
  WITH CHECK (true);

-- All authenticated users can read all projects.
CREATE POLICY "projects: authenticated read all"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can update projects.
-- Business rules (e.g. only claim if unassigned, only assigned landmeter can complete)
-- are enforced at the application/query layer, not the RLS layer, for MVP simplicity.
CREATE POLICY "projects: authenticated update"
  ON projects FOR UPDATE
  TO authenticated
  USING     (true)
  WITH CHECK (true);


-- -------------------------
-- PROJECT_DOCUMENTS
-- -------------------------

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Customer (anon) can upload documents as part of the form submission.
CREATE POLICY "project_documents: anon insert"
  ON project_documents FOR INSERT
  TO anon
  WITH CHECK (true);

-- All authenticated users can read all documents.
CREATE POLICY "project_documents: authenticated read all"
  ON project_documents FOR SELECT
  TO authenticated
  USING (true);


-- -------------------------
-- PROJECT_STATUS_HISTORY
-- -------------------------

ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the full audit trail.
CREATE POLICY "project_status_history: authenticated read all"
  ON project_status_history FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users (landmeters/admin) insert history entries.
-- The initial 'new' entry on project creation can be inserted by anon if needed;
-- adjust the policy below if so.
CREATE POLICY "project_status_history: authenticated insert"
  ON project_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- -------------------------
-- STORAGE BUCKET POLICY NOTE
-- -------------------------
-- Create a bucket named "project-documents" in Supabase Storage.
-- Recommended bucket policies (set via Supabase dashboard or storage API):
--   - anon  : INSERT only (upload during form submission)
--   - authenticated : SELECT (download/view documents)
-- Do NOT allow anon DELETE or UPDATE on storage objects.
