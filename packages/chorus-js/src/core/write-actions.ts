// Write Actions API for Chorus
import { csrfManager } from './csrf';
import { offlineManager } from './offline';

export interface WriteActionConfig {
  name: string;
  allowsOfflineWrites: boolean;
  supportsBatch: boolean;
  rules: Record<string, string>;
  config: Record<string, any>;
}

export interface WriteActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validation_errors?: Record<string, string[]>;
  action: string;
  table: string;
}

export interface BatchWriteResponse<T = any> {
  success: boolean;
  data?: {
    results: Array<{
      success: boolean;
      index: number;
      data?: T;
      error?: string;
      validation_errors?: Record<string, string[]>;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  };
  error?: string;
  action: string;
  table: string;
}

export class WriteActionsAPI {
  private baseUrl: string;
  private actions: Map<string, Record<string, WriteActionConfig>> = new Map();
  private loadingPromises: Map<string, Promise<Record<string, WriteActionConfig>>> = new Map();

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Load available actions for a table
   */
  async loadActions(tableName: string): Promise<Record<string, WriteActionConfig>> {
    // Check if actions are already cached
    const cachedActions = this.actions.get(tableName);
    if (cachedActions) {
      console.log(`[WriteActions] Using cached actions for '${tableName}'`);
      return cachedActions;
    }

    // Check if we're already loading actions for this table
    const existingPromise = this.loadingPromises.get(tableName);
    if (existingPromise) {
      console.log(`[WriteActions] Waiting for existing loadActions request for '${tableName}'`);
      return existingPromise;
    }

    // Check if we're offline
    if (!offlineManager.getIsOnline()) {
      // Cache the loadActions request for when we come back online
      const url = `${this.baseUrl}/actions/${tableName}`;
      offlineManager.cacheRequest(
        url,
        'GET',
        undefined,
        {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfManager.getToken() || '',
        }
      );

      // Return empty actions object for offline mode
      // This allows the write actions to still be attempted if they support offline writes
      console.warn(`[WriteActions] Offline mode: loadActions request for '${tableName}' cached for later execution`);
      return {};
    }

    // Create and cache the loading promise
    const loadingPromise = this.performLoadActions(tableName);
    this.loadingPromises.set(tableName, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Clean up the loading promise
      this.loadingPromises.delete(tableName);
    }
  }

