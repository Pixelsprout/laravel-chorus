import { type HarmonicEvent } from '@chorus/js';
import { createContext, useContext, useState, useCallback, useMemo, type PropsWithChildren } from 'react';

interface RejectedNotification {
    id: string;
    message: string;
    timestamp: Date;
    type: 'validation' | 'permission' | 'error';
    harmonic: HarmonicEvent;
}

interface RejectedHarmonicsContextType {
    notifications: RejectedNotification[];
    addNotification: (harmonic: HarmonicEvent) => void;
    dismissNotification: (id: string) => void;
    clearAllNotifications: () => void;
}

const defaultContextValue: RejectedHarmonicsContextType = {
    notifications: [],
    addNotification: () => {},
    dismissNotification: () => {},
    clearAllNotifications: () => {},
};

const RejectedHarmonicsContext = createContext<RejectedHarmonicsContextType>(defaultContextValue);

export function RejectedHarmonicsProvider({ children }: PropsWithChildren) {
    const [notifications, setNotifications] = useState<RejectedNotification[]>([]);

    const addNotification = useCallback((harmonic: HarmonicEvent) => {
        // Validate that the harmonic object has required properties
        if (!harmonic || !harmonic.id) {
            console.warn('🚫 Received invalid rejected harmonic (missing ID):', harmonic);
            return;
        }

        console.log('🚫 Rejected harmonic received:', {
            id: harmonic.id,
            operation: harmonic.operation,
            reason: harmonic.rejected_reason,
            data: harmonic.data ? (typeof harmonic.data === 'string' ? JSON.parse(harmonic.data) : harmonic.data) : null
        });
        
        // Determine notification type based on rejection reason
        let type: 'validation' | 'permission' | 'error' = 'error';
        if (harmonic.rejected_reason?.includes('Validation failed')) {
            type = 'validation';
        } else if (harmonic.rejected_reason === 'Permission denied') {
            type = 'permission';
        }

        // Create notification with unique ID to prevent React key conflicts
        const notification: RejectedNotification = {
            id: `${harmonic.id}-${Date.now()}`, // Make ID unique by adding timestamp
            message: `Failed to ${harmonic.operation}: ${harmonic.rejected_reason}`,
            timestamp: new Date(),
            type,
            harmonic,
        };

        // Check if we already have a notification for this harmonic to prevent duplicates
        setNotifications(prev => {
            const existingIndex = prev.findIndex(n => n.harmonic.id === harmonic.id);
            if (existingIndex >= 0) {
                // Replace existing notification instead of adding duplicate
                const updated = [...prev];
                updated[existingIndex] = notification;
                return updated;
            }
            // Add new notification (keep last 20 for dashboard display)
            return [notification, ...prev.slice(0, 19)];
        });
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const contextValue = useMemo(() => ({
        notifications,
        addNotification,
        dismissNotification,
        clearAllNotifications,
    }), [notifications, addNotification, dismissNotification, clearAllNotifications]);

    return (
        <RejectedHarmonicsContext.Provider value={contextValue}>
            {children}
        </RejectedHarmonicsContext.Provider>
    );
}

export function useRejectedHarmonics() {
    const context = useContext(RejectedHarmonicsContext);
    return context;
}

export type { RejectedNotification };