import axios, { AxiosInstance } from 'axios';
import { ClientWritesCollector, createWritesProxy, createActionContext, WriteOperation, ModelProxy, WritesProxy, ActionContextLike } from './writes-collector';
import { ChorusCore } from './chorus';
import { ChorusDatabase } from './db';

export interface ValidationError {
  field: string;
  message: string;
  rule: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

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
  validation_errors?: ValidationError[];
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
    callback: (writes: WritesProxy) => any,
    options: {
      optimistic?: boolean;
      offline?: boolean;
      validate?: boolean;
      validationSchema?: any;
    } = {}
  ): Promise<ChorusActionResponse> {
    const collector = new ClientWritesCollector();
    const writesProxy = createWritesProxy(collector);
    
    // Collect writes by executing the callback and capture return value
    collector.startCollecting();
    let callbackData: any = undefined;
    try {
      callbackData = callback(writesProxy);
    } finally {
      collector.stopCollecting();
    }
    
    const operations = collector.getOperations();
    
    // Client-side validation if enabled and schema provided
    if (options.validate && options.validationSchema) {
      const validationResult = this.validateOperations(operations, callbackData, options.validationSchema);
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Client-side validation failed',
          validation_errors: validationResult.errors,
        };
      }
    }
    
    // Convert operations to the format expected by the server
    const requestData = {
      operations: operations,
      // Include any additional data returned by the callback
      ...(callbackData && typeof callbackData === 'object' ? { data: callbackData } : {})
    };
    
    const endpoint = `/actions/${actionName}`;
    
    try {
      // Handle offline mode
      if (options.offline && this.isOffline()) {
        return this.handleOfflineActionWithDelta(actionName, operations, callbackData);
      }

      // Handle optimistic updates for online requests
      if (options.optimistic) {
        this.handleOptimisticUpdates(operations, actionName, callbackData);
      }

      const response = await this.axios.post(endpoint, requestData);
      
      if (response.data.success) {
        // Mark deltas as synced if we have them
        if (options.optimistic) {
          await this.markDeltasAsSynced(actionName);
        }
        
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
        return this.handleOfflineActionWithDelta(actionName, operations, callbackData);
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
   * Execute a ChorusAction with simplified ActionContext-style API
   * This provides the same API as the server-side ActionContext
   */
  async executeActionWithContext(
    actionName: string,
    callback: (context: ActionContextLike) => any,
    options: {
      optimistic?: boolean;
      offline?: boolean;
      validate?: boolean;
      validationSchema?: any;
    } = {}
  ): Promise<ChorusActionResponse> {
    const collector = new ClientWritesCollector();
    const actionContext = createActionContext(collector);
    
    // Collect writes by executing the callback and capture return value
    collector.startCollecting();
    let callbackData: any = undefined;
    try {
      callbackData = callback(actionContext);
    } finally {
      collector.stopCollecting();
    }
    
    const operations = collector.getOperations();
    
    // Client-side validation if enabled and schema provided
    if (options.validate && options.validationSchema) {
      const validationResult = this.validateOperations(operations, callbackData, options.validationSchema);
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'Client-side validation failed',
          validation_errors: validationResult.errors,
        };
      }
    }
    
    // Convert operations to the format expected by the server
    const requestData = {
      operations: operations,
      // Include any additional data returned by the callback
      ...(callbackData && typeof callbackData === 'object' ? { data: callbackData } : {})
    };
    
    const endpoint = `/actions/${actionName}`;
    
    try {
      if (options.optimistic && this.chorusCore) {
        await this.handleOptimisticUpdates(operations, actionName, callbackData);
      }

      const response = await this.axios.post(endpoint, requestData);

      this.cache.set(actionName, response.data);

      return response.data;
    } catch (error: any) {
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

  private async handleOptimisticUpdates(
    operations: WriteOperation[], 
    actionName?: string,
    actionData?: any
  ) {
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
        await this.writeOptimisticOperation(db, operation, actionName, actionData);
      } catch (error) {
        console.error('[ChorusActionsAPI] Failed to write optimistic operation:', operation, error);
      }
    }
  }

  private async writeOptimisticOperation(
    db: ChorusDatabase, 
    operation: WriteOperation, 
    actionName?: string,
    actionData?: any
  ) {
    const { table, operation: operationType, data } = operation;
    const deltaTableName = `${table}_deltas`;
    const shadowTableName = `${table}_shadow`;

    // Write to delta table for tracking with action metadata
    const deltaEntry = {
      operation: operationType,
      data: data,
      sync_status: 'pending',
      timestamp: operation.timestamp || Date.now(),
      action_name: actionName || null,
      action_data: actionData ? JSON.stringify(actionData) : null,
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

  private async handleOfflineActionWithDelta(
    actionName: string,
    operations: WriteOperation[],
    actionData?: any
  ): Promise<ChorusActionResponse> {
    // Store optimistic updates in deltas with action metadata
    if (this.chorusCore) {
      await this.handleOptimisticUpdates(operations, actionName, actionData);
    }
    
    console.log(`[ChorusActionsAPI] Stored ${operations.length} operations offline for action: ${actionName}`);
    
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

  private async markDeltasAsSynced(actionName: string): Promise<void> {
    if (!this.chorusCore) {
      console.warn('[ChorusActionsAPI] Cannot mark deltas as synced: no ChorusCore instance');
      return;
    }

    const db = this.chorusCore.getDb();
    if (!db || !this.chorusCore.getIsInitialized()) {
      console.warn('[ChorusActionsAPI] Cannot mark deltas as synced: database not ready');
      return;
    }

    // Get all delta table names from the database schema
    const tableNames = db.tables.map(table => table.name);
    const deltaTableNames = tableNames.filter(name => name.endsWith('_deltas'));

    for (const deltaTableName of deltaTableNames) {
      try {
        // Find all pending deltas for this action
        const pendingDeltas = await db.table(deltaTableName)
          .where('action_name')
          .equals(actionName)
          .and(delta => delta.sync_status === 'pending')
          .toArray();

        // Mark them as synced
        for (const delta of pendingDeltas) {
          await db.table(deltaTableName).update(delta.id, {
            sync_status: 'synced',
            synced_at: Date.now()
          });
        }

        if (pendingDeltas.length > 0) {
          console.log(`[ChorusActionsAPI] Marked ${pendingDeltas.length} deltas as synced in ${deltaTableName}`);
        }
      } catch (error) {
        console.error(`[ChorusActionsAPI] Failed to mark deltas as synced in ${deltaTableName}:`, error);
      }
    }
  }

  private async markDeltasAsFailed(actionName: string, errorMessage: string): Promise<void> {
    if (!this.chorusCore) {
      console.warn('[ChorusActionsAPI] Cannot mark deltas as failed: no ChorusCore instance');
      return;
    }

    const db = this.chorusCore.getDb();
    if (!db || !this.chorusCore.getIsInitialized()) {
      console.warn('[ChorusActionsAPI] Cannot mark deltas as failed: database not ready');
      return;
    }

    // Get all delta table names from the database schema
    const tableNames = db.tables.map(table => table.name);
    const deltaTableNames = tableNames.filter(name => name.endsWith('_deltas'));

    for (const deltaTableName of deltaTableNames) {
      try {
        // Find all pending deltas for this action
        const pendingDeltas = await db.table(deltaTableName)
          .where('action_name')
          .equals(actionName)
          .and(delta => delta.sync_status === 'pending')
          .toArray();

        // Mark them as failed
        for (const delta of pendingDeltas) {
          await db.table(deltaTableName).update(delta.id, {
            sync_status: 'failed',
            failed_at: Date.now(),
            error_message: errorMessage
          });
        }

        if (pendingDeltas.length > 0) {
          console.log(`[ChorusActionsAPI] Marked ${pendingDeltas.length} deltas as failed in ${deltaTableName}`);
        }
      } catch (error) {
        console.error(`[ChorusActionsAPI] Failed to mark deltas as failed in ${deltaTableName}:`, error);
      }
    }
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
   * Sync offline actions when coming back online using delta tables
   */
  async syncOfflineActions(): Promise<void> {
    // Try delta-based sync first (new method)
    if (this.chorusCore) {
      await this.syncOfflineActionsFromDeltas();
    }
    
    // Fallback to legacy localStorage sync for any remaining actions
    await this.syncOfflineActionsFromLocalStorage();
  }

  /**
   * Sync offline actions from delta tables (new delta-based approach)
   */
  async syncOfflineActionsFromDeltas(): Promise<void> {
    if (!this.chorusCore) {
      console.warn('[ChorusActionsAPI] Cannot sync from deltas: no ChorusCore instance');
      return;
    }

    const db = this.chorusCore.getDb();
    if (!db || !this.chorusCore.getIsInitialized()) {
      console.warn('[ChorusActionsAPI] Cannot sync from deltas: database not ready');
      return;
    }

    // Get all delta table names
    const tableNames = db.tables.map(table => table.name);
    const deltaTableNames = tableNames.filter(name => name.endsWith('_deltas'));

    // Collect all pending deltas grouped by action name
    const pendingActionGroups = new Map<string, {
      operations: WriteOperation[];
      actionData?: any;
    }>();

    for (const deltaTableName of deltaTableNames) {
      try {
        const pendingDeltas = await db.table(deltaTableName)
          .where('sync_status')
          .equals('pending')
          .and(delta => delta.action_name)
          .toArray();
        
        // Sort by timestamp after retrieval
        pendingDeltas.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        for (const delta of pendingDeltas) {
          const tableName = deltaTableName.replace('_deltas', '');
          const actionName = delta.action_name;
          
          if (!pendingActionGroups.has(actionName)) {
            pendingActionGroups.set(actionName, { operations: [], actionData: undefined });
          }

          const group = pendingActionGroups.get(actionName)!;
          
          // Add the operation
          group.operations.push({
            table: tableName,
            operation: delta.operation,
            data: delta.data,
            timestamp: delta.timestamp
          });

          // Capture action data (should be the same for all deltas of the same action)
          if (delta.action_data && !group.actionData) {
            try {
              group.actionData = JSON.parse(delta.action_data);
            } catch (error) {
              console.warn('[ChorusActionsAPI] Failed to parse action_data:', delta.action_data);
            }
          }
        }
      } catch (error) {
        console.error(`[ChorusActionsAPI] Failed to read pending deltas from ${deltaTableName}:`, error);
      }
    }

    if (pendingActionGroups.size === 0) {
      return;
    }

    console.log(`[ChorusActionsAPI] Syncing ${pendingActionGroups.size} action types from deltas...`);

    // Sync each action with all its operations in one request
    for (const [actionName, group] of Array.from(pendingActionGroups.entries())) {
      try {
        // Sort operations by timestamp to preserve order
        group.operations.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        // Send all operations for this action - let server determine execution grouping
        const requestData = {
          operations: group.operations,
          // Include action data if it exists
          ...(group.actionData && { data: group.actionData })
        };

        const endpoint = `/actions/${actionName}`;
        const response = await this.axios.post(endpoint, requestData);

        if (response.data.success) {
          console.log(`[ChorusActionsAPI] Successfully synced action: ${actionName} with ${group.operations.length} operations`);
          await this.markDeltasAsSynced(actionName);
        } else {
          console.error(`[ChorusActionsAPI] Failed to sync action: ${actionName}`, response.data.error);
          await this.markDeltasAsFailed(actionName, response.data.error || 'Unknown error');
        }
      } catch (error: any) {
        console.error(`[ChorusActionsAPI] Failed to sync action: ${actionName}`, error);
        
        // Distinguish between network errors and server rejections
        if (this.isNetworkError(error)) {
          await this.markDeltasAsFailed(actionName, error instanceof Error ? error.message : 'Unknown error');
        } else {
          // Server rejection - rollback optimistic updates (marks as 'rejected')
          await this.rollbackOptimisticUpdates(group.operations);
        }
      }
    }
  }

  /**
   * Validate operations and data against a validation schema
   */
  private validateOperations(operations: WriteOperation[], callbackData: any, validationSchema: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate each operation
    for (const operation of operations) {
      const operationKey = `${operation.table}.${operation.operation}`;
      const schema = validationSchema[operationKey];
      
      if (schema) {
        const operationErrors = this.validateData(operation.data, schema, operationKey);
        errors.push(...operationErrors);
      }
    }

    // Validate callback data if provided and schema exists
    if (callbackData && validationSchema['data']) {
      const dataErrors = this.validateData(callbackData, validationSchema['data'], 'data');
      errors.push(...dataErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate data object against field constraints
   */
  private validateData(data: Record<string, any>, schema: Record<string, any>, prefix: string = ''): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [fieldName, constraints] of Object.entries(schema)) {
      const value = data[fieldName];
      const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
      
      // Required check
      if (constraints.required && (value === null || value === undefined || value === '')) {
        errors.push({
          field: fullFieldName,
          message: `${fieldName} is required`,
          rule: 'required',
          value
        });
        continue; // Stop further validation if required field is missing
      }

      // Skip other validations if value is empty and not required
      if (!constraints.required && (value === null || value === undefined || value === '')) {
        continue;
      }

      // Type validation
      if (constraints.type) {
        if (constraints.type === 'string' && typeof value !== 'string') {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be a string`,
            rule: 'string',
            value
          });
        } else if (constraints.type === 'number' && typeof value !== 'number') {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be a number`,
            rule: 'number',
            value
          });
        } else if (constraints.type === 'boolean' && typeof value !== 'boolean') {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be a boolean`,
            rule: 'boolean',
            value
          });
        }
      }

      // String-specific validations
      if (typeof value === 'string') {
        if (constraints.min !== undefined && value.length < constraints.min) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be at least ${constraints.min} characters`,
            rule: 'min',
            value
          });
        }
        if (constraints.max !== undefined && value.length > constraints.max) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} may not be greater than ${constraints.max} characters`,
            rule: 'max',
            value
          });
        }
        if (constraints.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be a valid UUID`,
            rule: 'uuid',
            value
          });
        }
        if (constraints.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be a valid email address`,
            rule: 'email',
            value
          });
        }
        if (constraints.url && !/^https?:\/\/.+/.test(value)) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be a valid URL`,
            rule: 'url',
            value
          });
        }
      }

      // Number-specific validations
      if (typeof value === 'number') {
        if (constraints.min !== undefined && value < constraints.min) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} must be at least ${constraints.min}`,
            rule: 'min',
            value
          });
        }
        if (constraints.max !== undefined && value > constraints.max) {
          errors.push({
            field: fullFieldName,
            message: `${fieldName} may not be greater than ${constraints.max}`,
            rule: 'max',
            value
          });
        }
      }

      // In validation
      if (constraints.in && constraints.in.length > 0 && !constraints.in.includes(value)) {
        errors.push({
          field: fullFieldName,
          message: `${fieldName} must be one of: ${constraints.in.join(', ')}`,
          rule: 'in',
          value
        });
      }
    }

    return errors;
  }

  /**
   * Legacy localStorage-based sync for backwards compatibility
   */
  async syncOfflineActionsFromLocalStorage(): Promise<void> {
    const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
    
    if (offlineActions.length === 0) return;

    console.log(`[ChorusActionsAPI] Syncing ${offlineActions.length} offline actions from localStorage...`);
    
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