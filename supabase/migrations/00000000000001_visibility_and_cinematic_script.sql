-- Visibility: public (anyone can view) vs private (only owner).
-- Cinematic script: store DirectorScript JSON so public share can show full content.

ALTER TABLE public.travel_memories
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'public')),
  ADD COLUMN IF NOT EXISTS cinematic_script_json TEXT;

COMMENT ON COLUMN public.travel_memories.visibility IS 'private = only owner can view; public = anyone with link can view';
COMMENT ON COLUMN public.travel_memories.cinematic_script_json IS 'JSON DirectorScript for cinematic type; used for public share';

-- RLS: allow SELECT for own rows, demo (user_id IS NULL), or public rows
DROP POLICY IF EXISTS "travel_memories_select_own_or_demo" ON public.travel_memories;
CREATE POLICY "travel_memories_select_own_demo_or_public"
  ON public.travel_memories FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR visibility = 'public'
  );
