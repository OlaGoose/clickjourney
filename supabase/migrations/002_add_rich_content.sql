-- Add rich_content column to travel_memories table
ALTER TABLE public.travel_memories
ADD COLUMN IF NOT EXISTS rich_content TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.travel_memories.rich_content IS 'Rich text HTML content for the full memory story';
