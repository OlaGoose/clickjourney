-- Orbit Journey - Initial Schema
-- user_profiles + travel_memories, RLS, indexes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  avatar_url TEXT,
  email TEXT,
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'pro')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel memories (user-scoped or demo)
CREATE TABLE IF NOT EXISTS travel_memories (
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
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_name VARCHAR(200),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_journey_start BOOLEAN NOT NULL DEFAULT FALSE,
  is_journey_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_memories_user ON travel_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_memories_sort ON travel_memories(user_id, sort_order);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_memories ENABLE ROW LEVEL SECURITY;

-- user_profiles: own row only
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- travel_memories: own rows or null user_id (demo)
CREATE POLICY "Users can read own or demo memories"
  ON travel_memories FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can insert own memories"
  ON travel_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own memories"
  ON travel_memories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own memories"
  ON travel_memories FOR DELETE
  USING (user_id = auth.uid());
