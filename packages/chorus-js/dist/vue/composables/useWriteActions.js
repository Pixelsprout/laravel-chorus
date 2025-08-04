var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ref, computed, onMounted } from 'vue';
import { writeActions } from '../../core/write-actions';
export function useWriteActions(tableName) {
    const actions = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const isExecuting = ref(false);
    const lastResult = ref(null);
    // Create table instance with clean API
    const table = computed(() => writeActions.table(tableName)).value;
    onMounted(() => __awaiter(this, void 0, void 0, function* () {
        loading.value = true;
        error.value = null;
        try {
            const loadedActions = yield writeActions.loadActions(tableName);
            actions.value = loadedActions;
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load actions';
        }
        finally {
            loading.value = false;
        }
    }));
    const execute = (actionName, data) => __awaiter(this, void 0, void 0, function* () {
        isExecuting.value = true;
        error.value = null;
        lastResult.value = null;
        try {
            const result = yield writeActions.execute(tableName, actionName, data);
            lastResult.value = result;
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Action execution failed';
            error.value = errorMessage;
            throw err;
        }
        finally {
            isExecuting.value = false;
        }
    });
    const executeBatch = (actionName, items) => __awaiter(this, void 0, void 0, function* () {
        isExecuting.value = true;
        error.value = null;
        lastResult.value = null;
        try {
            const result = yield writeActions.executeBatch(tableName, actionName, items);
            lastResult.value = result;
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Batch action execution failed';
            error.value = errorMessage;
            throw err;
        }
        finally {
            isExecuting.value = false;
        }
    });
    const validate = (actionName, data) => {
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
