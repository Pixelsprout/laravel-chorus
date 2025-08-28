var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChorusActionsAPI } from '@pixelsprout/chorus-core';
export function useChorusActions(actionMeta = {}, options = {}) {
    const { baseURL = '/api', autoSync = true, optimisticUpdates = true, } = options;
    const api = new ChorusActionsAPI(baseURL);
    // State management
    const actionStates = ref({});
    const isOnline = ref(navigator.onLine);
    const syncInProgress = ref(false);
    // Initialize action states
    Object.keys(actionMeta).forEach(actionName => {
        actionStates.value[actionName] = {
            loading: false,
            error: null,
            lastResponse: null,
        };
    });
    /**
     * Execute a ChorusAction with state management (legacy method)
     */
    function executeAction(actionName, params, actionOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = actionStates.value[actionName];
            state.loading = true;
            state.error = null;
            try {
                const response = yield api.executeAction(actionName, params, Object.assign({ optimistic: optimisticUpdates, offline: !isOnline.value }, actionOptions));
                state.lastResponse = response;
                return response;
            }
            catch (error) {
                state.error = error.message || 'Action execution failed';
                throw error;
            }
            finally {
                state.loading = false;
            }
        });
    }
    /**
     * Execute a batch of actions (legacy method)
     */
    function executeBatch(actionName, items, actionOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = actionStates.value[actionName];
            state.loading = true;
            state.error = null;
            try {
                const response = yield api.executeBatch(actionName, items, Object.assign({ optimistic: optimisticUpdates, offline: !isOnline.value }, actionOptions));
                state.lastResponse = response;
                return response;
            }
            catch (error) {
                state.error = error.message || 'Batch execution failed';
                throw error;
            }
            finally {
                state.loading = false;
            }
        });
    }
    /**
     * Get the state for a specific action
     */
    function getActionState(actionName) {
        return computed(() => actionStates.value[actionName]);
    }
    /**
     * Check if any action is currently loading
     */
    const isAnyActionLoading = computed(() => {
        return Object.values(actionStates.value).some(state => state.loading);
    });
    /**
     * Get all action errors
     */
    const actionErrors = computed(() => {
        return Object.entries(actionStates.value)
            .filter(([_, state]) => state.error)
            .map(([name, state]) => ({ action: name, error: state.error }));
    });
    /**
     * Clear errors for a specific action
     */
    function clearActionError(actionName) {
        const state = actionStates.value[actionName];
        if (state) {
            state.error = null;
        }
    }
    /**
     * Clear all action errors
     */
    function clearAllErrors() {
        Object.values(actionStates.value).forEach(state => {
            state.error = null;
        });
    }
    /**
     * Sync offline actions when coming back online
     */
    function syncOfflineActions() {
        return __awaiter(this, void 0, void 0, function* () {
            if (syncInProgress.value)
                return;
            syncInProgress.value = true;
            try {
                yield api.syncOfflineActions();
            }
            catch (error) {
                console.error('Failed to sync offline actions:', error);
            }
            finally {
                syncInProgress.value = false;
            }
        });
    }
    // Network status handling
    function handleOnline() {
        isOnline.value = true;
        if (autoSync) {
            syncOfflineActions();
        }
    }
    function handleOffline() {
        isOnline.value = false;
    }
    // Lifecycle
    onMounted(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    });
    onUnmounted(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    });
    return {
        // API client
        api,
        // Action execution
        executeAction,
        executeBatch,
        // State management
        actionStates: computed(() => actionStates.value),
        getActionState,
        isAnyActionLoading,
        actionErrors,
        clearActionError,
        clearAllErrors,
        // Network status
        isOnline: computed(() => isOnline.value),
        syncInProgress: computed(() => syncInProgress.value),
        syncOfflineActions,
    };
}
