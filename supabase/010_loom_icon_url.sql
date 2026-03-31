-- Allow Looms to use uploaded/photo icons in addition to Lucide icon_name
ALTER TABLE public.looms
ADD COLUMN IF NOT EXISTS icon_url TEXT;
