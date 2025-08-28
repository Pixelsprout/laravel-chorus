var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// React component for displaying offline status and pending requests
import React from 'react';
import { useOffline } from '../hooks/useOffline';
/**
 * Component that displays offline status and pending request information
 */
export function OfflineIndicator({ className = '', showPendingCount = true, showRetryButton = true, onRetry, }) {
    const { isOnline, pendingRequestsCount, processPendingRequests } = useOffline();
    const handleRetry = () => __awaiter(this, void 0, void 0, function* () {
        if (onRetry) {
            onRetry();
        }
        else {
            yield processPendingRequests();
        }
    });
    if (isOnline && pendingRequestsCount === 0) {
        return null; // Don't show anything when online with no pending requests
    }
    return (React.createElement("div", { className: `offline-indicator ${className}` },
        !isOnline && (React.createElement("div", { className: "offline-status" },
            React.createElement("span", { className: "offline-icon" }, "\uD83D\uDCE1"),
            React.createElement("span", { className: "offline-text" }, "Offline"))),
        pendingRequestsCount > 0 && showPendingCount && (React.createElement("div", { className: "pending-requests" },
            React.createElement("span", { className: "pending-icon" }, "\u23F3"),
            React.createElement("span", { className: "pending-text" },
                pendingRequestsCount,
                " request",
                pendingRequestsCount !== 1 ? 's' : '',
                " pending"))),
        isOnline && pendingRequestsCount > 0 && showRetryButton && (React.createElement("button", { className: "retry-button", onClick: handleRetry, type: "button" }, "Sync Now"))));
}
/**
 * Simple offline banner component
 */
export function OfflineBanner({ className = '' }) {
    const { isOnline } = useOffline();
    if (isOnline) {
        return null;
    }
    return (React.createElement("div", { className: `offline-banner ${className}` },
        React.createElement("span", null, "You are currently offline. Changes will be synced when you reconnect.")));
}
