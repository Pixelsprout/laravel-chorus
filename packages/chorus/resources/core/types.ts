// Core types used across all implementations

// Define the HarmonicEvent interface
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

// Define table status state
export interface TableState {
    lastUpdate: Date | null;
    isLoading: boolean;
    error: string | null;
}

// Custom error type
export class SyncError extends Error {
    constructor(
        message: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = 'SyncError';
    }
}

// Configuration interface
export interface ChorusOptions {
    dbName?: string;
    tables: string[];
    apiPrefix?: string;
    channelFormat?: string;
    eventName?: string;
    debug?: boolean;
}
