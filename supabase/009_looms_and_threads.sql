-- Looms & Threads: Discord-like community structure
-- Loom = top-level community/server, Thread = chat room inside a Loom

-- ============================================================
-- LOOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.looms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Users',
    banner_url TEXT,
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'invite_only')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_looms_created_by ON public.looms(created_by);
CREATE INDEX IF NOT EXISTS idx_looms_visibility ON public.looms(visibility);

-- ============================================================
-- LOOM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loom_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loom_id UUID NOT NULL REFERENCES public.looms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_loom_member UNIQUE (loom_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_loom_members_loom ON public.loom_members(loom_id);
CREATE INDEX IF NOT EXISTS idx_loom_members_user ON public.loom_members(user_id);

-- ============================================================
-- THREADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loom_id UUID NOT NULL REFERENCES public.looms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon_emoji TEXT,
    type TEXT DEFAULT 'open' CHECK (type IN ('open', 'private')),
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_message JSONB
);

CREATE INDEX IF NOT EXISTS idx_threads_loom ON public.threads(loom_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_by ON public.threads(created_by);

-- ============================================================
-- THREAD MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    reply_to UUID REFERENCES public.thread_messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    likes JSONB DEFAULT '[]'::jsonb,
    attachment_url TEXT,
    attachment_type TEXT,
    attachment_name TEXT,
    attachment_size BIGINT
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON public.thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_sender ON public.thread_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_created_at ON public.thread_messages(created_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_user_in_loom(p_loom_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.loom_members
        WHERE loom_id = p_loom_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_in_loom TO authenticated;

CREATE OR REPLACE FUNCTION get_loom_role(p_loom_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM public.loom_members
        WHERE loom_id = p_loom_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_loom_role TO authenticated;

-- ============================================================
-- RLS: LOOMS
-- ============================================================
ALTER TABLE public.looms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view looms they belong to or public looms"
    ON public.looms FOR SELECT TO authenticated
    USING (
        visibility = 'public'
        OR is_user_in_loom(id, auth.uid())
    );

CREATE POLICY "Authenticated users can create looms"
    ON public.looms FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Loom owner/admin can update loom"
    ON public.looms FOR UPDATE TO authenticated
    USING (
        get_loom_role(id, auth.uid()) IN ('owner', 'admin')
    );

CREATE POLICY "Loom owner can delete loom"
    ON public.looms FOR DELETE TO authenticated
    USING (
        get_loom_role(id, auth.uid()) = 'owner'
    );

-- ============================================================
-- RLS: LOOM MEMBERS
-- ============================================================
ALTER TABLE public.loom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loom members can view other members"
    ON public.loom_members FOR SELECT TO authenticated
    USING (
        is_user_in_loom(loom_id, auth.uid())
    );

CREATE POLICY "Owner/admin can add members"
    ON public.loom_members FOR INSERT TO authenticated
    WITH CHECK (
        -- Admins/owners can add members
        get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
        -- Or user is adding themselves (joining public loom or first member = owner)
        OR user_id = auth.uid()
    );

CREATE POLICY "Owner/admin can remove members, members can leave"
    ON public.loom_members FOR DELETE TO authenticated
    USING (
        get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
        OR user_id = auth.uid()
    );

CREATE POLICY "Owner/admin can update member roles"
    ON public.loom_members FOR UPDATE TO authenticated
    USING (
        get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
    );

-- ============================================================
-- RLS: THREADS
-- ============================================================
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loom members can view threads"
    ON public.threads FOR SELECT TO authenticated
    USING (
        is_user_in_loom(loom_id, auth.uid())
    );

CREATE POLICY "Loom members can create threads"
    ON public.threads FOR INSERT TO authenticated
    WITH CHECK (
        is_user_in_loom(loom_id, auth.uid())
        AND created_by = auth.uid()
    );

CREATE POLICY "Thread creator or loom admin can update thread"
    ON public.threads FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin', 'moderator')
    );

CREATE POLICY "Thread creator or loom admin can delete thread"
    ON public.threads FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
    );

-- ============================================================
-- RLS: THREAD MESSAGES
-- ============================================================
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loom members can view thread messages"
    ON public.thread_messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.threads t
            WHERE t.id = thread_messages.thread_id
            AND is_user_in_loom(t.loom_id, auth.uid())
        )
    );

CREATE POLICY "Loom members can send thread messages"
    ON public.thread_messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.threads t
            WHERE t.id = thread_messages.thread_id
            AND is_user_in_loom(t.loom_id, auth.uid())
        )
    );

CREATE POLICY "Users can update their own thread messages"
    ON public.thread_messages FOR UPDATE TO authenticated
    USING (
        sender_id = auth.uid()
    );

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.threads
    SET last_message = jsonb_build_object(
        'id', NEW.id,
        'content', NEW.content,
        'sender_id', NEW.sender_id,
        'created_at', NEW.created_at
    )
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_last_message_trigger
    AFTER INSERT ON public.thread_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_last_message();

-- Trigger to set edited_at on thread message update
CREATE OR REPLACE FUNCTION set_thread_message_edited_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        NEW.edited_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_message_edited_trigger
    BEFORE UPDATE ON public.thread_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_thread_message_edited_at();

-- RPC to mark thread messages as read
CREATE OR REPLACE FUNCTION mark_thread_messages_as_read(
    p_thread_id UUID,
    p_user_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE public.thread_messages
    SET read_at = now()
    WHERE thread_id = p_thread_id
    AND sender_id != p_user_id
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_thread_messages_as_read TO authenticated;

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.looms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loom_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
