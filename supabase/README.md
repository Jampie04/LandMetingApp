# LandMetingApp – Database Schema

## Folder Structure

```
supabase/
├── migrations/
│   ├── 20260409000001_enums_and_profiles.sql   ← enums + profiles table + auto-create trigger
│   ├── 20260409000002_projects.sql              ← core projects table
│   ├── 20260409000003_project_documents.sql     ← file metadata table
│   ├── 20260409000004_project_status_history.sql← audit log table
│   ├── 20260409000005_indexes_and_triggers.sql  ← indexes + updated_at triggers
│   └── 20260409000006_rls_policies.sql          ← Row Level Security
├── seed.sql          ← dev data (3 users, 6 projects)
├── example_queries.sql
└── README.md
```

---

## Schema Overview

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users`. One row per landmeter/admin. Auto-created on sign-up. |
| `projects` | One row per customer intake request. Core of the app. |
| `project_documents` | Metadata for files uploaded by the customer. Files live in Supabase Storage. |
| `project_status_history` | Append-only audit log of every status transition. Never modified. |

### Enums

| Enum | Values |
|---|---|
| `user_role` | `landmeter`, `admin` |
| `project_status` | `new`, `in_progress`, `completed` |

### Why no `customers` table?
Customers are one-time form submitters — they do not log in, have no account, and are not tracked across requests. Their details are denormalized onto `projects` to keep the MVP lean. Add a `customers` table later if return-customer tracking is needed.

### Why no `notifications` table?
Out of scope for MVP. The dashboard covers landmeter awareness. Add this when WhatsApp or push integration is built.

---

## Running Migrations

### Supabase CLI (recommended)
```bash
# Apply all pending migrations
supabase db push

# Reset and re-apply (dev only)
supabase db reset
```

### Manual (SQL Editor)
Run each migration file in numeric order via the Supabase SQL Editor.

---

## Running the Seed

> **Important:** Replace the placeholder UUIDs in `seed.sql` with real `auth.users` IDs before running.

1. Create 3 test users in **Authentication → Users** in the Supabase dashboard  
   (or use `supabase auth user create` via CLI)
2. Note their generated UUIDs
3. Open `seed.sql` and replace `lm1_id`, `lm2_id`, `adm_id` with those UUIDs
4. Run the file:

```bash
supabase db seed
```
Or paste into the SQL Editor.

---

## RLS Summary

| Table | anon | authenticated |
|---|---|---|
| `profiles` | — | SELECT all, UPDATE own row |
| `projects` | INSERT | SELECT all, UPDATE all |
| `project_documents` | INSERT | SELECT all |
| `project_status_history` | — | SELECT all, INSERT |

**Pattern:** Customers (anon) can only submit. Landmeters (authenticated) can read everything and update projects. Business rules (e.g. "only claim if unassigned") are enforced at the query level, not the RLS level — acceptable for MVP.

---

## Supabase Storage

Create a bucket named **`project-documents`**.

Recommended bucket policies:
- `anon` → INSERT (upload during form submission)
- `authenticated` → SELECT (view/download)
- No DELETE or UPDATE for anon

File path convention used in this schema:
```
projects/{project_id}/{uuid}_{original_filename}
```

---

## Next Steps

1. **Customer form** – Build a public Next.js/React form that posts to Supabase with the `anon` key. Upload files to the `project-documents` bucket and insert a `project_documents` row per file.
2. **Auth** – Set up Supabase Auth (email/password is fine for MVP). Pass `full_name` in `user_metadata` on sign-up so the profile trigger picks it up.
3. **Dashboard** – Use the example queries in `example_queries.sql` as the data layer for the home and projects pages.
4. **Offline support** – When ready, evaluate [PowerSync](https://www.powersync.com/) or [ElectricSQL](https://electric-sql.com/) for client-side SQLite sync. No database changes needed; the current schema is sync-friendly.
5. **Roles** – To enforce admin-only actions later, add `WHERE auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')` to the relevant RLS policies or use a Postgres function.
6. **Notifications** – Add a `notifications` table and a Supabase Edge Function triggered by `project_status_history` inserts when WhatsApp/push is needed.
