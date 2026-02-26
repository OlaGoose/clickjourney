-- Create the 'memories' bucket for media file storage (images, videos, audio)
-- This bucket stores user-uploaded media files referenced by memories.
-- Must run AFTER 00000000000003_storage_memories_rls.sql which creates the RLS policies.

-- Create bucket if it doesn't exist yet.
-- public = true: objects have a publicly-accessible URL (needed for share links).
-- file_size_limit: 50 MB per file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memories',
  'memories',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/wav', 'audio/ogg', 'audio/aac',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
