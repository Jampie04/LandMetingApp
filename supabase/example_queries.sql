-- =============================================================================
-- Example Queries – LandMetingApp
-- Purpose  : Ready-to-run reference queries for the most common app operations.
--             Use these directly in the Supabase SQL Editor, or adapt them to
--             your frontend client (supabase-js, postgrest, etc.).
--
-- Placeholders:  :project_id    → replace with a real UUID
--                :landmeter_id  → replace with auth.uid() in the app
--                :status_filter → 'new' | 'in_progress' | 'completed'
-- =============================================================================


-- ============================================================
-- 1. FIVE MOST RECENT PROJECTS  (home page summary panel)
-- ============================================================

SELECT
  p.id,
  p.customer_first_name || ' ' || p.customer_last_name AS customer_name,
  p.customer_phone,
  p.location_address,
  p.district,
  p.status,
  pr.full_name  AS assigned_to,
  p.created_at
FROM  projects p
LEFT  JOIN profiles pr ON pr.id = p.assigned_landmeter_id
ORDER BY p.created_at DESC
LIMIT 5;


-- ============================================================
-- 2. ACTIVE (in_progress) PROJECTS FOR A SPECIFIC LANDMETER  (home page widget)
-- ============================================================

SELECT
  p.id,
  p.customer_first_name || ' ' || p.customer_last_name AS customer_name,
  p.customer_phone,
  p.location_address,
  p.neighborhood,
  p.district,
  p.created_at
FROM  projects p
WHERE p.assigned_landmeter_id = :landmeter_id   -- use auth.uid() in the app
  AND p.status = 'in_progress'
ORDER BY p.created_at DESC;


-- ============================================================
-- 3. ALL PROJECTS – NEWEST TO OLDEST  (projects page, default sort)
-- ============================================================

SELECT
  p.id,
  p.customer_first_name || ' ' || p.customer_last_name AS customer_name,
  p.customer_phone,
  p.location_address,
  p.district,
  p.status,
  pr.full_name AS assigned_to,
  p.created_at,
  p.completed_at
FROM  projects p
LEFT  JOIN profiles pr ON pr.id = p.assigned_landmeter_id
ORDER BY p.created_at DESC;


-- ============================================================
-- 4. ALL PROJECTS – OLDEST TO NEWEST  (projects page, alt sort)
-- ============================================================

SELECT
  p.id,
  p.customer_first_name || ' ' || p.customer_last_name AS customer_name,
  p.customer_phone,
  p.location_address,
  p.district,
  p.status,
  pr.full_name AS assigned_to,
  p.created_at,
  p.completed_at
FROM  projects p
LEFT  JOIN profiles pr ON pr.id = p.assigned_landmeter_id
ORDER BY p.created_at ASC;


-- ============================================================
-- 5. FILTER BY STATUS  (projects page filter control)
-- ============================================================

SELECT
  p.id,
  p.customer_first_name || ' ' || p.customer_last_name AS customer_name,
  p.location_address,
  p.district,
  p.status,
  pr.full_name AS assigned_to,
  p.created_at
FROM  projects p
LEFT  JOIN profiles pr ON pr.id = p.assigned_landmeter_id
WHERE p.status = :status_filter            -- 'new', 'in_progress', or 'completed'
ORDER BY p.created_at DESC;


-- ============================================================
-- 6. PROJECT DETAIL VIEW  (view details page)
-- ============================================================

SELECT
  p.*,
  pr.full_name        AS assigned_to_name,
  pr.phone_number     AS assigned_to_phone
FROM  projects p
LEFT  JOIN profiles pr ON pr.id = p.assigned_landmeter_id
WHERE p.id = :project_id;

-- Fetch documents for the same project (run alongside query above)
SELECT id, file_name, file_path, mime_type, file_size_bytes, uploaded_at
FROM   project_documents
WHERE  project_id = :project_id
ORDER  BY uploaded_at ASC;

-- Fetch status history for the same project
SELECT
  psh.changed_at,
  psh.from_status,
  psh.to_status,
  psh.notes,
  pr.full_name AS changed_by_name
FROM  project_status_history psh
LEFT  JOIN profiles pr ON pr.id = psh.changed_by
WHERE psh.project_id = :project_id
ORDER BY psh.changed_at ASC;


-- ============================================================
-- 7. CLAIM A PROJECT  (landmeter picks up an unclaimed project)
--    Run as a single transaction.
--    Guard: only succeeds if project is still 'new' and unassigned.
-- ============================================================

BEGIN;

  UPDATE projects
  SET
    assigned_landmeter_id = :landmeter_id,
    status                = 'in_progress'
  WHERE id                    = :project_id
    AND status                = 'new'
    AND assigned_landmeter_id IS NULL;      -- prevent double-claiming

  -- Only insert history row if the update actually matched
  -- (application should check rowsAffected > 0 before committing)
  INSERT INTO project_status_history
    (project_id, changed_by, from_status, to_status, notes)
  VALUES
    (:project_id, :landmeter_id, 'new', 'in_progress', 'Project opgenomen door landmeter');

COMMIT;


-- ============================================================
-- 8. MARK A PROJECT AS COMPLETED
--    Run as a single transaction.
--    Guard: only the assigned landmeter can complete, and only if in_progress.
-- ============================================================

BEGIN;

  UPDATE projects
  SET
    status       = 'completed',
    completed_at = NOW()
  WHERE id                    = :project_id
    AND assigned_landmeter_id = :landmeter_id   -- only the assigned landmeter
    AND status                = 'in_progress';  -- must be actively in progress

  INSERT INTO project_status_history
    (project_id, changed_by, from_status, to_status, notes)
  VALUES
    (:project_id, :landmeter_id, 'in_progress', 'completed', 'Meting afgerond');

COMMIT;
