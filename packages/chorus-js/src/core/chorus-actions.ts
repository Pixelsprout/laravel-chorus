import axios, { AxiosInstance } from 'axios';
import { ClientWritesCollector, createWritesProxy, WriteOperation, ModelProxy, WritesProxy } from './writes-collector';
import { ChorusCore } from './chorus';
import { ChorusDatabase } from './db';

export interface ChorusActionResponse {
  success: boolean;
  operations?: {
    success: boolean;
    index: number;
    operation: {
      table: string;
      operation: string;
      data: any;
    };
    data?: any;
    error?: string;
  }[];
  summary?: {
    total: number;
    successful: number;
    failed: number;
  };
  error?: string;
}

export interface ChorusActionConfig {
  allowOfflineWrites: boolean;
  supportsBatch: boolean;
}

export interface ChorusActionMeta {
  className: string;
  allowOfflineWrites: boolean;
  supportsBatch: boolean;
}

export class ChorusActionsAPI {
  private axios: AxiosInstance;
  private baseURL: string;
  private cache: Map<string, ChorusActionResponse> = new Map();
  private chorusCore: ChorusCore | null = null;

  constructor(baseURL: string = '/api', axiosConfig?: any, chorusCore?: ChorusCore) {
    this.baseURL = baseURL;
    this.chorusCore = chorusCore || null;
    this.axios = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      ...axiosConfig,
    });

    // Add CSRF token handling for Laravel
    this.setupCSRFHandling();
    
    // Set up automatic offline sync when coming back online
    this.setupOfflineSync();
  }

  private setupCSRFHandling() {
    // Get CSRF token from meta tag or cookie
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
      this.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    }
  }

  private setupOfflineSync() {
    // Listen for when the browser comes back online
    window.addEventListener('online', () => {
      console.log('[ChorusActionsAPI] Network restored, attempting to sync offline actions...');
      this.syncOfflineActions().catch(error => {
        console.error('[ChorusActionsAPI] Failed to sync offline actions after coming online:', error);
      });
    });

    // Also sync when the page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
        if (offlineActions.length > 0) {
          console.log('[ChorusActionsAPI] Page visible and online, syncing offline actions...');
          this.syncOfflineActions().catch(error => {
            console.error('[ChorusActionsAPI] Failed to sync offline actions on visibility change:', error);
          });
        }
      }
    });
  }

  /**
   * Set the ChorusCore instance for database integration
   */
  setChorusCore(chorusCore: ChorusCore): void {
    this.chorusCore = chorusCore;
  }

  /**
   * Get the current ChorusCore instance
   */
  getChorusCore(): ChorusCore | null {
    return this.chorusCore;
  }

  /**
   * Execute a ChorusAction with callback-style writes collection
   */
  async executeActionWithCallback(
    actionName: string,
    callback: (writes: WritesProxy) => void,
    options: {
      optimistic?: boolean;
      offline?: boolean;
    } = {}
  ): Promise<ChorusActionResponse> {
    const collector = new ClientWritesCollector();
    const writesProxy = createWritesProxy(collector);
    
    // Collect writes by executing the callback
    collector.startCollecting();
    try {
      callback(writesProxy);
    } finally {
      collector.stopCollecting();
    }
    
    const operations = collector.getOperations();
    
    // Handle optimistic updates first
    if (options.optimistic) {
      this.handleOptimisticUpdates(operations);
    }
    
    // Convert operations to the format expected by the server
    const requestData = {
      operations: operations,
      // Include any additional metadata needed
    };
    
    const endpoint = `/actions/${actionName}`;
    
    try {
      // Handle offline mode
      if (options.offline && this.isOffline()) {
        return this.handleOfflineActionWithOperations(actionName, operations);
      }

      const response = await this.axios.post(endpoint, requestData);
      
      if (response.data.success) {
        // Cache successful responses for offline support
        this.cacheResponse(`${actionName}:${JSON.stringify(operations)}`, response.data);
      }

      return response.data;
    } catch (error: any) {
      // Rollback optimistic updates on failure
      if (options.optimistic) {
        await this.rollbackOptimisticUpdates(operations);
      }

      // Handle network errors
      if (this.isNetworkError(error)) {
        return this.handleOfflineActionWithOperations(actionName, operations);
      }

      // Handle validation errors
      if (error.response?.status === 422) {
        return {
          success: false,
          error: 'Validation failed',
          // @ts-ignore
          validation_errors: error.response.data.validation_errors,
        };
      }

      throw error;
    }
  }

  /**
   * Execute a ChorusAction (legacy method)
   */
  async executeAction<T = any>(
    actionName: string,
    params: Record<string, any>,
    options: {
      optimistic?: boolean;
      offline?: boolean;
      batch?: boolean;
    } = {}
  ): Promise<ChorusActionResponse> {
    const endpoint = `/actions/${actionName}`;
    
    try {
      // Handle offline mode
      if (options.offline && this.isOffline()) {
        return this.handleOfflineAction(actionName, params, options);
      }

      // Handle optimistic updates
      if (options.optimistic) {
        this.handleOptimisticUpdate(actionName, params);
      }

      const response = await this.axios.post(endpoint, params);
      
      if (response.data.success) {
        // Cache successful responses for offline support
        this.cacheResponse(`${actionName}:${JSON.stringify(params)}`, response.data);
      }

      return response.data;
    } catch (error: any) {
      // Handle network errors
      if (this.isNetworkError(error)) {
        return this.handleOfflineAction(actionName, params, options);
      }

      // Handle validation errors
      if (error.response?.status === 422) {
        return {
          success: false,
          error: 'Validation failed',
          // @ts-ignore
          validation_errors: error.response.data.validation_errors,
        };
      }

      throw error;
    }
  }

  /**
   * Execute a batch of actions
   */
  async executeBatch(
    actionName: string,
    items: Record<string, any>[],
    options: { optimistic?: boolean; offline?: boolean } = {}
  ): Promise<ChorusActionResponse> {
    const endpoint = `/actions/${actionName}`;
    
    try {
      if (options.optimistic) {
        items.forEach(item => this.handleOptimisticUpdate(actionName, item));
      }

      const response = await this.axios.post(endpoint, { 
        batch: items 
      });

      return response.data;
    } catch (error: any) {
      if (this.isNetworkError(error) && options.offline) {
        return this.handleOfflineBatch(actionName, items);
      }
      throw error;
    }
  }

  /**
   * Create a typed action client (legacy method)
   */
  createActionClient(
    actionMeta: Record<string, ChorusActionMeta> = {}
  ): Record<string, (params: Record<string, any>, options?: any) => Promise<ChorusActionResponse>> {
    const client: Record<string, (params: Record<string, any>, options?: any) => Promise<ChorusActionResponse>> = {};

    for (const [actionName, meta] of Object.entries(actionMeta)) {
      // Create a function for each action
      client[actionName] = (params: Record<string, any>, options?: any) => {
        return this.executeAction(actionName, params, {
          optimistic: meta.allowOfflineWrites,
          offline: meta.allowOfflineWrites,
          ...options,
        });
      };
    }

    return client;
  }

  private handleOptimisticUpdate(actionName: string, params: Record<string, any>) {
    // Emit optimistic update event for UI to handle
    window.dispatchEvent(new CustomEvent('chorus:optimistic-update', {
      detail: { actionName, params }
    }));
  }

  private async handleOptimisticUpdates(operations: WriteOperation[]) {
    if (!this.chorusCore) {
      // Fallback to event emission if no ChorusCore is available
      operations.forEach(operation => {
        window.dispatchEvent(new CustomEvent('chorus:optimistic-operation', {
          detail: operation
        }));
      });
      return;
    }

    const db = this.chorusCore.getDb();
    if (!db || !this.chorusCore.getIsInitialized()) {
      console.warn('[ChorusActionsAPI] Cannot perform optimistic updates: database not ready');
      return;
    }

    // Process each operation and write to delta/shadow tables
    for (const operation of operations) {
      try {
        await this.writeOptimisticOperation(db, operation);
      } catch (error) {
        console.error('[ChorusActionsAPI] Failed to write optimistic operation:', operation, error);
      }
    }
  }

  private async writeOptimisticOperation(db: ChorusDatabase, operation: WriteOperation) {
    const { table, operation: operationType, data } = operation;
    const deltaTableName = `${table}_deltas`;
    const shadowTableName = `${table}_shadow`;

    // Write to delta table for tracking
    const deltaEntry = {
      operation: operationType,
      data: data,
      sync_status: 'pending',
      timestamp: operation.timestamp || Date.now(),
    };

    await db.table(deltaTableName).add(deltaEntry);

    // Handle optimistic updates to shadow table for immediate UI feedback
    switch (operationType) {
      case 'create':
        // Add new record to shadow table
        await db.table(shadowTableName).put(data);
        break;
        
      case 'update':
        if (!data.id) {
          console.warn('[ChorusActionsAPI] Update operation missing id:', data);
          break;
        }
        // Update existing record in shadow table, or create if doesn't exist
        const existing = await db.table(shadowTableName).get(data.id);
        if (existing) {
          await db.table(shadowTableName).put({ ...existing, ...data });
        } else {
          // If not in shadow, get from main table and update
          const mainRecord = await db.table(table).get(data.id);
          if (mainRecord) {
            await db.table(shadowTableName).put({ ...mainRecord, ...data });
          }
        }
        break;
        
      case 'delete':
        if (!data.id) {
          console.warn('[ChorusActionsAPI] Delete operation missing id:', data);
          break;
        }
        // Remove from shadow table
        await db.table(shadowTableName).delete(data.id);
        break;
    }

    console.log(`[ChorusActionsAPI] Optimistic ${operationType} written for ${table}:`, data);
  }

  private async handleOfflineActionWithOperations(
    actionName: string,
    operations: WriteOperation[]
  ): Promise<ChorusActionResponse> {
    // Store action for later sync
    this.storeOfflineActionWithOperations(actionName, operations);
    
    // Return optimistic response
    return {
      success: true,
      operations: operations.map((op, index) => ({
        success: true,
        index,
        operation: {
          table: op.table,
          operation: op.operation,
          data: op.data,
        },
        data: op.data,
      })),
      summary: {
        total: operations.length,
        successful: operations.length,
        failed: 0,
      },
    };
  }

  private async handleOfflineAction(
    actionName: string,
    params: Record<string, any>,
    options: any
  ): Promise<ChorusActionResponse> {
    // Store action for later sync
    this.storeOfflineAction(actionName, params);
    
    // Return optimistic response
    return {
      success: true,
      operations: [{
        success: true,
        index: 0,
        operation: {
          table: 'offline',
          operation: actionName,
          data: params,
        },
        data: params,
      }],
      summary: {
        total: 1,
        successful: 1,
        failed: 0,
      },
    };
  }

  private async handleOfflineBatch(
    actionName: string,
    items: Record<string, any>[]
  ): Promise<ChorusActionResponse> {
    items.forEach(item => this.storeOfflineAction(actionName, item));
    
    return {
      success: true,
      operations: items.map((item, index) => ({
        success: true,
        index,
        operation: {
          table: 'offline',
          operation: actionName,
          data: item,
        },
        data: item,
      })),
      summary: {
        total: items.length,
        successful: items.length,
        failed: 0,
      },
    };
  }

  private storeOfflineAction(actionName: string, params: Record<string, any>) {
    const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
    offlineActions.push({
      actionName,
      params,
      timestamp: Date.now(),
    });
    localStorage.setItem('chorus_offline_actions', JSON.stringify(offlineActions));
  }

  private storeOfflineActionWithOperations(actionName: string, operations: WriteOperation[]) {
    const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
    offlineActions.push({
      actionName,
      operations,
      timestamp: Date.now(),
    });
    localStorage.setItem('chorus_offline_actions', JSON.stringify(offlineActions));
  }

  private cacheResponse(key: string, response: ChorusActionResponse) {
    this.cache.set(key, response);
  }

  private isOffline(): boolean {
    return !navigator.onLine;
  }

  private isNetworkError(error: any): boolean {
    return !error.response || error.code === 'NETWORK_ERROR';
  }

  /**
   * Rollback optimistic updates for failed operations
   */
  async rollbackOptimisticUpdates(operations: WriteOperation[]): Promise<void> {
    if (!this.chorusCore) {
      console.warn('[ChorusActionsAPI] Cannot rollback: no ChorusCore instance');
      return;
    }

    const db = this.chorusCore.getDb();
    if (!db || !this.chorusCore.getIsInitialized()) {
      console.warn('[ChorusActionsAPI] Cannot rollback: database not ready');
      return;
    }

    // Process each operation and rollback optimistic changes
    for (const operation of operations) {
      try {
        await this.rollbackOptimisticOperation(db, operation);
      } catch (error) {
        console.error('[ChorusActionsAPI] Failed to rollback optimistic operation:', operation, error);
      }
    }
  }

  private async rollbackOptimisticOperation(db: ChorusDatabase, operation: WriteOperation) {
    const { table, operation: operationType, data } = operation;
    const deltaTableName = `${table}_deltas`;
    const shadowTableName = `${table}_shadow`;

    // Find and mark the corresponding delta as rejected
    const pendingDeltas = await db.table(deltaTableName)
      .where('sync_status')
      .equals('pending')
      .toArray();

    for (const delta of pendingDeltas) {
      if (JSON.stringify(delta.data) === JSON.stringify(data)) {
        await db.table(deltaTableName).update(delta.id, {
          sync_status: 'rejected',
          rejected_reason: 'Action failed on server'
        });
        break;
      }
    }

    // Remove optimistic changes from shadow table
    switch (operationType) {
      case 'create':
        if (data.id) {
          await db.table(shadowTableName).delete(data.id);
        }
        break;
        
      case 'update':
        if (data.id) {
          // Restore original record from main table to shadow
          const originalRecord = await db.table(table).get(data.id);
          if (originalRecord) {
            await db.table(shadowTableName).put(originalRecord);
          } else {
            await db.table(shadowTableName).delete(data.id);
          }
        }
        break;
        
      case 'delete':
        if (data.id) {
          // Restore the deleted record to shadow table from main table
          const originalRecord = await db.table(table).get(data.id);
          if (originalRecord) {
            await db.table(shadowTableName).put(originalRecord);
          }
        }
        break;
    }

    console.log(`[ChorusActionsAPI] Optimistic ${operationType} rolled back for ${table}:`, data);
  }

  /**
   * Sync offline actions when coming back online
   */
  async syncOfflineActions(): Promise<void> {
    const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
    
    if (offlineActions.length === 0) return;

    console.log(`[ChorusActionsAPI] Syncing ${offlineActions.length} offline actions...`);
    
    const synced: any[] = [];
    const failed: any[] = [];

    for (const action of offlineActions) {
      try {
        let result: ChorusActionResponse;
        
        // Handle new operations format
        if (action.operations && Array.isArray(action.operations)) {
          // Recreate the callback that would generate these operations
          const callback = (writes: any) => {
            action.operations.forEach((op: WriteOperation) => {
              const tableProxy = writes[op.table];
              if (tableProxy && typeof tableProxy[op.operation] === 'function') {
                tableProxy[op.operation](op.data);
              }
            });
          };
          
          result = await this.executeActionWithCallback(action.actionName, callback, { 
            offline: false,
            optimistic: false // Don't do optimistic updates during sync
          });
        } 
        // Handle legacy params format
        else if (action.params) {
          result = await this.executeAction(action.actionName, action.params, { offline: false });
        } 
        else {
          console.warn('[ChorusActionsAPI] Skipping malformed offline action:', action);
          failed.push(action);
          continue;
        }
        
        if (result.success) {
          synced.push(action);
          console.log(`[ChorusActionsAPI] Successfully synced offline action: ${action.actionName}`);
        } else {
          failed.push(action);
          console.error(`[ChorusActionsAPI] Failed to sync offline action: ${action.actionName}`, result.error);
        }
      } catch (error) {
        failed.push(action);
        console.error('[ChorusActionsAPI] Failed to sync offline action:', action, error);
      }
    }

    // Only clear successfully synced actions
    if (synced.length > 0) {
      if (failed.length === 0) {
        // All actions synced successfully, clear storage
        localStorage.removeItem('chorus_offline_actions');
        console.log(`[ChorusActionsAPI] All ${synced.length} offline actions synced successfully`);
      } else {
        // Some actions failed, keep only the failed ones
        localStorage.setItem('chorus_offline_actions', JSON.stringify(failed));
        console.log(`[ChorusActionsAPI] ${synced.length} actions synced, ${failed.length} actions remain offline`);
      }
    }
  }
}

/**
 * Global ChorusActionsAPI instance for integration
 */
let globalChorusActionsAPI: ChorusActionsAPI | null = null;

/**
 * Get or create the global ChorusActionsAPI instance
 */
export function getGlobalChorusActionsAPI(): ChorusActionsAPI {
  if (!globalChorusActionsAPI) {
    globalChorusActionsAPI = new ChorusActionsAPI();
  }
  return globalChorusActionsAPI;
}

/**
 * Connect ChorusActionsAPI with ChorusCore for optimistic updates
 */
export function connectChorusActionsAPI(chorusCore: ChorusCore, chorusActionsAPI?: ChorusActionsAPI): void {
  const api = chorusActionsAPI || getGlobalChorusActionsAPI();
  api.setChorusCore(chorusCore);
  console.log('[Chorus] ChorusActionsAPI connected to ChorusCore');
  
  // Trigger initial sync if we're online and have pending actions
  if (navigator.onLine) {
    const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
    if (offlineActions.length > 0) {
      console.log('[ChorusActionsAPI] Found pending offline actions on initialization, syncing...');
      api.syncOfflineActions().catch(error => {
        console.error('[ChorusActionsAPI] Failed to sync offline actions on initialization:', error);
      });
    }
  }
}