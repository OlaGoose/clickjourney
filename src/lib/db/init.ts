/**
 * Database initialization
 * Call this in your root layout or _app to set up the database
 */

'use client';

import React, { useEffect } from 'react';
import { MemoryService } from './services/memory-service';
import { installDevTools } from './utils/dev-tools';
import { logEnvironmentInfo, isDevelopment } from './utils/environment';
import { initializeDemoData, hasDemoData } from './utils/demo-data';
import { useAuth } from '@/lib/auth';

/**
 * Initialize database hook
 * Use this in your root layout to set up IndexedDB and sync
 */
export function useInitializeDatabase() {
  const auth = useAuth();
  const userId = auth?.user?.id ?? null;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Log environment info in development
    if (isDevelopment()) {
      logEnvironmentInfo();
      installDevTools();
    }

    // Initialize memory service
    const init = async () => {
      try {
        // Initialize demo data for non-authenticated users (only if not already present, avoid duplicate init)
        if (!userId) {
          if (!(await hasDemoData())) await initializeDemoData();
        }
        
        // Initialize memory service (starts sync if authenticated)
        await MemoryService.initialize(userId);
      } catch (e) {
        console.error('Database initialization failed:', e);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      if (userId) {
        // Stop sync but keep data
        // Data will persist for offline use
      }
    };
  }, [userId]);
}

/**
 * Provider component for database initialization
 * Alternative to using the hook directly
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  useInitializeDatabase();
  return React.createElement(React.Fragment, null, children);
}
