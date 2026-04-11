-- =============================================================================
-- Migration: 0005 – Indexes and Triggers
-- Purpose  : Performance indexes for the most common dashboard queries,
--             and a shared trigger function to auto-maintain updated_at.
-- =============================================================================


-- -------------------------
-- updated_at TRIGGER FUNCTION
-- Shared by all tables that carry an updated_at column.
-- -------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to profiles
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply to projects
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -------------------------
-- INDEXES
-- Chosen to cover the exact queries listed in the app requirements.
-- -------------------------

-- Home page: 5 most recent projects (ORDER BY created_at DESC LIMIT 5)
CREATE INDEX idx_projects_created_at
  ON projects (created_at DESC);

-- Projects page: filter by status
CREATE INDEX idx_projects_status
  ON projects (status);

-- Home page widget + dashboard: in-progress projects for a specific landmeter
-- Partial index – only indexes rows where a landmeter is assigned.
CREATE INDEX idx_projects_assigned_landmeter
  ON projects (assigned_landmeter_id)
  WHERE assigned_landmeter_id IS NOT NULL;

-- Composite: landmeter + status – covers "in_progress for landmeter X" in one scan
CREATE INDEX idx_projects_landmeter_status
  ON projects (assigned_landmeter_id, status);

-- Documents: look up all documents for a project
CREATE INDEX idx_project_documents_project_id
  ON project_documents (project_id);

-- Status history: chronological history for a project
CREATE INDEX idx_status_history_project_id
  ON project_status_history (project_id, changed_at DESC);
