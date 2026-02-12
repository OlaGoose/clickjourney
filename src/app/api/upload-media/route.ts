/**
 * POST /api/upload-media
 * Upload image/audio/video to Google Cloud Storage. Used when GCS is configured.
 * Body: multipart/form-data with "file" (File) and optional "folder" (e.g. userId).
 * Returns: { url: string } or { error: string }.
 */

import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const GCS_BUCKET = process.env.GCS_BUCKET;
const GCS_CREDENTIALS_JSON = process.env.GCS_SERVICE_ACCOUNT_JSON;

function getStorage(): Storage | null {
  if (!GCS_BUCKET || !GCS_CREDENTIALS_JSON) return null;
  try {
    const credentials = JSON.parse(GCS_CREDENTIALS_JSON);
    return new Storage({ credentials });
  } catch {
    return null;
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 120);
}

export async function POST(request: Request) {
  const storage = getStorage();
  if (!storage) {
    return NextResponse.json(
      { error: 'Google Cloud Storage not configured (GCS_BUCKET, GCS_SERVICE_ACCOUNT_JSON)' },
      { status: 503 }
    );
  }

  let file: File;
  let folder: string | null = null;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const f = formData.get('file');
    if (!f || !(f instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid file in form data' }, { status: 400 });
    }
    file = f;
    const folderVal = formData.get('folder');
    if (typeof folderVal === 'string' && folderVal.trim()) folder = folderVal.trim();
  } else {
    return NextResponse.json(
      { error: 'Content-Type must be multipart/form-data with a "file" field' },
      { status: 400 }
    );
  }

  const uid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const pathFolder = folder ?? 'anonymous';
  const path = `${pathFolder}/${uid}-${safeName(file.name)}`;

  try {
    const bucket = storage.bucket(GCS_BUCKET!);
    const gcsFile = bucket.file(path);
    const buffer = Buffer.from(await file.arrayBuffer());
    await gcsFile.save(buffer, {
      contentType: file.type || 'application/octet-stream',
      metadata: { cacheControl: 'public, max-age=3600' },
    });
    await gcsFile.makePublic();
    const url = `https://storage.googleapis.com/${GCS_BUCKET}/${path}`;
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    console.error('[upload-media] GCS error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
