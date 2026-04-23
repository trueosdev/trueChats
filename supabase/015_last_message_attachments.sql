-- ============================================================
-- Include attachment_type in conversation.last_message so
-- sidebar previews can render "Photo" / "Video" / etc. when the
-- message is attachment-only (content is empty).
-- ============================================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message = jsonb_build_object(
        'id', NEW.id,
        'content', NEW.content,
        'sender_id', NEW.sender_id,
        'created_at', NEW.created_at,
        'attachment_type', NEW.attachment_type
    )
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Same treatment for thread messages.
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.threads
    SET last_message = jsonb_build_object(
        'id', NEW.id,
        'content', NEW.content,
        'sender_id', NEW.sender_id,
        'created_at', NEW.created_at,
        'attachment_type', NEW.attachment_type
    )
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing conversations.last_message with attachment_type
-- from the newest message so previews are correct immediately.
UPDATE public.conversations c
SET last_message = jsonb_set(
    COALESCE(c.last_message, '{}'::jsonb),
    '{attachment_type}',
    to_jsonb(m.attachment_type),
    true
)
FROM public.messages m
WHERE m.conversation_id = c.id
  AND c.last_message IS NOT NULL
  AND (c.last_message ->> 'id')::uuid = m.id;

UPDATE public.threads t
SET last_message = jsonb_set(
    COALESCE(t.last_message, '{}'::jsonb),
    '{attachment_type}',
    to_jsonb(m.attachment_type),
    true
)
FROM public.thread_messages m
WHERE m.thread_id = t.id
  AND t.last_message IS NOT NULL
  AND (t.last_message ->> 'id')::uuid = m.id;
