/**
 * Chrome DevTools requests this URL; return empty JSON to avoid 404 in logs.
 * See: https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/main/docs/embedding.md
 */
export function GET() {
  return Response.json({}, { status: 200 });
}
