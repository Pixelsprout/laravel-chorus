import { ChorusActionsAPI, ChorusActionResponse, ChorusActionMeta } from '@pixelsprout/chorus-core';
export interface UseChorusActionsOptions {
    baseURL?: string;
    autoSync?: boolean;
    optimisticUpdates?: boolean;
}
export interface ActionState {
    loading: boolean;
    error: string | null;
    lastResponse: ChorusActionResponse | null;
}
export declare function useChorusActions(actionMeta?: Record<string, ChorusActionMeta>, options?: UseChorusActionsOptions): {
    api: ChorusActionsAPI;
    executeAction: (actionName: string, params: Record<string, any>, actionOptions?: {
        optimistic?: boolean;
        offline?: boolean;
    }) => Promise<ChorusActionResponse>;
    executeBatch: (actionName: string, items: Record<string, any>[], actionOptions?: {
        optimistic?: boolean;
        offline?: boolean;
    }) => Promise<ChorusActionResponse>;
    actionStates: import("vue").ComputedRef<Record<string, ActionState>>;
    getActionState: (actionName: string) => import("vue").ComputedRef<ActionState>;
    isAnyActionLoading: import("vue").ComputedRef<boolean>;
    actionErrors: import("vue").ComputedRef<{
        action: string;
        error: string | null;
    }[]>;
    clearActionError: (actionName: string) => void;
    clearAllErrors: () => void;
    isOnline: import("vue").ComputedRef<boolean>;
    syncInProgress: import("vue").ComputedRef<boolean>;
    syncOfflineActions: () => Promise<void>;
};
