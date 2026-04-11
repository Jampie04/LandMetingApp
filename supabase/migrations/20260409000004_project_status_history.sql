-- =============================================================================
-- Migration: 0004 – Project Status History
-- Purpose  : Immutable audit log of every status transition on a project.
--             One row per transition. Never updated, only inserted.
--             Useful for the dashboard, future reporting, and debugging.
-- =============================================================================

CREATE TABLE project_status_history (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Who triggered this transition.
  -- NULL = system/customer action (e.g. initial project creation via form).
  changed_by   UUID           REFERENCES profiles(id) ON DELETE SET NULL,

  from_status  project_status,           -- NULL on the very first entry (project creation)
  to_status    project_status NOT NULL,

  notes        TEXT,                     -- optional free-text (e.g. 'Claimed by Ravi')

  changed_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  project_status_history             IS 'Append-only log of project status transitions. Never modify existing rows.';
COMMENT ON COLUMN project_status_history.changed_by  IS 'Landmeter who triggered the change. NULL for system-generated entries (e.g. form submission).';
COMMENT ON COLUMN project_status_history.from_status IS 'Previous status. NULL on the initial creation entry.';
