import React from 'react';
export interface OfflineIndicatorProps {
    className?: string;
    showPendingCount?: boolean;
    showRetryButton?: boolean;
    onRetry?: () => void;
}
/**
 * Component that displays offline status and pending request information
 */
export declare function OfflineIndicator({ className, showPendingCount, showRetryButton, onRetry, }: OfflineIndicatorProps): React.JSX.Element | null;
/**
 * Simple offline banner component
 */
export declare function OfflineBanner({ className }: {
    className?: string;
}): React.JSX.Element | null;
