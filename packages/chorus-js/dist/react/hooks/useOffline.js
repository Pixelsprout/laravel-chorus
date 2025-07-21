var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// React hook for offline state management
import { useState, useEffect } from 'react';
import { offlineManager } from '../../core/offline';
/**
 * React hook for managing offline state and pending requests
 */
export function useOffline() {
    const [isOnline, setIsOnline] = useState(offlineManager.getIsOnline());
    const [offlineState, setOfflineState] = useState(offlineManager.getOfflineState());
    useEffect(() => {
        const updateOfflineState = () => {
            const newState = offlineManager.getOfflineState();
            setOfflineState(newState);
            setIsOnline(newState.isOnline);
        };
        // Set up event listeners
        offlineManager.onOnline(() => {
            updateOfflineState();
        });
        offlineManager.onOffline(() => {
            updateOfflineState();
        });
        // Update state periodically to catch changes in pending requests
        const interval = setInterval(updateOfflineState, 5000);
        return () => {
            clearInterval(interval);
        };
    }, []);
    const processPendingRequests = () => __awaiter(this, void 0, void 0, function* () {
        yield offlineManager.processPendingRequests();
        setOfflineState(offlineManager.getOfflineState());
    });
    const clearPendingRequests = () => {
        offlineManager.clearPendingRequests();
        setOfflineState(offlineManager.getOfflineState());
    };
    return {
        isOnline,
        pendingRequestsCount: offlineState.pendingRequests.length,
        offlineState,
        processPendingRequests,
        clearPendingRequests,
    };
}
