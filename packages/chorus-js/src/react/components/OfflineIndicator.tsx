// React component for displaying offline status and pending requests
import React from 'react';
import { useOffline } from '../hooks/useOffline';

export interface OfflineIndicatorProps {
  className?: string;
  showPendingCount?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
}

/**
 * Component that displays offline status and pending request information
 */
export function OfflineIndicator({
  className = '',
  showPendingCount = true,
  showRetryButton = true,
  onRetry,
}: OfflineIndicatorProps) {
  const { isOnline, pendingRequestsCount, processPendingRequests } = useOffline();

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      await processPendingRequests();
    }
  };

  if (isOnline && pendingRequestsCount === 0) {
    return null; // Don't show anything when online with no pending requests
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {!isOnline && (
        <div className="offline-status">
          <span className="offline-icon">📡</span>
          <span className="offline-text">Offline</span>
        </div>
      )}
      
      {pendingRequestsCount > 0 && showPendingCount && (
        <div className="pending-requests">
          <span className="pending-icon">⏳</span>
          <span className="pending-text">
            {pendingRequestsCount} request{pendingRequestsCount !== 1 ? 's' : ''} pending
          </span>
        </div>
      )}
      
      {isOnline && pendingRequestsCount > 0 && showRetryButton && (
        <button 
          className="retry-button"
          onClick={handleRetry}
          type="button"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}

/**
 * Simple offline banner component
 */
export function OfflineBanner({ className = '' }: { className?: string }) {
  const { isOnline } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <div className={`offline-banner ${className}`}>
      <span>You are currently offline. Changes will be synced when you reconnect.</span>
    </div>
  );
}