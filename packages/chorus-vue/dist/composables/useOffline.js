var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Vue composable for offline state management
import { ref, onMounted, onUnmounted } from 'vue';
import { offlineManager } from '@pixelsprout/chorus-core';
/**
 * Vue composable for managing offline state and pending requests
 */
export function useOffline() {
    const isOnline = ref(offlineManager.getIsOnline());
    const offlineState = ref(offlineManager.getOfflineState());
    const pendingRequestsCount = ref(offlineState.value.pendingRequests.length);
    let updateInterval = null;
    const updateOfflineState = () => {
        const newState = offlineManager.getOfflineState();
        offlineState.value = newState;
        isOnline.value = newState.isOnline;
        pendingRequestsCount.value = newState.pendingRequests.length;
    };
    const processPendingRequests = () => __awaiter(this, void 0, void 0, function* () {
        yield offlineManager.processPendingRequests();
        updateOfflineState();
    });
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
