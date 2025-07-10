import { useEcho } from "@laravel/echo-react";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useState } from "react";
import { ChorusCore, HarmonicEvent, TableState } from "../../core/chorus";

import React from "react";

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

// The Provider component
interface ChorusProviderProps {
  children: React.ReactNode;
  userId?: number;
  channelPrefix?: string; // Add channelPrefix here
  schema?: Record<string, any>;
}

export function ChorusProvider({
  children,
  userId,
  channelPrefix,
  schema,
}: ChorusProviderProps) {
  // State to track syncing status across tables
  const [state, setState] = useState<ChorusContextState>({
    isInitialized: false,
    tables: {},
  });

  // Update React state when core state changes
  const updateReactState = () => {
    setState({
      isInitialized: chorusCore.getIsInitialized(),
      tables: chorusCore.getAllTableStates(),
    });
  };

  // Setup Echo listener for user channel (only if userId is provided)
  useEcho<HarmonicEvent>(
    `chorus.${channelPrefix ? `${channelPrefix}.` : ``}user.${userId ?? "guest"}`,
    ".harmonic.created",
    async (event) => {
      if (chorusCore.getIsInitialized()) {
        // Process the harmonic using ChorusCore
        await chorusCore.processHarmonic(event);

        // Update the React state
        updateReactState();
      }
    },
  );

  // Initialize the data sync
  useEffect(() => {
    let isCancelled = false;

    const initialize = async () => {
      // Reset core for the new user
      chorusCore.reset();
      chorusCore.setup(userId ?? "guest", schema ?? {});

      // Initialize all tables using ChorusCore
      await chorusCore.initializeTables();

      if (!isCancelled) {
        // Update the React state
        updateReactState();
      }
    };

    initialize();

    return () => {
      isCancelled = true;
      chorusCore.reset();
    };
  }, [userId, channelPrefix]); // Re-run when userId or channelPrefix changes

  return (
    <ChorusContext.Provider value={state}>{children}</ChorusContext.Provider>
  );
}

// Custom hook to access the Chorus context
export function useChorus() {
  return useContext(ChorusContext);
}

// Custom hook to access harmonized data
export function useHarmonics<T = any>(tableName: string) {
  // Get data from IndexedDB with reactive updates
  const data = useLiveQuery<T[]>(() => {
    return chorusCore.getDb()?.table(tableName).toArray() ?? [];
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
