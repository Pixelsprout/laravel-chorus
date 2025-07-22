import { type OfflineState } from '../../core/offline';
export interface UseOfflineReturn {
    isOnline: boolean;
    pendingRequestsCount: number;
    offlineState: OfflineState;
    processPendingRequests: () => Promise<void>;
    clearPendingRequests: () => void;
}
/**
 * React hook for managing offline state and pending requests
 */
export declare function useOffline(): UseOfflineReturn;
