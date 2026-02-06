/**
 * Environment detection and configuration
 * Handles differences between development and production environments
 */

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if mock auth is enabled
 */
export function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
}

/**
 * Check if running on server side
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Get sync configuration based on environment
 */
export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export function getSyncConfig(): SyncConfig {
  const isDev = isDevelopment();
  const isMock = isMockAuthEnabled();
  const hasSupabase = isSupabaseConfigured();

  // In dev with mock auth, disable sync
  if (isDev && isMock) {
    return {
      enabled: false,
      autoSync: false,
      syncInterval: 0,
      retryAttempts: 0,
      retryDelay: 0,
    };
  }

  // In dev without mock, enable sync but with longer intervals
  if (isDev) {
    return {
      enabled: hasSupabase,
      autoSync: true,
      syncInterval: 60000, // 1 minute
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds
    };
  }

  // In production, enable sync with shorter intervals
  return {
    enabled: hasSupabase,
    autoSync: true,
    syncInterval: 30000, // 30 seconds
    retryAttempts: 5,
    retryDelay: 3000, // 3 seconds
  };
}

/**
 * Get storage configuration
 */
export interface StorageConfig {
  useIndexedDB: boolean;
  cacheSize: number; // max number of records to keep
  enableCompression: boolean;
  enableEncryption: boolean;
}

export function getStorageConfig(): StorageConfig {
  return {
    useIndexedDB: isBrowser(),
    cacheSize: isDevelopment() ? 1000 : 10000,
    enableCompression: isProduction(),
    enableEncryption: false, // Future feature
  };
}

let _envLogged = false;

/**
 * Log configuration once per session (useful for debugging)
 */
export function logEnvironmentInfo(): void {
  if (!isBrowser() || _envLogged) return;
  _envLogged = true;

  console.group('🌍 Orbit Journey Environment');
  console.log('Mode:', isDevelopment() ? 'Development' : 'Production');
  console.log('Mock Auth:', isMockAuthEnabled() ? 'Enabled' : 'Disabled');
  console.log('Supabase:', isSupabaseConfigured() ? 'Configured' : 'Not Configured');
  console.log('Sync Config:', getSyncConfig());
  console.log('Storage Config:', getStorageConfig());
  console.groupEnd();
}
