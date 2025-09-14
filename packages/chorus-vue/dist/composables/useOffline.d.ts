import { type Ref } from 'vue';
import { type OfflineState } from '@pixelsprout/chorus-core';
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
export declare function useOffline(): UseOfflineReturn;
