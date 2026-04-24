-- Transfer loom ownership atomically (updates member roles + looms.created_by).
-- Invoked by the current owner only.

CREATE OR REPLACE FUNCTION public.transfer_loom_ownership(p_loom_id uuid, p_new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.loom_members
    WHERE loom_id = p_loom_id AND user_id = uid AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only the active owner can transfer ownership';
  END IF;

  IF p_new_owner_id = uid THEN
    RAISE EXCEPTION 'choose a different member';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.loom_members
    WHERE loom_id = p_loom_id AND user_id = p_new_owner_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'new owner must be an active member of this loom';
  END IF;

  -- Demote outgoing owner first so we never have zero owners mid-flight.
  UPDATE public.loom_members
  SET role = 'admin'
  WHERE loom_id = p_loom_id AND user_id = uid;

  UPDATE public.loom_members
  SET role = 'owner'
  WHERE loom_id = p_loom_id AND user_id = p_new_owner_id;

  UPDATE public.looms
  SET created_by = p_new_owner_id
  WHERE id = p_loom_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_loom_ownership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_loom_ownership(uuid, uuid) TO authenticated;

-- Delete a loom as the current owner. When more than one active member exists,
-- the caller must pass p_new_owner_ack (an active member other than self) so
-- the UI can require choosing someone before the destructive delete.

CREATE OR REPLACE FUNCTION public.delete_loom_as_owner(p_loom_id uuid, p_new_owner_ack uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  n int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.loom_members
    WHERE loom_id = p_loom_id AND user_id = uid AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only the active owner can delete this loom';
  END IF;

  SELECT COUNT(*)::int INTO n
  FROM public.loom_members
  WHERE loom_id = p_loom_id AND status = 'active';

  IF n > 1 THEN
    IF p_new_owner_ack IS NULL OR p_new_owner_ack = uid THEN
      RAISE EXCEPTION 'new_owner_ack_required';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.loom_members
      WHERE loom_id = p_loom_id AND user_id = p_new_owner_ack AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'invalid_new_owner_ack';
    END IF;
  END IF;

  DELETE FROM public.looms WHERE id = p_loom_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_loom_as_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_loom_as_owner(uuid, uuid) TO authenticated;
