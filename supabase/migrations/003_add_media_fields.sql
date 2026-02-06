-- Add media fields to travel_memories table
ALTER TABLE public.travel_memories
ADD COLUMN IF NOT EXISTS audio_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS place_address TEXT;

-- Add comments
COMMENT ON COLUMN public.travel_memories.audio_urls IS 'Array of audio file URLs';
COMMENT ON COLUMN public.travel_memories.video_urls IS 'Array of video file URLs';
COMMENT ON COLUMN public.travel_memories.place_address IS 'Full address from Google Maps';
