import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChorusActionsAPI, ChorusActionResponse, ChorusActionMeta } from '../../core/chorus-actions';

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

export function useChorusActions(
  actionMeta: Record<string, ChorusActionMeta> = {},
  options: UseChorusActionsOptions = {}
) {
  const {
    baseURL = '/api',
    autoSync = true,
    optimisticUpdates = true,
  } = options;

  const api = new ChorusActionsAPI(baseURL);

  // State management
  const actionStates = ref<Record<string, ActionState>>({});
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
  async function executeAction(
    actionName: string,
    params: Record<string, any>,
    actionOptions?: { optimistic?: boolean; offline?: boolean }
  ): Promise<ChorusActionResponse> {
    const state = actionStates.value[actionName];
    
    state.loading = true;
    state.error = null;

    try {
      const response = await api.executeAction(
        actionName,
        params,
        {
          optimistic: optimisticUpdates,
          offline: !isOnline.value,
          ...actionOptions,
        }
      );

      state.lastResponse = response;
      return response;
    } catch (error: any) {
      state.error = error.message || 'Action execution failed';
      throw error;
    } finally {
      state.loading = false;
    }
  }

  /**
   * Execute a batch of actions (legacy method)
   */
  async function executeBatch(
    actionName: string,
    items: Record<string, any>[],
    actionOptions?: { optimistic?: boolean; offline?: boolean }
  ): Promise<ChorusActionResponse> {
    const state = actionStates.value[actionName];
    
    state.loading = true;
    state.error = null;

    try {
      const response = await api.executeBatch(
        actionName,
        items,
        {
          optimistic: optimisticUpdates,
          offline: !isOnline.value,
          ...actionOptions,
        }
      );

      state.lastResponse = response;
      return response;
    } catch (error: any) {
      state.error = error.message || 'Batch execution failed';
      throw error;
    } finally {
      state.loading = false;
    }
  }

  /**
   * Get the state for a specific action
   */
  function getActionState(actionName: string) {
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
  function clearActionError(actionName: string) {
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
  async function syncOfflineActions() {
    if (syncInProgress.value) return;
    
    syncInProgress.value = true;
    try {
      await api.syncOfflineActions();
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
    } finally {
      syncInProgress.value = false;
    }
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