  /**
   * Perform the actual loadActions request
   */
  private async performLoadActions(tableName: string): Promise<Record<string, WriteActionConfig>> {
    console.log(`[WriteActions] Loading actions for '${tableName}'`);
    
    try {
      const response = await fetch(`${this.baseUrl}/actions/${tableName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfManager.getToken() || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load actions: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        this.actions.set(tableName, result.actions);
        console.log(`[WriteActions] Successfully loaded ${Object.keys(result.actions).length} actions for '${tableName}'`);
        return result.actions;
      } else {
        throw new Error(result.error || 'Failed to load actions');
      }
    } catch (error) {
      console.error(`Error loading actions for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get cached actions for a table
   */
  getActions(tableName: string): Record<string, WriteActionConfig> | null {
    return this.actions.get(tableName) || null;
  }

  /**
   * Check if actions are loaded for a table
   */
  hasActions(tableName: string): boolean {
    return this.actions.has(tableName);
  }

  /**
   * Clear cached actions for a table (or all tables if no tableName provided)
   */
  clearActionsCache(tableName?: string): void {
    if (tableName) {
      this.actions.delete(tableName);
      this.loadingPromises.delete(tableName);
      console.log(`[WriteActions] Cleared actions cache for '${tableName}'`);
    } else {
      this.actions.clear();
      this.loadingPromises.clear();
      console.log(`[WriteActions] Cleared all actions cache`);
    }
  }

  /**
   * Execute a write action
   */
  async execute<T = any>(
    tableName: string,
    actionName: string,
    data: Record<string, any>
  ): Promise<WriteActionResponse<T>> {
    // Check if we're offline first
    if (!offlineManager.getIsOnline()) {
      // In offline mode, we assume the action supports offline writes
      // The actual validation will happen when we sync back online
      console.log(`[WriteActions] Offline mode: executing '${actionName}' optimistically`);
      return this.handleOfflineWrite(tableName, actionName, data);
    }

    // Ensure actions are loaded when online
    let actions = this.getActions(tableName);
    if (!actions) {
      actions = await this.loadActions(tableName);
    }

    const actionConfig = actions[actionName];
    if (!actionConfig) {
      throw new Error(`Action '${actionName}' not found for table '${tableName}'`);
    }

    return this.executeOnline(tableName, actionName, data);
  }

  /**
   * Execute a batch write action
   */
  async executeBatch<T = any>(
    tableName: string,
    actionName: string,
    items: Array<Record<string, any>>
  ): Promise<BatchWriteResponse<T>> {
    // Check if we're offline first
    if (!offlineManager.getIsOnline()) {
      // In offline mode, we assume the action supports offline writes and batching
      // The actual validation will happen when we sync back online
      console.log(`[WriteActions] Offline mode: executing batch '${actionName}' optimistically`);
      return this.handleOfflineBatchWrite(tableName, actionName, items);
    }

    // Ensure actions are loaded when online
    let actions = this.getActions(tableName);
    if (!actions) {
      actions = await this.loadActions(tableName);
    }

    const actionConfig = actions[actionName];
    if (!actionConfig) {
      throw new Error(`Action '${actionName}' not found for table '${tableName}'`);
    }

    if (!actionConfig.supportsBatch) {
      throw new Error(`Action '${actionName}' does not support batch operations`);
    }

    return this.executeBatchOnline(tableName, actionName, items);
  }

  /**
   * Execute action online
   */
  private async executeOnline<T = any>(
    tableName: string,
    actionName: string,
    data: Record<string, any>
  ): Promise<WriteActionResponse<T>> {
    try {
      const csrfToken = csrfManager.getToken();
      
      if (!csrfToken) {
        console.warn('[WriteActions] No CSRF token available, attempting to refresh...');
        await csrfManager.refreshToken();
      }

      const response = await fetch(`${this.baseUrl}/write/${tableName}/${actionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfManager.getToken() || '',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      // Handle CSRF token expiration
      if (response.status === 419) {
        console.log('[WriteActions] CSRF token expired, refreshing and retrying...');
        await csrfManager.refreshToken();
        return this.executeOnline(tableName, actionName, data);
      }

      return result;
    } catch (error) {
      console.error(`Error executing action ${actionName}:`, error);
      throw error;
    }
  }

  /**
   * Execute batch action online
   */
  private async executeBatchOnline<T = any>(
    tableName: string,
    actionName: string,
    items: Array<Record<string, any>>
  ): Promise<BatchWriteResponse<T>> {
    try {
      const csrfToken = csrfManager.getToken();
      
      if (!csrfToken) {
        console.warn('[WriteActions] No CSRF token available for batch, attempting to refresh...');
        await csrfManager.refreshToken();
      }

      const response = await fetch(`${this.baseUrl}/write/${tableName}/${actionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfManager.getToken() || '',
        },
        body: JSON.stringify({ items }),
      });

      const result = await response.json();

      // Handle CSRF token expiration
      if (response.status === 419) {
        console.log('[WriteActions] CSRF token expired in batch, refreshing and retrying...');
        await csrfManager.refreshToken();
        return this.executeBatchOnline(tableName, actionName, items);
      }

      return result;
    } catch (error) {
      console.error(`Error executing batch action ${actionName}:`, error);
      throw error;
    }
  }

  /**
   * Handle offline write by caching the request
   */
  private async handleOfflineWrite<T = any>(
    tableName: string,
    actionName: string,
    data: Record<string, any>
  ): Promise<WriteActionResponse<T>> {
    const url = `${this.baseUrl}/write/${tableName}/${actionName}`;
    const requestId = offlineManager.cacheRequest(
      url,
      'POST',
      JSON.stringify(data),
      {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfManager.getToken() || '',
      },
      data // Store optimistic data
    );

    // Return optimistic response
    return {
      success: true,
      data: data as T,
      action: actionName,
      table: tableName,
      // Add metadata to indicate this is an offline/optimistic response
      _offline: true,
      _requestId: requestId,
    } as WriteActionResponse<T> & { _offline: boolean; _requestId: string };
  }

  /**
   * Handle offline batch write by caching the request
   */
  private async handleOfflineBatchWrite<T = any>(
    tableName: string,
    actionName: string,
    items: Array<Record<string, any>>
  ): Promise<BatchWriteResponse<T>> {
    const url = `${this.baseUrl}/write/${tableName}/${actionName}`;
    const requestId = offlineManager.cacheRequest(
      url,
      'POST',
      JSON.stringify({ items }),
      {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfManager.getToken() || '',
      },
      items // Store optimistic data
    );

    // Return optimistic response
    return {
      success: true,
      data: {
        results: items.map((item, index) => ({
          success: true,
          index,
          data: item as T,
        })),
        summary: {
          total: items.length,
          successful: items.length,
          failed: 0,
        },
      },
      action: actionName,
      table: tableName,
      // Add metadata to indicate this is an offline/optimistic response
      _offline: true,
      _requestId: requestId,
    } as BatchWriteResponse<T> & { _offline: boolean; _requestId: string };
  }

  /**
   * Validate data against action rules (client-side validation)
   */
  validateData(tableName: string, actionName: string, data: Record<string, any>): string[] {
    const actions = this.getActions(tableName);
    if (!actions || !actions[actionName]) {
      return ['Action not found'];
    }

    const rules = actions[actionName].rules;
    const errors: string[] = [];

    // Basic client-side validation (can be extended)
    for (const [field, rule] of Object.entries(rules)) {
      if (rule.includes('required') && (!data[field] || data[field] === '')) {
        errors.push(`${field} is required`);
      }
    }

    return errors;
  }
}

/**
 * Callback function for optimistic updates
 */
export type OptimisticCallback<T = any> = (optimisticData: T) => void | Promise<void>;

/**
 * Table-specific write actions class with clean API
 */
export class TableWriteActions<T = any> {
  private api: WriteActionsAPI;
  private tableName: string;

  constructor(api: WriteActionsAPI, tableName: string) {
    this.api = api;
    this.tableName = tableName;
  }

  /**
   * Create a new record with optimistic update
   * @param optimisticData - The data for immediate optimistic update
   * @param serverData - The data to send to the server
   * @param callback - Optional callback function for server response
   */
  async create(
    optimisticData: T, 
    serverData: Record<string, any>, 
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>>;
  
  /**
   * Create a new record (simple version without optimistic update)
   * @param serverData - The data to send to the server
   * @param callback - Optional callback function for server response
   */
  async create(
    serverData: Record<string, any>, 
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>>;

  async create(
    optimisticDataOrServerData: T | Record<string, any>,
    serverDataOrCallback?: Record<string, any> | ((response: WriteActionResponse<T>) => void),
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>> {
    let optimisticData: T | undefined;
    let serverData: Record<string, any>;
    let responseCallback: ((response: WriteActionResponse<T>) => void) | undefined;

    // Handle overloaded parameters
    if (typeof serverDataOrCallback === 'function') {
      // Two parameter version: create(serverData, callback)
      serverData = optimisticDataOrServerData as Record<string, any>;
      responseCallback = serverDataOrCallback as (response: WriteActionResponse<T>) => void;
    } else {
      // Three parameter version: create(optimisticData, serverData, callback)
      optimisticData = optimisticDataOrServerData as T;
      serverData = serverDataOrCallback as Record<string, any>;
      responseCallback = callback;
    }

    try {
      // Perform optimistic update if provided
      if (optimisticData) {
        const optimisticCallback = this.getOptimisticCallback('create');
        if (optimisticCallback) {
          await optimisticCallback(optimisticData);
        }
      }

      // Execute server request
      const response = await this.api.execute<T>(this.tableName, 'create', serverData);
      
      if (responseCallback) {
        responseCallback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: WriteActionResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'create',
        table: this.tableName,
      };
      if (responseCallback) {
        responseCallback(errorResponse);
      }
      throw error;
    }
  }

  /**
   * Update an existing record with optimistic update
   * @param optimisticData - The data for immediate optimistic update
   * @param serverData - The data to send to the server
   * @param callback - Optional callback function for server response
   */
  async update(
    optimisticData: T, 
    serverData: Record<string, any>, 
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>>;
  
  /**
   * Update an existing record (simple version without optimistic update)
   * @param serverData - The data to send to the server
   * @param callback - Optional callback function for server response
   */
  async update(
    serverData: Record<string, any>, 
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>>;

  async update(
    optimisticDataOrServerData: T | Record<string, any>,
    serverDataOrCallback?: Record<string, any> | ((response: WriteActionResponse<T>) => void),
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>> {
    let optimisticData: T | undefined;
    let serverData: Record<string, any>;
    let responseCallback: ((response: WriteActionResponse<T>) => void) | undefined;

    // Handle overloaded parameters
    if (typeof serverDataOrCallback === 'function') {
      // Two parameter version: update(serverData, callback)
      serverData = optimisticDataOrServerData as Record<string, any>;
      responseCallback = serverDataOrCallback as (response: WriteActionResponse<T>) => void;
    } else {
      // Three parameter version: update(optimisticData, serverData, callback)
      optimisticData = optimisticDataOrServerData as T;
      serverData = serverDataOrCallback as Record<string, any>;
      responseCallback = callback;
    }

    try {
      // Perform optimistic update if provided
      if (optimisticData) {
        const optimisticCallback = this.getOptimisticCallback('update');
        if (optimisticCallback) {
          await optimisticCallback(optimisticData);
        }
      }

      // Execute server request
      const response = await this.api.execute<T>(this.tableName, 'update', serverData);
      
      if (responseCallback) {
        responseCallback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: WriteActionResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'update',
        table: this.tableName,
      };
      if (responseCallback) {
        responseCallback(errorResponse);
      }
      throw error;
    }
  }

  /**
   * Delete a record with optimistic update
   * @param optimisticData - The data for immediate optimistic update
   * @param serverData - The data to send to the server
   * @param callback - Optional callback function for server response
   */
  async delete(
    optimisticData: { id: string | number },
    serverData: Record<string, any>, 
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>>;
  
  /**
   * Delete a record (simple version without optimistic update)
   * @param serverData - The data to send to the server
   * @param callback - Optional callback function for server response
   */
  async delete(
    serverData: Record<string, any>, 
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>>;

  async delete(
    optimisticDataOrServerData: T | Record<string, any>,
    serverDataOrCallback?: Record<string, any> | ((response: WriteActionResponse<T>) => void),
    callback?: (response: WriteActionResponse<T>) => void
  ): Promise<WriteActionResponse<T>> {
    let optimisticData: T | undefined;
    let serverData: Record<string, any>;
    let responseCallback: ((response: WriteActionResponse<T>) => void) | undefined;

    // Handle overloaded parameters
    if (typeof serverDataOrCallback === 'function') {
      // Two parameter version: delete(serverData, callback)
      serverData = optimisticDataOrServerData as Record<string, any>;
      responseCallback = serverDataOrCallback as (response: WriteActionResponse<T>) => void;
    } else {
      // Three parameter version: delete(optimisticData, serverData, callback)
      optimisticData = optimisticDataOrServerData as T;
      serverData = serverDataOrCallback as Record<string, any>;
      responseCallback = callback;
    }

    try {
      // Perform optimistic update if provided
      if (optimisticData) {
        const optimisticCallback = this.getOptimisticCallback('delete');
        if (optimisticCallback) {
          await optimisticCallback(optimisticData);
        }
      }

      // Execute server request
      const response = await this.api.execute<T>(this.tableName, 'delete', serverData);
      
      if (responseCallback) {
        responseCallback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: WriteActionResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'delete',
        table: this.tableName,
      };
      if (responseCallback) {
        responseCallback(errorResponse);
      }
      throw error;
    }
  }

  private optimisticCallbacks: Map<string, OptimisticCallback<T>> = new Map();

  /**
   * Set the optimistic update callback for a specific action
   * @param action - The action name ('create', 'update', 'delete')
   * @param callback - Function to call for optimistic updates
   */
  setOptimisticCallback(action: string, callback: OptimisticCallback<T>): void {
    this.optimisticCallbacks.set(action, callback);
  }

  /**
   * Get the optimistic callback for an action
   * @param action - The action name
   */
  private getOptimisticCallback(action: string): OptimisticCallback<T> | undefined {
    return this.optimisticCallbacks.get(action);
  }

  /**
   * Execute a custom action
   * @param actionName - The name of the action
   * @param data - The data to send
   * @param callback - Optional callback function
   */
  async action(actionName: string, data: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>> {
    try {
      const response = await this.api.execute<T>(this.tableName, actionName, data);
      if (callback) {
        callback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: WriteActionResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: actionName,
        table: this.tableName,
      };
      if (callback) {
        callback(errorResponse);
      }
      throw error;
    }
  }

  /**
   * Create multiple records in a batch
   * @param items - Array of data objects to create
   * @param callback - Optional callback function
   */
  async createBatch(items: Array<Record<string, any>>, callback?: (response: BatchWriteResponse<T>) => void): Promise<BatchWriteResponse<T>> {
    try {
      const response = await this.api.executeBatch<T>(this.tableName, 'create', items);
      if (callback) {
        callback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: BatchWriteResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'create',
        table: this.tableName,
      };
      if (callback) {
        callback(errorResponse);
      }
      throw error;
    }
  }

  /**
   * Update multiple records in a batch
   * @param items - Array of data objects to update
   * @param callback - Optional callback function
   */
  async updateBatch(items: Array<Record<string, any>>, callback?: (response: BatchWriteResponse<T>) => void): Promise<BatchWriteResponse<T>> {
    try {
      const response = await this.api.executeBatch<T>(this.tableName, 'update', items);
      if (callback) {
        callback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: BatchWriteResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'update',
        table: this.tableName,
      };
      if (callback) {
        callback(errorResponse);
      }
      throw error;
    }
  }

  /**
   * Delete multiple records in a batch
   * @param items - Array of data objects to delete
   * @param callback - Optional callback function
   */
  async deleteBatch(items: Array<Record<string, any>>, callback?: (response: BatchWriteResponse<T>) => void): Promise<BatchWriteResponse<T>> {
    try {
      const response = await this.api.executeBatch<T>(this.tableName, 'delete', items);
      if (callback) {
        callback(response);
      }
      return response;
    } catch (error) {
      const errorResponse: BatchWriteResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'delete',
        table: this.tableName,
      };
      if (callback) {
        callback(errorResponse);
      }
      throw error;
    }
  }

  /**
   * Get the underlying API instance (for advanced usage)
   */
  getAPI(): WriteActionsAPI {
    return this.api;
  }

  /**
   * Get the table name
   */
  getTableName(): string {
    return this.tableName;
  }
}

/**
 * Enhanced WriteActionsAPI with table factory method
 */
export class EnhancedWriteActionsAPI extends WriteActionsAPI {
  private tableInstances: Map<string, TableWriteActions> = new Map();

  /**
   * Get a table-specific write actions instance
   * @param tableName - The name of the table
   */
  table<T = any>(tableName: string): TableWriteActions<T> {
    if (!this.tableInstances.has(tableName)) {
      this.tableInstances.set(tableName, new TableWriteActions<T>(this, tableName));
    }
    return this.tableInstances.get(tableName)! as TableWriteActions<T>;
  }

  /**
   * Clear table instances cache
   */
  clearTableInstances(): void {
    this.tableInstances.clear();
  }
}

// Export singleton instance with enhanced API
export const writeActions = new EnhancedWriteActionsAPI();

// Export the original API for backward compatibility
export const writeActionsAPI = new WriteActionsAPI();