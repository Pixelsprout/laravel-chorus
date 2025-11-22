export interface OfflineRequest {
    id: string;
    url: string;
    method: string;
    body?: string;
    headers?: Record<string, string>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    optimisticData?: any;
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
export interface OfflineLivewireCall {
    componentId: string;
    methodName: string;
    params: any[];
    timestamp: number;
}
export declare class OfflineManager {
    private isOnline;
    private onlineCallbacks;
    private offlineCallbacks;
    private isProcessing;
    constructor();
    /**
     * Set up browser online/offline event listeners
     */
    private setupEventListeners;
    /**
     * Register callback for when browser comes online
     */
    onOnline(callback: () => void): void;
    /**
     * Register callback for when browser goes offline
     */
    onOffline(callback: () => void): void;
    /**
     * Check if browser is currently online
     */
    getIsOnline(): boolean;
    /**
     * Cache a request for later processing when online
     */
    cacheRequest(url: string, method: string, body?: string, headers?: Record<string, string>, optimisticData?: any): string;
    /**
     * Get all pending offline requests
     */
    private getPendingRequests;
    /**
     * Save pending requests to localStorage
     */
    private savePendingRequests;
    /**
     * Process all pending requests when coming back online
     */
    processPendingRequests(): Promise<void>;
    /**
     * Execute request with token already updated
     */
    private executeRequestWithToken;
    /**
     * Get current offline state
     */
    getOfflineState(): OfflineState;
    /**
     * Clear all pending requests (useful for testing or manual cleanup)
     */
    clearPendingRequests(): void;
    /**
     * Cache a Livewire method call for replay when online
     */
    cacheLivewireMethodCall(call: OfflineLivewireCall): void;
    /**
     * Get all cached Livewire method calls
     */
    getLivewireMethodCalls(): OfflineLivewireCall[];
    /**
     * Clear all cached Livewire method calls
     */
    clearLivewireMethodCalls(): void;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Simple delay utility
     */
    private delay;
    /**
     * Group cached requests by resource type for potential batching
     */
    private groupCachedRequests;
    /**
     * Extract resource name from URL (e.g., "messages" from "/api/write/messages/create")
     */
    private extractResourceFromUrl;
    /**
     * Check if a resource type can be batched
     */
    private isBatchable;
    /**
     * Process a group of requests as a batch
     */
    private processBatchRequests;
    /**
     * Process an individual request
     */
    private processIndividualRequest;
    /**
     * Simple logging utility
     */
    private log;
}
export declare const offlineManager: OfflineManager;
