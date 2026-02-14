/**
 * Vlog Upload Cache: 断点续传缓存系统
 * 存储未完成的文件上传，刷新后可恢复
 */

const DB_NAME = 'vlog-upload-cache';
const DB_VERSION = 2;
const STORE_NAME = 'uploads';
const STATE_STORE_NAME = 'state';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
export type MediaType = 'image' | 'video' | 'audio' | 'recorded';

export interface VlogFormState {
  currentStep: number;
  memoryLocation: string;
  subtitleText: string;
  videoText: string;
  selectedFilterPreset: string;
  // Media URLs (can be blob: or http:)
  imageUrls: Array<{ id: string; url: string; type: 'image' | 'video' }>;
  audioUrl: string | null;
  recordedAudioUrl: string | null;
  isDefault: boolean; // Track if using default images
  updatedAt: number;
}

export interface UploadCacheItem {
  id: string;
  file: File;
  type: MediaType;
  status: UploadStatus;
  url?: string; // Supabase URL after upload
  createdAt: number;
  updatedAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * 打开 IndexedDB 数据库
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      
      // Create uploads store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Create state store (v2)
      if (oldVersion < 2 && !db.objectStoreNames.contains(STATE_STORE_NAME)) {
        db.createObjectStore(STATE_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 保存文件到缓存
 */
export async function saveUploadCacheItem(
  id: string,
  file: File,
  type: MediaType
): Promise<void> {
  const db = await openDB();
  const now = Date.now();
  const item: UploadCacheItem = {
    id,
    file,
    type,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 更新缓存项状态
 */
export async function updateUploadCacheItem(
  id: string,
  updates: Partial<Pick<UploadCacheItem, 'status' | 'url'>>
): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const item = getRequest.result as UploadCacheItem | undefined;
      if (!item) {
        resolve(); // Item doesn't exist, ignore
        return;
      }

      const updated: UploadCacheItem = {
        ...item,
        ...updates,
        updatedAt: Date.now(),
      };

      const putRequest = store.put(updated);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

/**
 * 获取所有缓存项
 */
export async function getUploadCache(): Promise<UploadCacheItem[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as UploadCacheItem[]);
  });
}

/**
 * 获取未完成的上传项（pending 或 uploading）
 */
export async function getPendingUploads(): Promise<UploadCacheItem[]> {
  const allItems = await getUploadCache();
  return allItems.filter(
    (item) => item.status === 'pending' || item.status === 'uploading'
  );
}

/**
 * 删除单个缓存项
 */
export async function removeUploadCacheItem(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 清空所有缓存
 */
export async function clearUploadCache(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 清理超过 24 小时的旧缓存
 */
export async function cleanupOldCache(): Promise<void> {
  const db = await openDB();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

/**
 * 保存表单状态（步骤、地点、字幕等）
 */
export async function saveVlogFormState(state: Omit<VlogFormState, 'updatedAt'>): Promise<void> {
  const db = await openDB();
  const stateWithTime: VlogFormState = {
    ...state,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(STATE_STORE_NAME);
    const request = store.put({ id: 'vlog-form', ...stateWithTime });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 获取表单状态
 */
export async function getVlogFormState(): Promise<VlogFormState | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE_NAME, 'readonly');
    const store = tx.objectStore(STATE_STORE_NAME);
    const request = store.get('vlog-form');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.id === 'vlog-form') {
        const { id, ...state } = result;
        resolve(state as VlogFormState);
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * 清除表单状态
 */
export async function clearVlogFormState(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(STATE_STORE_NAME);
    const request = store.delete('vlog-form');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
