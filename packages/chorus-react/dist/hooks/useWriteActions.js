var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useState, useCallback, useEffect, useMemo } from 'react';
import { writeActions } from '@pixelsprout/chorus-core';
export function useWriteActions(tableName) {
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    // Create table instance with clean API
    const table = useMemo(() => writeActions.table(tableName), [tableName]);
    useEffect(() => {
        const loadActions = () => __awaiter(this, void 0, void 0, function* () {
            setLoading(true);
            setError(null);
            try {
                const loadedActions = yield writeActions.loadActions(tableName);
                setActions(loadedActions);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load actions');
            }
            finally {
                setLoading(false);
            }
        });
        loadActions();
    }, [tableName]);
    const execute = useCallback((actionName, data) => __awaiter(this, void 0, void 0, function* () {
        setIsExecuting(true);
        setError(null);
        setLastResult(null);
        try {
            const result = yield writeActions.execute(tableName, actionName, data);
            setLastResult(result);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Action execution failed';
            setError(errorMessage);
            throw err;
        }
        finally {
            setIsExecuting(false);
        }
    }), [tableName]);
    const executeBatch = useCallback((actionName, items) => __awaiter(this, void 0, void 0, function* () {
        setIsExecuting(true);
        setError(null);
        setLastResult(null);
        try {
            const result = yield writeActions.executeBatch(tableName, actionName, items);
            setLastResult(result);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Batch action execution failed';
            setError(errorMessage);
            throw err;
        }
        finally {
            setIsExecuting(false);
        }
    }), [tableName]);
    const validate = useCallback((actionName, data) => {
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
