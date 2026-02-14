/**
 * Builds the public share URL for a memory (no login required when opened).
 * Append ?share=1 so the detail page uses API-first and shows share view.
 */
export function getMemoryShareUrl(memoryId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/memories/${memoryId}?share=1`;
  }
  return `/memories/${memoryId}?share=1`;
}

/**
 * Copies the memory public share link to clipboard.
 * Returns true if copy succeeded.
 */
export async function copyMemoryShareLink(memoryId: string): Promise<boolean> {
  const url = getMemoryShareUrl(memoryId);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
