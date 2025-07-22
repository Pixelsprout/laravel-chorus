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
export declare class WriteActionsAPI {
    private baseUrl;
    private actions;
    private loadingPromises;
    constructor(baseUrl?: string);
    /**
     * Load available actions for a table
     */
    loadActions(tableName: string): Promise<Record<string, WriteActionConfig>>;
    /**
     * Perform the actual loadActions request
     */
    private performLoadActions;
    /**
     * Get cached actions for a table
     */
    getActions(tableName: string): Record<string, WriteActionConfig> | null;
    /**
     * Check if actions are loaded for a table
     */
    hasActions(tableName: string): boolean;
    /**
     * Clear cached actions for a table (or all tables if no tableName provided)
     */
    clearActionsCache(tableName?: string): void;
    /**
     * Execute a write action
     */
    execute<T = any>(tableName: string, actionName: string, data: Record<string, any>): Promise<WriteActionResponse<T>>;
    /**
     * Execute a batch write action
     */
    executeBatch<T = any>(tableName: string, actionName: string, items: Array<Record<string, any>>): Promise<BatchWriteResponse<T>>;
    /**
     * Execute action online
     */
    private executeOnline;
    /**
     * Execute batch action online
     */
    private executeBatchOnline;
    /**
     * Handle offline write by caching the request
     */
    private handleOfflineWrite;
    /**
     * Handle offline batch write by caching the request
     */
    private handleOfflineBatchWrite;
    /**
     * Validate data against action rules (client-side validation)
     */
    validateData(tableName: string, actionName: string, data: Record<string, any>): string[];
}
/**
 * Callback function for optimistic updates
 */
export type OptimisticCallback<T = any> = (optimisticData: T) => void | Promise<void>;
/**
 * Table-specific write actions class with clean API
 */
export declare class TableWriteActions<T = any> {
    private api;
    private tableName;
    constructor(api: WriteActionsAPI, tableName: string);
    /**
     * Create a new record with optimistic update
     * @param optimisticData - The data for immediate optimistic update
     * @param serverData - The data to send to the server
     * @param callback - Optional callback function for server response
     */
    create(optimisticData: T, serverData: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    /**
     * Create a new record (simple version without optimistic update)
     * @param serverData - The data to send to the server
     * @param callback - Optional callback function for server response
     */
    create(serverData: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    /**
     * Update an existing record with optimistic update
     * @param optimisticData - The data for immediate optimistic update
     * @param serverData - The data to send to the server
     * @param callback - Optional callback function for server response
     */
    update(optimisticData: T, serverData: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    /**
     * Update an existing record (simple version without optimistic update)
     * @param serverData - The data to send to the server
     * @param callback - Optional callback function for server response
     */
    update(serverData: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    /**
     * Delete a record with optimistic update
     * @param optimisticData - The data for immediate optimistic update
     * @param serverData - The data to send to the server
     * @param callback - Optional callback function for server response
     */
    delete(optimisticData: {
        id: string | number;
    }, serverData: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    /**
     * Delete a record (simple version without optimistic update)
     * @param serverData - The data to send to the server
     * @param callback - Optional callback function for server response
     */
    delete(serverData: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    private optimisticCallbacks;
    /**
     * Set the optimistic update callback for a specific action
     * @param action - The action name ('create', 'update', 'delete')
     * @param callback - Function to call for optimistic updates
     */
    setOptimisticCallback(action: string, callback: OptimisticCallback<T>): void;
    /**
     * Get the optimistic callback for an action
     * @param action - The action name
     */
    private getOptimisticCallback;
    /**
     * Execute a custom action
     * @param actionName - The name of the action
     * @param data - The data to send
     * @param callback - Optional callback function
     */
    action(actionName: string, data: Record<string, any>, callback?: (response: WriteActionResponse<T>) => void): Promise<WriteActionResponse<T>>;
    /**
     * Create multiple records in a batch
     * @param items - Array of data objects to create
     * @param callback - Optional callback function
     */
    createBatch(items: Array<Record<string, any>>, callback?: (response: BatchWriteResponse<T>) => void): Promise<BatchWriteResponse<T>>;
    /**
     * Update multiple records in a batch
     * @param items - Array of data objects to update
     * @param callback - Optional callback function
     */
    updateBatch(items: Array<Record<string, any>>, callback?: (response: BatchWriteResponse<T>) => void): Promise<BatchWriteResponse<T>>;
    /**
     * Delete multiple records in a batch
     * @param items - Array of data objects to delete
     * @param callback - Optional callback function
     */
    deleteBatch(items: Array<Record<string, any>>, callback?: (response: BatchWriteResponse<T>) => void): Promise<BatchWriteResponse<T>>;
    /**
     * Get the underlying API instance (for advanced usage)
     */
    getAPI(): WriteActionsAPI;
    /**
     * Get the table name
     */
    getTableName(): string;
}
/**
 * Enhanced WriteActionsAPI with table factory method
 */
export declare class EnhancedWriteActionsAPI extends WriteActionsAPI {
    private tableInstances;
    /**
     * Get a table-specific write actions instance
     * @param tableName - The name of the table
     */
    table<T = any>(tableName: string): TableWriteActions<T>;
    /**
     * Clear table instances cache
     */
    clearTableInstances(): void;
}
export declare const writeActions: EnhancedWriteActionsAPI;
export declare const writeActionsAPI: WriteActionsAPI;
