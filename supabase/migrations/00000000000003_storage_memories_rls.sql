-- Storage RLS for "memories" bucket
-- Fixes: "new row violates row-level security policy" on upload.
-- Path format: {userId|anonymous}/{uuid}-{filename}
-- See: src/lib/upload-media.ts uploadToSupabaseStorage()

-- Allow authenticated users to upload into their own folder (first path segment = auth.uid())
CREATE POLICY "memories_upload_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'memories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anon to upload into "anonymous" folder (unauthenticated uploads)
CREATE POLICY "memories_upload_anonymous"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'memories'
    AND (storage.foldername(name))[1] = 'anonymous'
  );

-- Allow authenticated users to read objects in memories (own folder or any for public bucket)
CREATE POLICY "memories_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'memories');

-- Allow anon to read (e.g. public bucket URLs); remove if bucket should be private
CREATE POLICY "memories_select_anon"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'memories');

-- Allow authenticated users to update/delete only their own folder
CREATE POLICY "memories_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "memories_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
