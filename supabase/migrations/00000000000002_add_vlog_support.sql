-- Add vlog support to travel_memories
-- Adds vlog_data_json column to store complete VlogData for playback and sharing

ALTER TABLE public.travel_memories
  ADD COLUMN IF NOT EXISTS vlog_data_json TEXT;

COMMENT ON COLUMN public.travel_memories.vlog_data_json IS 'JSON VlogData for vlog type; stores complete vlog configuration for playback and sharing';

-- Update type column comment to include vlog
COMMENT ON COLUMN public.travel_memories.type IS 'Memory type: photo-gallery | cinematic | rich-story | video | vlog';
