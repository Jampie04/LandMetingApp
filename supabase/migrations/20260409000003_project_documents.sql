-- =============================================================================
-- Migration: 0003 – Project Documents
-- Purpose  : Metadata for files uploaded by the customer during form submission.
--             Actual file binaries live in Supabase Storage; this table tracks
--             references and metadata only.
-- =============================================================================

CREATE TABLE project_documents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  file_name        TEXT        NOT NULL,  -- original filename as provided by the customer
  file_path        TEXT        NOT NULL,  -- path within the Supabase Storage bucket
                                          -- convention: projects/{project_id}/{uuid}_{filename}
  mime_type        TEXT,                  -- e.g. 'image/jpeg', 'application/pdf'
  file_size_bytes  BIGINT,               -- optional, for display/validation

  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  project_documents           IS 'References to customer-uploaded files, stored in Supabase Storage.';
COMMENT ON COLUMN project_documents.file_path IS 'Relative path inside the Storage bucket. Use Supabase Storage SDK to generate signed URLs.';
COMMENT ON COLUMN project_documents.mime_type IS 'MIME type detected or reported at upload time. Use for rendering (image vs. PDF etc.).';
