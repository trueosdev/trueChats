-- Add category column to threads for distinguishing text vs voice/video channels
ALTER TABLE public.threads
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'text'
CHECK (category IN ('text', 'voice'));
