import { useState, useCallback, useEffect, useMemo } from 'react';
import { writeActions, WriteActionConfig, WriteActionResponse, BatchWriteResponse, TableWriteActions } from '../../core/write-actions';

export interface UseWriteActionsReturn<T = any> {
  // Actions metadata
  actions: Record<string, WriteActionConfig> | null;
  loading: boolean;
  error: string | null;

  // Clean API - table instance with direct methods
  table: TableWriteActions<T>;

  // Legacy execute functions (for backward compatibility)
  execute: <U = any>(actionName: string, data: Record<string, any>) => Promise<WriteActionResponse<U>>;
  executeBatch: <U = any>(actionName: string, items: Array<Record<string, any>>) => Promise<BatchWriteResponse<U>>;

  // Validation
  validate: (actionName: string, data: Record<string, any>) => string[];

  // State management
  isExecuting: boolean;
  lastResult: WriteActionResponse | BatchWriteResponse | null;
  clearError: () => void;
  clearResult: () => void;
}

export function useWriteActions<T = any>(tableName: string): UseWriteActionsReturn<T> {
  const [actions, setActions] = useState<Record<string, WriteActionConfig> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<WriteActionResponse | BatchWriteResponse | null>(null);

  // Create table instance with clean API
  const table = useMemo(() => writeActions.table<T>(tableName), [tableName]);

  useEffect(() => {
    const loadActions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const loadedActions = await writeActions.loadActions(tableName);
        setActions(loadedActions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load actions');
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, [tableName]);

  const execute = useCallback(async <T = any>(
    actionName: string,
    data: Record<string, any>
  ): Promise<WriteActionResponse<T>> => {
    setIsExecuting(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await writeActions.execute<T>(tableName, actionName, data);
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action execution failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, [tableName]);

  const executeBatch = useCallback(async <T = any>(
    actionName: string,
    items: Array<Record<string, any>>
  ): Promise<BatchWriteResponse<T>> => {
    setIsExecuting(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await writeActions.executeBatch<T>(tableName, actionName, items);
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch action execution failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, [tableName]);

  const validate = useCallback((actionName: string, data: Record<string, any>): string[] => {
    return writeActions.validateData(tableName, actionName, data);
  }, [tableName]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

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