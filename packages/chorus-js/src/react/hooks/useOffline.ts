// React hook for offline state management
import { useState, useEffect } from 'react';
import { offlineManager, type OfflineState } from '../../core/offline';

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
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(offlineManager.getIsOnline());
  const [offlineState, setOfflineState] = useState<OfflineState>(offlineManager.getOfflineState());

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

  const processPendingRequests = async () => {
    await offlineManager.processPendingRequests();
    setOfflineState(offlineManager.getOfflineState());
  };

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