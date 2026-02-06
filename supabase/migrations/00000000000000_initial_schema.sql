-- Orbit Journey - Initial Schema (merged, no history)
-- Run this on a fresh Supabase project. Creates: user_profiles, travel_memories, RLS, indexes.

-- Optional: enable UUID extension (Supabase has it by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- user_profiles (extends auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  avatar_url TEXT,
  email TEXT,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'pro')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'User profile extended from auth.users';

-- =============================================================================
-- travel_memories (user-scoped or demo when user_id IS NULL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.travel_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(200) NOT NULL,
  image_url TEXT NOT NULL,
  color VARCHAR(32) NOT NULL,
  chord JSONB NOT NULL DEFAULT '[]'::jsonb,
  detail_title VARCHAR(300),
  category VARCHAR(100),
  gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  rich_content TEXT,
  audio_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  video_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_name VARCHAR(200),
  place_address TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_journey_start BOOLEAN NOT NULL DEFAULT FALSE,
  is_journey_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.travel_memories IS 'Travel memories; user_id NULL = demo data';
COMMENT ON COLUMN public.travel_memories.rich_content IS 'Rich text HTML content for the full memory story';
COMMENT ON COLUMN public.travel_memories.audio_urls IS 'Array of audio file URLs';
COMMENT ON COLUMN public.travel_memories.video_urls IS 'Array of video file URLs';
COMMENT ON COLUMN public.travel_memories.place_address IS 'Full address from Google Maps';

-- Indexes for travel_memories
CREATE INDEX IF NOT EXISTS idx_travel_memories_user_id ON public.travel_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_memories_user_sort ON public.travel_memories(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_travel_memories_updated_at ON public.travel_memories(updated_at);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_memories ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only read/update/insert their own row
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- travel_memories: read own or demo (user_id IS NULL); write only own
CREATE POLICY "travel_memories_select_own_or_demo"
  ON public.travel_memories FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "travel_memories_insert_own"
  ON public.travel_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "travel_memories_update_own"
  ON public.travel_memories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "travel_memories_delete_own"
  ON public.travel_memories FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- updated_at trigger (optional but recommended)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_travel_memories_updated_at ON public.travel_memories;
CREATE TRIGGER set_travel_memories_updated_at
  BEFORE UPDATE ON public.travel_memories
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
