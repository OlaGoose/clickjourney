import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rowToCarouselItem } from '@/lib/storage/types';
import type { TravelMemoryRow } from '@/lib/storage/types';

/**
 * GET /api/memories/[id]
 * Returns a memory by id. RLS applies: only returns if the memory is
 * - owned by the current user, or
 * - demo (user_id IS NULL), or
 * - public (visibility = 'public').
 * Used when viewing a shared link (e.g. non-owner or anonymous).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('travel_memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const row = data as TravelMemoryRow;
    const item = rowToCarouselItem(row);
    return NextResponse.json(item);
  } catch (e) {
    console.error('GET /api/memories/[id] error:', e);
    return NextResponse.json({ error: 'Failed to load memory' }, { status: 500 });
  }
}
