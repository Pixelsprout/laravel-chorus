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
export interface ChorusOptions {
    dbName?: string;
    tables: string[];
    apiPrefix?: string;
    channelFormat?: string;
    eventName?: string;
    debug?: boolean;
}
