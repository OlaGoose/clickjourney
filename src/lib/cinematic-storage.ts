'use client';

import type { DirectorScript } from '@/types/cinematic';
import type { CarouselItem } from '@/types/memory';

const KEY_SCRIPTS = 'orbit-cinematic-scripts';
const KEY_LOCAL_ITEMS = 'orbit-cinematic-local';

/** Persist full DirectorScript by memory id (for cards saved to IndexedDB). */
export function saveCinematicScript(memoryId: string, script: DirectorScript): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY_SCRIPTS);
    const map: Record<string, DirectorScript> = raw ? JSON.parse(raw) : {};
    map[memoryId] = script;
    localStorage.setItem(KEY_SCRIPTS, JSON.stringify(map));
  } catch (e) {
    console.warn('saveCinematicScript failed', e);
  }
}

export function getCinematicScript(memoryId: string): DirectorScript | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY_SCRIPTS);
    const map: Record<string, DirectorScript> = raw ? JSON.parse(raw) : {};
    return map[memoryId] ?? null;
  } catch {
    return null;
  }
}

/** Local-only cinematic entries (no auth): list of { item, script }. */
interface LocalCinematicEntry {
  item: CarouselItem;
  script: DirectorScript;
}

function getLocalCinematicRaw(): LocalCinematicEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_LOCAL_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCinematic(item: CarouselItem, script: DirectorScript): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCinematicRaw();
    list.push({ item, script });
    localStorage.setItem(KEY_LOCAL_ITEMS, JSON.stringify(list));
  } catch (e) {
    console.warn('saveLocalCinematic failed', e);
  }
}

/** Update an existing local cinematic entry by id (avoids duplicate when re-saving from cinematic page). */
export function updateLocalCinematic(id: string, item: CarouselItem, script: DirectorScript): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCinematicRaw();
    const idx = list.findIndex((e) => e.item.id === id);
    if (idx >= 0) {
      list[idx] = { item: { ...item, id }, script };
    } else {
      list.push({ item: { ...item, id }, script });
    }
    localStorage.setItem(KEY_LOCAL_ITEMS, JSON.stringify(list));
  } catch (e) {
    console.warn('updateLocalCinematic failed', e);
  }
}

export function getLocalCinematicItems(): CarouselItem[] {
  return getLocalCinematicRaw().map((e) => e.item);
}

export function getLocalCinematicScript(id: string): DirectorScript | null {
  const entry = getLocalCinematicRaw().find((e) => e.item.id === id);
  return entry ? entry.script : null;
}

/** Whether this card has a full cinematic script (saved or local). */
export function hasCinematicScript(id: string): boolean {
  return getCinematicScript(id) != null || getLocalCinematicScript(id) != null;
}

/** Get script for a card (either from saved or local). */
export function getScriptForCard(id: string): DirectorScript | null {
  return getCinematicScript(id) ?? getLocalCinematicScript(id);
}
