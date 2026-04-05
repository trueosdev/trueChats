-- Collapsible folder groups for organizing threads within a loom
CREATE TABLE IF NOT EXISTS public.thread_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loom_id UUID NOT NULL REFERENCES public.looms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_folders_loom ON public.thread_folders(loom_id);

ALTER TABLE public.threads
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.thread_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_threads_folder ON public.threads(folder_id);

ALTER TABLE public.thread_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loom members can view thread folders"
    ON public.thread_folders FOR SELECT TO authenticated
    USING (is_user_in_loom(loom_id, auth.uid()));

CREATE POLICY "Loom members can create thread folders"
    ON public.thread_folders FOR INSERT TO authenticated
    WITH CHECK (
        is_user_in_loom(loom_id, auth.uid())
        AND created_by = auth.uid()
    );

CREATE POLICY "Folder creator or loom mod+ can update thread folder"
    ON public.thread_folders FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin', 'moderator')
    );

CREATE POLICY "Folder creator or loom admin can delete thread folder"
    ON public.thread_folders FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR get_loom_role(loom_id, auth.uid()) IN ('owner', 'admin')
    );

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_folders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
