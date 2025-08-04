// Vue composable for offline state management
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { offlineManager, type OfflineState } from '../../core/offline';

export interface UseOfflineReturn {
  isOnline: Ref<boolean>;
  pendingRequestsCount: Ref<number>;
  offlineState: Ref<OfflineState>;
  processPendingRequests: () => Promise<void>;
  clearPendingRequests: () => void;
}

/**
 * Vue composable for managing offline state and pending requests
 */
export function useOffline(): UseOfflineReturn {
  const isOnline = ref(offlineManager.getIsOnline());
  const offlineState = ref<OfflineState>(offlineManager.getOfflineState());
  const pendingRequestsCount = ref(offlineState.value.pendingRequests.length);

  let updateInterval: number | null = null;

  const updateOfflineState = () => {
    const newState = offlineManager.getOfflineState();
    offlineState.value = newState;
    isOnline.value = newState.isOnline;
    pendingRequestsCount.value = newState.pendingRequests.length;
  };

  const processPendingRequests = async () => {
    await offlineManager.processPendingRequests();
    updateOfflineState();
  };

  const clearPendingRequests = () => {
    offlineManager.clearPendingRequests();
    updateOfflineState();
  };

  onMounted(() => {
    // Set up event listeners
    offlineManager.onOnline(() => {
      updateOfflineState();
    });

    offlineManager.onOffline(() => {
      updateOfflineState();
    });

    // Update state periodically to catch changes in pending requests
    updateInterval = window.setInterval(updateOfflineState, 5000);
    
    // Initial update
    updateOfflineState();
  });

  onUnmounted(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  return {
    isOnline,
    pendingRequestsCount,
    offlineState,
    processPendingRequests,
    clearPendingRequests,
  };
}