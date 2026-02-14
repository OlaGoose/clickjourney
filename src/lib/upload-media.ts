/**
 * Media upload: Supabase Storage → Google Cloud Storage (API) → base64 fallback.
 * Used by editor (MediaUploader, UltimateEditor, EditPanel) for images, audio, video.
 */

import { supabase } from '@/lib/supabase/client';

export const STORAGE_BUCKET = 'memories';

/**
 * Upload a file to Supabase Storage and return the public URL.
 * Returns null if Supabase is not configured or upload fails.
 */
export async function uploadToSupabaseStorage(
  file: File,
  options?: { userId?: string | null; folder?: string }
): Promise<string | null> {
  if (!supabase) return null;

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
    const uid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pathFolder = options?.userId ? `${options.userId}` : options?.folder ?? 'anonymous';
    const path = `${pathFolder}/${uid}-${safeName}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.warn('[upload-media] Supabase upload failed:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('[upload-media] Supabase upload error:', e);
    return null;
  }
}

/**
 * Upload a file via POST /api/upload-media to Google Cloud Storage.
 * Returns null if the API is not configured or upload fails.
 */
export async function uploadToGoogleStorage(
  file: File,
  options?: { userId?: string | null; folder?: string }
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const folder = options?.userId ?? options?.folder ?? '';
    if (folder) formData.append('folder', folder);

    const res = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn('[upload-media] Google upload failed:', data.error ?? res.statusText);
      return null;
    }

    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch (e) {
    console.warn('[upload-media] Google upload error:', e);
    return null;
  }
}

/**
 * Convert File to a persistent URL: try Supabase → then Google Cloud Storage → then data URL.
 * Use this in components so production can use either Supabase or GCS, with base64 fallback.
 */
export async function fileToUrlOrDataUrl(
  file: File,
  options?: { userId?: string | null; folder?: string }
): Promise<string> {
  const supabaseUrl = await uploadToSupabaseStorage(file, options);
  if (supabaseUrl) return supabaseUrl;

  const googleUrl = await uploadToGoogleStorage(file, options);
  if (googleUrl) return googleUrl;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a blob URL to a persistent URL (Supabase → GCS → data URL).
 * If the URL is not a blob:, returns it unchanged.
 * Used when persisting vlog/cinematic media so it works after reload or from detail page.
 */
export async function blobUrlToPersistentUrl(
  url: string,
  options?: { userId?: string | null; folder?: string; mimeType?: string; filename?: string }
): Promise<string> {
  if (!url || typeof url !== 'string' || !url.startsWith('blob:')) {
    return url;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const mime = options?.mimeType ?? blob.type || 'application/octet-stream';
    const ext = mime.startsWith('image/') ? (mime === 'image/png' ? 'png' : 'jpg') : mime.startsWith('video/') ? 'mp4' : mime.startsWith('audio/') ? 'webm' : 'bin';
    const file = new File([blob], options?.filename ?? `upload-${Date.now()}.${ext}`, { type: mime });
    return fileToUrlOrDataUrl(file, options);
  } catch (e) {
    console.warn('[upload-media] blobUrlToPersistentUrl failed:', e);
    return url;
  }
}
