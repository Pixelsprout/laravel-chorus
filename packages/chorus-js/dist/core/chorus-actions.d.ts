import { WritesProxy } from './writes-collector';
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
export declare class ChorusActionsAPI {
    private axios;
    private baseURL;
    private cache;
    constructor(baseURL?: string, axiosConfig?: any);
    private setupCSRFHandling;
    /**
     * Execute a ChorusAction with callback-style writes collection
     */
    executeActionWithCallback(actionName: string, callback: (writes: WritesProxy) => void, options?: {
        optimistic?: boolean;
        offline?: boolean;
    }): Promise<ChorusActionResponse>;
    /**
     * Execute a ChorusAction (legacy method)
     */
    executeAction<T = any>(actionName: string, params: Record<string, any>, options?: {
        optimistic?: boolean;
        offline?: boolean;
        batch?: boolean;
    }): Promise<ChorusActionResponse>;
    /**
     * Execute a batch of actions
     */
    executeBatch(actionName: string, items: Record<string, any>[], options?: {
        optimistic?: boolean;
        offline?: boolean;
    }): Promise<ChorusActionResponse>;
    /**
     * Create a typed action client (legacy method)
     */
    createActionClient(actionMeta?: Record<string, ChorusActionMeta>): Record<string, (params: Record<string, any>, options?: any) => Promise<ChorusActionResponse>>;
    private handleOptimisticUpdate;
    private handleOptimisticUpdates;
    private handleOfflineActionWithOperations;
    private handleOfflineAction;
    private handleOfflineBatch;
    private storeOfflineAction;
    private storeOfflineActionWithOperations;
    private cacheResponse;
    private isOffline;
    private isNetworkError;
    /**
     * Sync offline actions when coming back online
     */
    syncOfflineActions(): Promise<void>;
}
