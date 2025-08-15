import { WriteOperation, WritesProxy } from './writes-collector';
import { ChorusCore } from './chorus';
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
    private chorusCore;
    constructor(baseURL?: string, axiosConfig?: any, chorusCore?: ChorusCore);
    private setupCSRFHandling;
    private setupOfflineSync;
    /**
     * Set the ChorusCore instance for database integration
     */
    setChorusCore(chorusCore: ChorusCore): void;
    /**
     * Get the current ChorusCore instance
     */
    getChorusCore(): ChorusCore | null;
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
    private writeOptimisticOperation;
    private handleOfflineActionWithOperations;
    private handleOfflineAction;
    private handleOfflineBatch;
    private storeOfflineAction;
    private storeOfflineActionWithOperations;
    private cacheResponse;
    private isOffline;
    private isNetworkError;
    /**
     * Rollback optimistic updates for failed operations
     */
    rollbackOptimisticUpdates(operations: WriteOperation[]): Promise<void>;
    private rollbackOptimisticOperation;
    /**
     * Sync offline actions when coming back online
     */
    syncOfflineActions(): Promise<void>;
}
/**
 * Get or create the global ChorusActionsAPI instance
 */
export declare function getGlobalChorusActionsAPI(): ChorusActionsAPI;
/**
 * Connect ChorusActionsAPI with ChorusCore for optimistic updates
 */
export declare function connectChorusActionsAPI(chorusCore: ChorusCore, chorusActionsAPI?: ChorusActionsAPI): void;
