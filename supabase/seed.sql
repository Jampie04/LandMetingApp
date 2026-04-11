-- =============================================================================
-- Seed: Development Data
-- Purpose  : Populate the database with realistic Suriname-based test data.
--
-- BEFORE RUNNING:
--   1. Create 3 test users in Supabase Auth (dashboard → Authentication → Users)
--      or via: supabase auth user create (CLI)
--   2. Copy their generated UUIDs and replace the placeholder values below.
--   3. Run this file via:
--        supabase db seed  (if configured in supabase/config.toml)
--      or paste into the Supabase SQL Editor.
--
-- WARNING: Do NOT run in production.
-- =============================================================================


-- -------------------------
-- STEP 1: Replace these UUIDs with real auth.users IDs from your project.
-- -------------------------
-- Tip: After creating users in the Auth dashboard, query them:
--   SELECT id, email FROM auth.users;

DO $$
DECLARE
  -- Landmeter accounts
  lm1_id  UUID := '00000000-0000-0000-0000-000000000001'; -- ravi@landmeting.sr
  lm2_id  UUID := '00000000-0000-0000-0000-000000000002'; -- priya@landmeting.sr
  -- Admin account
  adm_id  UUID := '00000000-0000-0000-0000-000000000003'; -- admin@landmeting.sr

  -- Fixed project UUIDs so status_history FK references work
  proj1   UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  proj2   UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  proj3   UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
  proj4   UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  proj5   UUID := 'aaaaaaaa-0000-0000-0000-000000000005';
  proj6   UUID := 'aaaaaaaa-0000-0000-0000-000000000006';

BEGIN

  -- -------------------------
  -- PROFILES
  -- The handle_new_user trigger creates a skeleton profile on auth.users insert.
  -- We upsert here to set full metadata.
  -- -------------------------

  INSERT INTO profiles (id, full_name, phone_number, role)
  VALUES
    (lm1_id, 'Ravi Mahabier',  '+5978001234', 'landmeter'),
    (lm2_id, 'Priya Santokhi', '+5978005678', 'landmeter'),
    (adm_id, 'Admin Gebruiker','+5978009999', 'admin')
  ON CONFLICT (id) DO UPDATE
    SET full_name    = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        role         = EXCLUDED.role;


  -- -------------------------
  -- PROJECTS
  -- Mix of statuses and districts across Suriname.
  -- -------------------------

  INSERT INTO projects (
    id,
    customer_first_name, customer_last_name, customer_phone,
    location_address, latitude, longitude, neighborhood, district,
    status, assigned_landmeter_id, completed_at, created_at
  ) VALUES

    -- 1. Unclaimed / new
    (proj1,
     'Johan', 'Fernandes', '+5977001001',
     'Henck Arronstraat 12, Paramaribo', 5.8520000, -55.2038000,
     'Centrum', 'Paramaribo',
     'new', NULL, NULL,
     NOW() - INTERVAL '1 day'),

    -- 2. Claimed by Ravi, in progress
    (proj2,
     'Meera', 'Ramlakhan', '+5977002002',
     'Tourtonnelaan 45, Paramaribo', 5.8495000, -55.1872000,
     'Flora', 'Paramaribo',
     'in_progress', lm1_id, NULL,
     NOW() - INTERVAL '3 days'),

    -- 3. Also claimed by Ravi, in progress
    (proj3,
     'Carlos', 'Brunings', '+5977003003',
     'Saramaccastraat 8, Paramaribo', 5.8601000, -55.1955000,
     NULL, 'Paramaribo',
     'in_progress', lm1_id, NULL,
     NOW() - INTERVAL '5 days'),

    -- 4. Completed by Priya
    (proj4,
     'Diana', 'Amansingh', '+5977004004',
     'Verlengde Gemenelandsweg 100, Wanica', 5.8020000, -55.2311000,
     'Houttuin', 'Wanica',
     'completed', lm2_id, NOW() - INTERVAL '2 days',
     NOW() - INTERVAL '10 days'),

    -- 5. New, no landmeter yet
    (proj5,
     'Eric', 'Doerga', '+5977005005',
     'Indira Ghandiweg 77, Nieuw Nickerie', 5.9431000, -57.0100000,
     NULL, 'Nickerie',
     'new', NULL, NULL,
     NOW() - INTERVAL '6 hours'),

    -- 6. New, no landmeter yet
    (proj6,
     'Fatima', 'Hassan', '+5977006006',
     'Marowijnestraat 3, Albina', 5.4953000, -54.0501000,
     NULL, 'Marowijne',
     'new', NULL, NULL,
     NOW() - INTERVAL '30 minutes')

  ON CONFLICT (id) DO NOTHING;


  -- -------------------------
  -- PROJECT_DOCUMENTS (sample metadata only – no real file in Storage)
  -- -------------------------

  INSERT INTO project_documents (project_id, file_name, file_path, mime_type, file_size_bytes)
  VALUES
    (proj1, 'eigendomsbewijs.pdf',
     'projects/aaaaaaaa-0000-0000-0000-000000000001/eigendomsbewijs.pdf',
     'application/pdf', 204800),

    (proj2, 'foto_perceel.jpg',
     'projects/aaaaaaaa-0000-0000-0000-000000000002/foto_perceel.jpg',
     'image/jpeg', 1048576),

    (proj2, 'transportakte.pdf',
     'projects/aaaaaaaa-0000-0000-0000-000000000002/transportakte.pdf',
     'application/pdf', 512000),

    (proj4, 'situatietekening.pdf',
     'projects/aaaaaaaa-0000-0000-0000-000000000004/situatietekening.pdf',
     'application/pdf', 307200)

  ON CONFLICT DO NOTHING;


  -- -------------------------
  -- PROJECT_STATUS_HISTORY
  -- Accurate transition log matching the project states above.
  -- -------------------------

  INSERT INTO project_status_history (project_id, changed_by, from_status, to_status, notes, changed_at)
  VALUES
    -- proj1: created (new)
    (proj1, NULL,   NULL,         'new',         'Aanvraag ingediend via formulier',  NOW() - INTERVAL '1 day'),

    -- proj2: created → claimed by Ravi
    (proj2, NULL,   NULL,         'new',         'Aanvraag ingediend via formulier',  NOW() - INTERVAL '3 days'),
    (proj2, lm1_id, 'new',        'in_progress', 'Opgenomen door Ravi Mahabier',      NOW() - INTERVAL '2 days' - INTERVAL '6 hours'),

    -- proj3: created → claimed by Ravi
    (proj3, NULL,   NULL,         'new',         'Aanvraag ingediend via formulier',  NOW() - INTERVAL '5 days'),
    (proj3, lm1_id, 'new',        'in_progress', 'Opgenomen door Ravi Mahabier',      NOW() - INTERVAL '4 days'),

    -- proj4: created → claimed by Priya → completed
    (proj4, NULL,   NULL,         'new',         'Aanvraag ingediend via formulier',  NOW() - INTERVAL '10 days'),
    (proj4, lm2_id, 'new',        'in_progress', 'Opgenomen door Priya Santokhi',     NOW() - INTERVAL '8 days'),
    (proj4, lm2_id, 'in_progress','completed',   'Meting afgerond',                  NOW() - INTERVAL '2 days'),

    -- proj5: created (new)
    (proj5, NULL,   NULL,         'new',         'Aanvraag ingediend via formulier',  NOW() - INTERVAL '6 hours'),

    -- proj6: created (new)
    (proj6, NULL,   NULL,         'new',         'Aanvraag ingediend via formulier',  NOW() - INTERVAL '30 minutes')

  ON CONFLICT DO NOTHING;

END $$;
