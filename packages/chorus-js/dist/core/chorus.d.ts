export interface HarmonicEvent {
    id: string;
    table_name: string;
    data: string;
    operation: string;
    record_id: string | number;
    user_id?: number;
    created_at?: string;
    updated_at?: string;
    processed_at?: string;
    rejected?: boolean;
    rejected_reason?: string;
}
export interface TableState {
    lastUpdate: Date | null;
    isLoading: boolean;
    error: string | null;
}
export declare class SyncError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * ChorusCore class - handles the core data sync functionality
 */
export declare class ChorusCore {
    private db;
    private tableNames;
    private schema;
    private isInitialized;
    private tableStates;
    private userId;
    private onRejectedHarmonic?;
    private onSchemaVersionChange?;
    private onDatabaseVersionChange?;
    private processedRejectedHarmonics;
    private isOnline;
    private isRebuilding;
    constructor();
    /**
     * Set up offline event handlers
     */
    private setupOfflineHandlers;
    /**
     * Handle reconnection when device comes back online
     */
    private handleOnlineReconnection;
    /**
     * Reset the ChorusCore state
     */
    reset(): void;
    /**
     * Set up the ChorusCore with a userId and optional fallback schema
     */
    setup(userId: string | number, onRejectedHarmonic?: (harmonic: HarmonicEvent) => void, onSchemaVersionChange?: (oldVersion: string | null, newVersion: string) => void, onDatabaseVersionChange?: (oldVersion: string | null, newVersion: string) => void): void;
    /**
     * Fetch schema from server and initialize database
     */
    fetchAndInitializeSchema(): Promise<Record<string, any>>;
    /**
     * Get the current schema
     */
    getSchema(): Record<string, any>;
    /**
     * Rebuild the database by deleting it and clearing stored harmonic IDs
     */
    private rebuildDatabase;
    /**
     * Perform a full resync of all tables after database rebuild
     */
    private performFullResync;
    /**
     * Initialize database with the provided schema
     */
    private initializeWithSchema;
    /**
     * Simple logging utility
     */
    private log;
    /**
     * Get the latest harmonic ID from localStorage
     */
    private getLatestHarmonicId;
    /**
     * Save the latest harmonic ID to localStorage
     */
    private saveLatestHarmonicId;
    /**
     * Process a batch of harmonics
     */
    processHarmonics(harmonics: HarmonicEvent[], tableName: string): Promise<boolean>;
    /**
     * Process a single harmonic event
     */
    processHarmonic(event: HarmonicEvent): Promise<boolean>;
    /**
     * Initialize all tables with data
     */
    initializeTables(): Promise<void>;
    /**
     * Update the state for a specific table
     */
    private updateTableState;
    /**
     * Get the current state for a specific table
     */
    getTableState(tableName: string): TableState;
    /**
     * Get all table states
     */
    getAllTableStates(): Record<string, TableState>;
    /**
     * Check if Chorus is fully initialized
     */
    getIsInitialized(): boolean;
    /**
     * Get the database instance
     */
    getDb(): import("./db").ChorusDatabase | null;
    /**
     * Check if a table exists in the database
     */
    hasTable(tableName: string): boolean;
    /**
     * Get data from a specific table
     */
    getTableData<T = any>(tableName: string): Promise<T[]>;
    /**
     * Get current online/offline status
     */
    getIsOnline(): boolean;
    /**
     * Check if the system is currently rebuilding the database
     */
    getIsRebuilding(): boolean;
    /**
     * Get offline manager instance for advanced offline operations
     */
    getOfflineManager(): import("./offline").OfflineManager;
    /**
     * Make an offline-aware API request
     */
    makeRequest(url: string, options?: RequestInit): Promise<Response>;
}
