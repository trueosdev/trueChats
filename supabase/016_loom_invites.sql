-- Loom invites: when someone is added to a loom by an owner/admin, they are
-- "invited" rather than immediately becoming a full member. The invited user
-- sees the invite in their pending chats inbox and must accept it to actually
-- join (status becomes 'active'). Denying removes the row.

-- ============================================================
-- SCHEMA CHANGES
-- ============================================================

-- Track invite lifecycle on loom_members itself so we don't need a second
-- table. Default to 'active' so existing rows remain untouched.
ALTER TABLE public.loom_members
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active'));

-- Who sent the invite (nullable for legacy rows and self-joins).
ALTER TABLE public.loom_members
    ADD COLUMN IF NOT EXISTS invited_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- When the invite was sent (nullable: only populated for invited rows).
ALTER TABLE public.loom_members
    ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_loom_members_status ON public.loom_members(status);
CREATE INDEX IF NOT EXISTS idx_loom_members_user_status
    ON public.loom_members(user_id, status);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- Redefine is_user_in_loom to only count active members. Invited rows exist
-- but do NOT grant access to threads / loom content yet.
CREATE OR REPLACE FUNCTION is_user_in_loom(p_loom_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.loom_members
        WHERE loom_id = p_loom_id
          AND user_id = p_user_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_in_loom TO authenticated;

-- get_loom_role still returns the role regardless of status. Existing callers
-- combine it with permission checks that implicitly assume an active member
-- (invited users never have an elevated role).

-- ============================================================
-- RLS: LOOM MEMBERS
-- ============================================================
-- Allow an invited user to see their own loom_members row so they can find
-- and act on their invitation.
DROP POLICY IF EXISTS "Loom members can view other members" ON public.loom_members;

CREATE POLICY "Loom members can view other members"
    ON public.loom_members FOR SELECT TO authenticated
    USING (
        is_user_in_loom(loom_id, auth.uid())
        OR user_id = auth.uid()
    );

-- Allow an invited user to accept their own invitation (flip status to
-- 'active'). Owners/admins keep their existing ability to update roles.
DROP POLICY IF EXISTS "Owner/admin can update member roles" ON public.loom_members;

CREATE POLICY "Owner/admin or invited user can update member row"
    ON public.loom_members FOR UPDATE TO authenticated
    USING (
        get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
        OR user_id = auth.uid()
    )
    WITH CHECK (
        get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
        OR user_id = auth.uid()
    );

-- Existing DELETE policy already lets an invited user delete their own row
-- (user_id = auth.uid()), which we use for denying an invite.

-- ============================================================
-- RLS: LOOMS
-- ============================================================
-- An invited user needs to see the loom (name, icon, etc.) to render their
-- invite card in the pending chats inbox, even though is_user_in_loom now
-- returns false for them.
DROP POLICY IF EXISTS "Users can view looms they belong to or public looms" ON public.looms;

CREATE POLICY "Users can view looms they belong to or public looms"
    ON public.looms FOR SELECT TO authenticated
    USING (
        visibility = 'public'
        OR is_user_in_loom(id, auth.uid())
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.loom_members lm
            WHERE lm.loom_id = looms.id
              AND lm.user_id = auth.uid()
              AND lm.status = 'invited'
        )
    );
