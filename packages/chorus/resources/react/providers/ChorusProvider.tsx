import { useEcho } from '@laravel/echo-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useEffect, useState } from 'react';
import { ChorusCore, HarmonicEvent, TableState } from '../../core/chorus';

// Create a new ChorusCore instance
const chorusCore = new ChorusCore();

// Define the context state structure
interface ChorusContextState {
    isInitialized: boolean;
    tables: Record<string, TableState>;
}

// Create the context with default values
const ChorusContext = createContext<ChorusContextState>({
    isInitialized: false,
    tables: {},
});

// Global initialization flag to ensure we only initialize once across rerenders
let isGloballyInitialized = false;

// The Provider component
interface ChorusProviderProps {
    children: React.ReactNode;
    userId?: number; // User ID for channel authorization
}

export function ChorusProvider({ children, userId }: ChorusProviderProps) {
    // Get table names from the schema
    const tableNames = Object.keys(chorusCore.getAllTableStates());

    // State to track syncing status across tables
    const [state, setState] = useState<ChorusContextState>({
        isInitialized: isGloballyInitialized, // Start with global flag
        tables: chorusCore.getAllTableStates(),
    });

    // Update React state when core state changes
    const updateReactState = () => {
        setState({
            isInitialized: chorusCore.getIsInitialized(),
            tables: chorusCore.getAllTableStates(),
        });
    };

    // Setup Echo listener for user channel (if userId is provided)
    if (userId) {
        useEcho<HarmonicEvent>(`chorus.user.${userId}`, '.harmonic.created', async (event) => {
            if (isGloballyInitialized) {
                // Only process events after initialization
                console.log(`[Chorus] Real-time update received for user ${userId}`, event);

                // Process the harmonic using ChorusCore
                await chorusCore.processHarmonic(event);

                // Update the React state
                updateReactState();
            }
        });
    }

    // Initialize the data sync
    useEffect(() => {
        // Initialize the database schema
        chorusCore.initializeDatabase();

        // Skip if already initialized globally
        if (isGloballyInitialized) {
            return;
        }

        const initialize = async () => {
            // Initialize all tables using ChorusCore
            await chorusCore.initializeTables();

            // Mark as initialized globally
            isGloballyInitialized = true;

            // Update the React state
            updateReactState();
        };

        // Only initialize if not already initialized
        if (!isGloballyInitialized) {
            initialize();
        }
    }, []); // Empty dependency array means this runs once

    return <ChorusContext.Provider value={state}>{children}</ChorusContext.Provider>;
}

// Custom hook to access the Chorus context
export function useChorus() {
    return useContext(ChorusContext);
}

// Custom hook to access harmonized data
export function useHarmonics<T = any>(tableName: string) {
    // Get data from IndexedDB with reactive updates
    const data = useLiveQuery<T[]>(() => {
        return chorusCore.getDb().table(tableName).toArray();
    }, [tableName]);

    // Get status from the Chorus context
    const chorusState = useContext(ChorusContext);
    const tableState = chorusState.tables[tableName] || {
        lastUpdate: null,
        isLoading: false,
        error: null,
    };

    return {
        data,
        isLoading: tableState.isLoading,
        error: tableState.error,
        lastUpdate: tableState.lastUpdate,
    };
}
