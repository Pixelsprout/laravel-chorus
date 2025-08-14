import axios, { AxiosInstance } from 'axios';
import { ClientWritesCollector, createWritesProxy, WriteOperation, ModelProxy, WritesProxy } from './writes-collector';

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

  constructor(baseURL: string = '/api', axiosConfig?: any) {
    this.baseURL = baseURL;
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
  }

  private setupCSRFHandling() {
    // Get CSRF token from meta tag or cookie
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
      this.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    }
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

  private handleOptimisticUpdates(operations: WriteOperation[]) {
    // Emit optimistic update events for each operation
    operations.forEach(operation => {
      window.dispatchEvent(new CustomEvent('chorus:optimistic-operation', {
        detail: operation
      }));
    });
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
   * Sync offline actions when coming back online
   */
  async syncOfflineActions(): Promise<void> {
    const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
    
    if (offlineActions.length === 0) return;

    for (const action of offlineActions) {
      try {
        await this.executeAction(action.actionName, action.params, { offline: false });
      } catch (error) {
        console.error('Failed to sync offline action:', action, error);
      }
    }

    // Clear offline actions after successful sync
    localStorage.removeItem('chorus_offline_actions');
  }
}