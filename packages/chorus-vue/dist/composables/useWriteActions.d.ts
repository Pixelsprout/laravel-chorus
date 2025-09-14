import { type Ref } from 'vue';
import { type WriteActionConfig, type WriteActionResponse, type BatchWriteResponse, type TableWriteActions } from '@pixelsprout/chorus-core';
export interface UseWriteActionsReturn<T = any> {
    actions: Ref<Record<string, WriteActionConfig> | null>;
    loading: Ref<boolean>;
    error: Ref<string | null>;
    table: TableWriteActions<T>;
    execute: <U = any>(actionName: string, data: Record<string, any>) => Promise<WriteActionResponse<U>>;
    executeBatch: <U = any>(actionName: string, items: Array<Record<string, any>>) => Promise<BatchWriteResponse<U>>;
    validate: (actionName: string, data: Record<string, any>) => string[];
    isExecuting: Ref<boolean>;
    lastResult: Ref<WriteActionResponse | BatchWriteResponse | null>;
    clearError: () => void;
    clearResult: () => void;
}
export declare function useWriteActions<T = any>(tableName: string): UseWriteActionsReturn<T>;
