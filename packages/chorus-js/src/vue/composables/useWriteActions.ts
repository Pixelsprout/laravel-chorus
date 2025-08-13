import { ref, computed, onMounted, type Ref } from 'vue';
import { writeActions, type WriteActionConfig, type WriteActionResponse, type BatchWriteResponse, type TableWriteActions } from '../../core/write-actions';

export interface UseWriteActionsReturn<T = any> {
  // Actions metadata
  actions: Ref<Record<string, WriteActionConfig> | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  // Clean API - table instance with direct methods
  table: TableWriteActions<T>;

  // Legacy execute functions (for backward compatibility)
  execute: <U = any>(actionName: string, data: Record<string, any>) => Promise<WriteActionResponse<U>>;
  executeBatch: <U = any>(actionName: string, items: Array<Record<string, any>>) => Promise<BatchWriteResponse<U>>;

  // Validation
  validate: (actionName: string, data: Record<string, any>) => string[];

  // State management
  isExecuting: Ref<boolean>;
  lastResult: Ref<WriteActionResponse | BatchWriteResponse | null>;
  clearError: () => void;
  clearResult: () => void;
}

export function useWriteActions<T = any>(tableName: string): UseWriteActionsReturn<T> {
  const actions = ref<Record<string, WriteActionConfig> | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isExecuting = ref(false);
  const lastResult = ref<WriteActionResponse | BatchWriteResponse | null>(null);

  // Create table instance with clean API
  const table = computed(() => writeActions.table<T>(tableName)).value;

  onMounted(async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const loadedActions = await writeActions.loadActions(tableName);
      actions.value = loadedActions;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load actions';
    } finally {
      loading.value = false;
    }
  });

  const execute = async <U = any>(
    actionName: string,
    data: Record<string, any>
  ): Promise<WriteActionResponse<U>> => {
    isExecuting.value = true;
    error.value = null;
    lastResult.value = null;

    try {
      const result = await writeActions.execute<U>(tableName, actionName, data);
      lastResult.value = result;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action execution failed';
      error.value = errorMessage;
      throw err;
    } finally {
      isExecuting.value = false;
    }
  };

  const executeBatch = async <U = any>(
    actionName: string,
    items: Array<Record<string, any>>
  ): Promise<BatchWriteResponse<U>> => {
    isExecuting.value = true;
    error.value = null;
    lastResult.value = null;

    try {
      const result = await writeActions.executeBatch<U>(tableName, actionName, items);
      lastResult.value = result;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch action execution failed';
      error.value = errorMessage;
      throw err;
    } finally {
      isExecuting.value = false;
    }
  };

  const validate = (actionName: string, data: Record<string, any>): string[] => {
    return writeActions.validateData(tableName, actionName, data);
  };

  const clearError = () => {
    error.value = null;
  };

  const clearResult = () => {
    lastResult.value = null;
  };

  return {
    actions,
    loading,
    error,
    table, // Clean API
    execute, // Legacy API
    executeBatch, // Legacy API
    validate,
    isExecuting,
    lastResult,
    clearError,
    clearResult,
  };
}