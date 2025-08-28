// Offline support for Chorus
import axios from 'axios';

export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  optimisticData?: any; // Store the optimistic data for duplicate checking
}

export interface RequestGroup {
  type: string;
  resource: string;
  requests: OfflineRequest[];
  canBatch: boolean;
}

export interface BatchRequest {
  operations: Array<{
    method: string;
    url: string;
    body?: any;
    headers?: Record<string, string>;
  }>;
}

export interface OfflineState {
  isOnline: boolean;
  pendingRequests: OfflineRequest[];
  lastSyncAttempt: Date | null;
}

const OFFLINE_REQUESTS_KEY = 'chorus_offline_requests';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

export class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up browser online/offline event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.log('Browser came online');
      this.onlineCallbacks.forEach(callback => callback());
      // Automatically process pending requests when coming back online
      this.processPendingRequests().catch(err => {
        console.error('[Chorus Offline] Error processing pending requests after coming online:', err);
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.log('Browser went offline');
      this.offlineCallbacks.forEach(callback => callback());
    });
  }

  /**
   * Register callback for when browser comes online
   */
  public onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  /**
   * Register callback for when browser goes offline
   */
  public onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  /**
   * Check if browser is currently online
   */
  public getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Cache a request for later processing when online
   */
  public cacheRequest(
    url: string,
    method: string,
    body?: string,
    headers?: Record<string, string>,
    optimisticData?: any
  ): string {


    // CSRF tokens are now handled automatically by axios
    const requestHeaders = {
      ...headers,
    };

    const request: OfflineRequest = {
      id: this.generateRequestId(),
      url,
      method: method.toUpperCase(),
      body,
      headers: requestHeaders,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      optimisticData,
    };

    const pendingRequests = this.getPendingRequests();
    pendingRequests.push(request);
    this.savePendingRequests(pendingRequests);

    this.log(`Cached offline request: ${method} ${url}`, request);
    return request.id;
  }

  /**
   * Get all pending offline requests
   */
  private getPendingRequests(): OfflineRequest[] {
    try {
      const stored = localStorage.getItem(OFFLINE_REQUESTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading pending requests:', err);
      return [];
    }
  }

  /**
   * Save pending requests to localStorage
   */
  private savePendingRequests(requests: OfflineRequest[]): void {
    try {
      localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify(requests));
    } catch (err) {
      console.error('Error saving pending requests:', err);
    }
  }

  /**
   * Process all pending requests when coming back online
   */
  public async processPendingRequests(): Promise<void> {
    if (!this.isOnline) {
      this.log('Cannot process pending requests - still offline');
      return;
    }

    if (this.isProcessing) {
      this.log('Already processing pending requests, skipping...');
      return;
    }

    const pendingRequests = this.getPendingRequests();
    if (pendingRequests.length === 0) {
      this.log('No pending requests to process');
      return;
    }

    this.isProcessing = true;

    this.log(`Processing ${pendingRequests.length} pending requests`);

    // Group requests for potential batching
    const requestGroups = this.groupCachedRequests(pendingRequests);
    
    const successfulRequests: string[] = [];
    const failedRequests: OfflineRequest[] = [];

    for (const group of requestGroups) {
      if (group.canBatch && group.requests.length > 1) {
        // Process as batch
        this.log(`Processing batch of ${group.requests.length} ${group.resource} requests (type: ${group.type})`);
        const batchResult = await this.processBatchRequests(group);
        successfulRequests.push(...batchResult.successful);
        failedRequests.push(...batchResult.failed);
      } else {
        // Process individually
        for (const request of group.requests) {
          const result = await this.processIndividualRequest(request);
          if (result.success) {
            successfulRequests.push(request.id);
          } else if (result.shouldRetry) {
            failedRequests.push(request);
          }
          
          // Add delay between requests to avoid overwhelming the server
          if (group.requests.indexOf(request) < group.requests.length - 1) {
            await this.delay(RETRY_DELAY);
          }
        }
      }
    }

    // Update pending requests (remove successful ones, keep failed ones for retry)
    this.savePendingRequests(failedRequests);

    this.log(`Processed ${successfulRequests.length} requests successfully, ${failedRequests.length} requests still pending`);
    
    this.isProcessing = false;
  }

  /**
   * Execute request with token already updated
   */
  private async executeRequestWithToken(request: OfflineRequest): Promise<boolean> {
    try {
      await axios({
        method: request.method.toLowerCase() as any,
        url: request.url,
        data: request.body ? JSON.parse(request.body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
      });

      this.log(`Request successful: ${request.method} ${request.url}`);
      return true;
    } catch (err: any) {
      if (err.response) {
        this.log(`Request failed with status ${err.response.status}: ${request.method} ${request.url}`);
      } else {
        console.error(`Error executing request ${request.method} ${request.url}:`, err);
      }
      return false;
    }
  }

  /**
   * Get current offline state
   */
  public getOfflineState(): OfflineState {
    return {
      isOnline: this.isOnline,
      pendingRequests: this.getPendingRequests(),
      lastSyncAttempt: null, // TODO: Track last sync attempt
    };
  }

  /**
   * Clear all pending requests (useful for testing or manual cleanup)
   */
  public clearPendingRequests(): void {
    localStorage.removeItem(OFFLINE_REQUESTS_KEY);
    this.log('Cleared all pending requests');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Group cached requests by resource type for potential batching
   */
  private groupCachedRequests(requests: OfflineRequest[]): RequestGroup[] {
    const groups = new Map<string, OfflineRequest[]>();
    const seenLoadActions = new Set<string>();
    
    requests.forEach(req => {
      const resource = this.extractResourceFromUrl(req.url);
      
      // Handle loadActions deduplication
      if (req.method === 'GET' && req.url.includes('/actions/')) {
        const actionKey = `loadActions:${resource}`;
        if (seenLoadActions.has(actionKey)) {
          // Skip duplicate loadActions requests
          this.log(`Skipping duplicate loadActions request for ${resource}`);
          return;
        }
        seenLoadActions.add(actionKey);
        
        if (!groups.has(actionKey)) {
          groups.set(actionKey, []);
        }
        groups.get(actionKey)!.push(req);
        return;
      }
      
      // Handle write actions grouping by action type
      if (req.url.includes('/write/')) {
        const urlParts = req.url.split('/');
        const writeIndex = urlParts.indexOf('write');
        const actionName = urlParts[writeIndex + 2]; // e.g., "create", "update", "delete"
        const key = `${req.method}:${resource}:${actionName}`;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(req);
        return;
      }
      
      // Default grouping for other requests
      const key = `${req.method}:${resource}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(req);
    });
    
    return Array.from(groups.entries()).map(([key, reqs]) => {
      const keyParts = key.split(':');
      const method = keyParts[0];
      const resource = keyParts[1];
      const actionName = keyParts[2]; // For write actions
      
      return {
        type: key,
        resource,
        requests: reqs,
        canBatch: this.isBatchable(method, resource, actionName) && reqs.length > 1
      };
    });
  }

  /**
   * Extract resource name from URL (e.g., "messages" from "/api/write/messages/create")
   */
  private extractResourceFromUrl(url: string): string {
    const urlParts = url.split('/').filter(part => part.length > 0);
    
    // Handle write action URLs: /api/write/messages/create -> messages
    if (urlParts.includes('write') && urlParts.length >= 3) {
      const writeIndex = urlParts.indexOf('write');
      return urlParts[writeIndex + 1] || 'unknown';
    }
    
    // Handle actions URLs: /api/actions/messages -> messages  
    if (urlParts.includes('actions') && urlParts.length >= 3) {
      const actionsIndex = urlParts.indexOf('actions');
      return urlParts[actionsIndex + 1] || 'unknown';
    }
    
    // Fallback to last meaningful part
    return urlParts[urlParts.length - 1] || 'unknown';
  }

  /**
   * Check if a resource type can be batched
   */
  private isBatchable(method: string, resource: string, actionName?: string): boolean {
    // loadActions requests should never be batched (they're deduplicated instead)
    if (method === 'GET' && resource) {
      return false;
    }
    
    // Define which resources support batching for write actions
    const batchableResources = ['messages', 'posts', 'comments'];
    const batchableActions = ['create', 'update', 'delete'];
    
    // Only batch write actions (POST to /write/ endpoints)
    if (method === 'POST' && actionName && batchableActions.includes(actionName)) {
      return batchableResources.includes(resource.toLowerCase());
    }
    
    return false;
  }

  /**
   * Process a group of requests as a batch
   */
  private async processBatchRequests(
    group: RequestGroup, 
  ): Promise<{ successful: string[], failed: OfflineRequest[] }> {
    const successful: string[] = [];
    const failed: OfflineRequest[] = [];

    try {
      // Extract action name from the group type (e.g., "POST:messages:create" -> "create")
      const keyParts = group.type.split(':');
      const actionName = keyParts[2];
      
      if (!actionName) {
        this.log(`No action name found for batch group ${group.type}, falling back to individual requests`);
        // Fall back to individual processing
        for (const request of group.requests) {
          const result = await this.processIndividualRequest(request);
          if (result.success) {
            successful.push(request.id);
          } else if (result.shouldRetry) {
            failed.push(request);
          }
        }
        return { successful, failed };
      }

      // Prepare batch payload with items array (matching our write actions batch format)
      const items = group.requests.map(req => {
        return req.body ? JSON.parse(req.body) : {};
      });

      // Use the write actions batch endpoint format: /api/write/{table}/{action}
      const batchUrl = `/api/write/${group.resource}/${actionName}`;
      
      this.log(`Sending batch request to ${batchUrl} with ${items.length} items`);

      const response = await axios.post(batchUrl, { items }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = response.data;
      
      // Handle batch response format from our write actions
      if (result.success && result.data && result.data.results) {
        result.data.results.forEach((itemResult: any, index: number) => {
          const request = group.requests[index];
          if (itemResult.success) {
            successful.push(request.id);
            this.log(`Successfully processed batch item ${index}: ${request.method} ${request.url}`);
          } else {
            request.retryCount++;
            if (request.retryCount < request.maxRetries) {
              failed.push(request);
              this.log(`Batch item ${index} failed, will retry: ${request.method} ${request.url}`);
            } else {
              this.log(`Batch item ${index} failed permanently: ${request.method} ${request.url}`);
            }
          }
        });
      } else {
        this.log(`Unexpected batch response format, falling back to individual requests`);
        // Fall back to individual processing
        for (const request of group.requests) {
          const result = await this.processIndividualRequest(request);
          if (result.success) {
            successful.push(request.id);
          } else if (result.shouldRetry) {
            failed.push(request);
          }
        }
      }
    } catch (err: any) {
      if (err.response) {
        this.log(`Batch request failed with status ${err.response.status}, falling back to individual requests`);
      } else {
        this.log(`Batch processing error, falling back to individual requests:`, err);
      }
      // Fall back to individual processing
      for (const request of group.requests) {
        const result = await this.processIndividualRequest(request);
        if (result.success) {
          successful.push(request.id);
        } else if (result.shouldRetry) {
          failed.push(request);
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Process an individual request
   */
  private async processIndividualRequest(
    request: OfflineRequest, 
  ): Promise<{ success: boolean, shouldRetry: boolean }> {
    try {
      const success = await this.executeRequestWithToken(request);
      if (success) {
        this.log(`Successfully processed request: ${request.method} ${request.url}`);
        return { success: true, shouldRetry: false };
      } else {
        request.retryCount++;
        const shouldRetry = request.retryCount < request.maxRetries;
        if (shouldRetry) {
          this.log(`Request failed, will retry: ${request.method} ${request.url} (attempt ${request.retryCount}/${request.maxRetries})`);
        } else {
          this.log(`Request failed permanently after ${request.maxRetries} attempts: ${request.method} ${request.url}`);
        }
        return { success: false, shouldRetry };
      }
    } catch (err) {
      request.retryCount++;
      const shouldRetry = request.retryCount < request.maxRetries;
      if (shouldRetry) {
        this.log(`Request error, will retry: ${request.method} ${request.url}`, err);
      } else {
        this.log(`Request failed permanently after error: ${request.method} ${request.url}`, err);
      }
      return { success: false, shouldRetry };
    }
  }

  /**
   * Simple logging utility
   */
  private log(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      if (data === undefined) {
        console.log(`[Chorus Offline] ${message}`);
      } else {
        console.log(`[Chorus Offline] ${message}`, data);
      }
    }
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();