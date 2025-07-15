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
    private isInitialized;
    private tableStates;
    private userId;
    constructor();
    /**
     * Reset the ChorusCore state
     */
    reset(): void;
    /**
     * Set up the ChorusCore with a userId and schema
     */
    setup(userId: string | number, schema: Record<string, any>): void;
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
    processHarmonics(tableName: string, harmonics: HarmonicEvent[]): Promise<boolean>;
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
     * Get data from a specific table
     */
    getTableData<T = any>(tableName: string): Promise<T[]>;
}
