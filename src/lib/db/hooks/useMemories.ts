/**
 * React hooks for memory operations
 * Provides reactive data access with automatic sync
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { MemoryService } from '../services/memory-service';
import { useAuth } from '@/lib/auth';
import type { CarouselItem, NewMemoryInput } from '@/types/memory';

export interface UseMemoriesResult {
  memories: CarouselItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createMemory: (input: NewMemoryInput) => Promise<{ data: CarouselItem | null; error: string | null }>;
  updateMemory: (id: string, input: Partial<CarouselItem>) => Promise<{ data: CarouselItem | null; error: string | null }>;
  deleteMemory: (id: string) => Promise<{ error: string | null }>;
  syncStatus: { pending: number; synced: number; errors: number; conflicts: number };
  sync: () => Promise<{ success: boolean; error: string | null }>;
}

/**
 * Main hook for memory operations
 */
export function useMemories(): UseMemoriesResult {
  const auth = useAuth();
  const userId = auth?.user?.id ?? null;
  
  const [memories, setMemories] = useState<CarouselItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, synced: 0, errors: 0, conflicts: 0 });

  // Load memories
  const loadMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const items = await MemoryService.listMemories(userId);
      setMemories(items);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load memories';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    const status = await MemoryService.getSyncStatus();
    setSyncStatus(status);
  }, []);

  // Initialize and load data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      await MemoryService.initialize(userId);
      await loadMemories();
      await loadSyncStatus();
    };

    init();

    // Cleanup on unmount
    return () => {
      // Don't cleanup data, just stop sync
      // Data persists for offline use
    };
  }, [userId, loadMemories, loadSyncStatus]);

  // Refresh sync status periodically
  useEffect(() => {
    const interval = setInterval(loadSyncStatus, 5000);
    return () => clearInterval(interval);
  }, [loadSyncStatus]);

  // Create memory
  const createMemory = useCallback(
    async (input: NewMemoryInput) => {
      const result = await MemoryService.createMemory(userId, input);
      if (result.data) {
        await loadMemories();
        await loadSyncStatus();
      }
      return result;
    },
    [userId, loadMemories, loadSyncStatus]
  );

  // Update memory
  const updateMemory = useCallback(
    async (id: string, input: Partial<CarouselItem>) => {
      const result = await MemoryService.updateMemory(id, input);
      if (result.data) {
        await loadMemories();
        await loadSyncStatus();
      }
      return result;
    },
    [loadMemories, loadSyncStatus]
  );

  // Delete memory
  const deleteMemory = useCallback(
    async (id: string) => {
      const result = await MemoryService.deleteMemory(id);
      if (!result.error) {
        await loadMemories();
        await loadSyncStatus();
      }
      return result;
    },
    [loadMemories, loadSyncStatus]
  );

  // Manual sync
  const sync = useCallback(async () => {
    const result = await MemoryService.sync(userId);
    if (result.success) {
      await loadMemories();
      await loadSyncStatus();
    }
    return result;
  }, [userId, loadMemories, loadSyncStatus]);

  return {
    memories,
    isLoading,
    error,
    refresh: loadMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    syncStatus,
    sync,
  };
}

/**
 * Hook for single memory
 */
export function useMemory(id: string | null) {
  const [memory, setMemory] = useState<CarouselItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof window === 'undefined') {
      setMemory(null);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const item = await MemoryService.getMemory(id);
        setMemory(item);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load memory';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  return { memory, isLoading, error };
}
