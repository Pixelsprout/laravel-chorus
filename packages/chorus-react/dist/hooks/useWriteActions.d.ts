import { WriteActionConfig, WriteActionResponse, BatchWriteResponse, TableWriteActions } from '@pixelsprout/chorus-core';
export interface UseWriteActionsReturn<T = any> {
    actions: Record<string, WriteActionConfig> | null;
    loading: boolean;
    error: string | null;
    table: TableWriteActions<T>;
    execute: <U = any>(actionName: string, data: Record<string, any>) => Promise<WriteActionResponse<U>>;
    executeBatch: <U = any>(actionName: string, items: Array<Record<string, any>>) => Promise<BatchWriteResponse<U>>;
    validate: (actionName: string, data: Record<string, any>) => string[];
    isExecuting: boolean;
    lastResult: WriteActionResponse | BatchWriteResponse | null;
    clearError: () => void;
    clearResult: () => void;
}
export declare function useWriteActions<T = any>(tableName: string): UseWriteActionsReturn<T>;
