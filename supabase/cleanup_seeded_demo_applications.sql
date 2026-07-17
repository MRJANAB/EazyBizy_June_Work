-- ============================================================================
-- One-time cleanup: remove the seeded "Rajesh Food Products" demo applications
-- ============================================================================
-- Background: the GTAB intake form used to be pre-seeded with a full
-- "Rajesh Food Products" demo dataset, so any application created without
-- overwriting every field carried identical data -> the CMA report looked the
-- same for every application. The form is now blank (commit 394f5ce); this
-- script clears the OLD rows that were already saved with the demo data.
--
-- HOW TO RUN: open Supabase Dashboard -> SQL Editor -> paste -> Run.
-- The SQL editor runs as a privileged role, so this works regardless of RLS.
-- ALWAYS run STEP 1 first and eyeball the rows before running STEP 2.
-- ============================================================================

-- ── STEP 1 — PREVIEW: which rows match the seeded demo signature? ───────────
-- Review this list. These are the rows STEP 2 will delete.
SELECT id, first_name, last_name, business_entity_name, contact_email, created_at
FROM public.loan_applications
WHERE business_entity_name = 'Rajesh Food Products'
   OR contact_email = 'rajesh.kumar@example.com'
ORDER BY created_at DESC;


-- ── STEP 2 — DELETE the seeded demo rows ────────────────────────────────────
-- Uncomment and run ONLY after STEP 1 shows exactly what you expect to remove.
-- DELETE FROM public.loan_applications
-- WHERE business_entity_name = 'Rajesh Food Products'
--    OR contact_email = 'rajesh.kumar@example.com';


-- ── ALTERNATIVE — delete a single application by id ─────────────────────────
-- If you'd rather remove specific ones, copy an id from STEP 1:
-- DELETE FROM public.loan_applications WHERE id = 'PASTE-UUID-HERE';


-- ── ALTERNATIVE — keep the row but blank the demo identity (overwrite) ───────
-- If you want to KEEP the application shell but wipe the Rajesh data so it can
-- be re-filled, use this instead of deleting:
-- UPDATE public.loan_applications
-- SET first_name = '', last_name = '', business_entity_name = '',
--     contact_email = '', business_description = '', products_services = ''
-- WHERE business_entity_name = 'Rajesh Food Products'
--    OR contact_email = 'rajesh.kumar@example.com';
