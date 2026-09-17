import { getSyncQueue, markSynced, incrementSyncAttempt } from './offline-manager';

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 60000]; // 1s, 2s, 4s, 8s, 60s

export class SyncEngine {
  private isSyncing = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private syncMutation: ((payload: any) => Promise<void>) | null = null;

  setSyncMutation(mutation: (payload: any) => Promise<void>) {
    this.syncMutation = mutation;
  }

  constructor() {
    // Listen for online event
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flush();
      });
    }
  }

  async flush(): Promise<void> {
    if (this.isSyncing) return;
    if (!navigator.onLine) return;

    this.isSyncing = true;

    try {
      const queue = await getSyncQueue();
      const syncedIds: string[] = [];

      for (const item of queue) {
        try {
          await this.syncItem(item);
          syncedIds.push(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          await incrementSyncAttempt(item.id);
          
          // Schedule retry if under max attempts
          if (item.attempts < MAX_RETRY_ATTEMPTS) {
            this.scheduleRetry(item.id, item.attempts);
          }
        }
      }

      if (syncedIds.length > 0) {
        await markSynced(syncedIds);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: any): Promise<void> {
    if (!this.syncMutation) {
      throw new Error('Sync mutation not configured');
    }

    switch (item.type) {
      case 'progress':
        await this.syncMutation(item.payload);
        break;
      case 'bookmark':
        // Handle bookmark sync if needed
        break;
    }
  }

  private scheduleRetry(itemId: string, attempt: number): void {
    const existingTimeout = this.retryTimeouts.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(itemId);
      this.flush();
    }, delay);

    this.retryTimeouts.set(itemId, timeout);
  }

  // Register background sync if supported
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const swRegistration = registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
        if (swRegistration.sync) {
          await swRegistration.sync.register('sync-reading-progress');
        }
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
