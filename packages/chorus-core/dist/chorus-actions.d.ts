import { WriteOperation, ActionContextLike } from './writes-collector';
import { ChorusCore } from './chorus';
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
export declare class ChorusActionsAPI {
    private axios;
    private baseURL;
    private cache;
    private chorusCore;
    constructor(baseURL?: string, axiosConfig?: any, chorusCore?: ChorusCore);
    private setupCSRFHandling;
    /**
     * Set up automatic offline sync when coming back online
     * Consuming libraries should call this if they want automatic syncing behavior
     */
    setupAutoSync(): void;
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
    executeActionWithCallback(actionName: string, callback: (actionContext: ActionContextLike) => any, options?: {
        optimistic?: boolean;
        offline?: boolean;
        validate?: boolean;
        validationSchema?: any;
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
     * Execute a ChorusAction with simplified ActionContext-style API
     * This provides the same API as the server-side ActionContext
     */
    executeActionWithContext(actionName: string, callback: (context: ActionContextLike) => any, options?: {
        optimistic?: boolean;
        offline?: boolean;
        validate?: boolean;
        validationSchema?: any;
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
    private handleOfflineActionWithDelta;
    private handleOfflineActionWithOperations;
    private handleOfflineAction;
    private handleOfflineBatch;
    private markDeltasAsSynced;
    private markDeltasAsFailed;
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
     * Sync offline actions when coming back online using delta tables
     */
    syncOfflineActions(): Promise<void>;
    /**
     * Sync offline actions from delta tables (new delta-based approach)
     */
    syncOfflineActionsFromDeltas(): Promise<void>;
    /**
     * Validate operations and data against a validation schema
     */
    private validateOperations;
    /**
     * Validate data object against field constraints
     */
    private validateData;
    /**
     * Legacy localStorage-based sync for backwards compatibility
     */
    syncOfflineActionsFromLocalStorage(): Promise<void>;
}
/**
 * Get or create the global ChorusActionsAPI instance
 */
export declare function getGlobalChorusActionsAPI(): ChorusActionsAPI;
/**
 * Connect ChorusActionsAPI with ChorusCore for optimistic updates
 */
export declare function connectChorusActionsAPI(chorusCore: ChorusCore, chorusActionsAPI?: ChorusActionsAPI): void;
