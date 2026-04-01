-- Fix: INSERT ... SELECT on looms failed for private Looms because the creator
-- is not in loom_members until the next statement, so the existing SELECT policy
-- (public OR is_user_in_loom) hid the row from RETURNING / .select().

-- Optional: server-side creator id matches JWT even if client omits the column.
ALTER TABLE public.looms
    ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Users can view looms they belong to or public looms" ON public.looms;

CREATE POLICY "Users can view looms they belong to or public looms"
    ON public.looms FOR SELECT TO authenticated
    USING (
        visibility = 'public'
        OR is_user_in_loom(id, auth.uid())
        OR created_by = auth.uid()
    );
