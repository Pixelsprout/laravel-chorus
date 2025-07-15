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

const HarmonicListener: React.FC<{
  channel: string;
  onEvent: (event: HarmonicEvent) => void;
}> = ({ channel, onEvent }) => {
  useEcho<HarmonicEvent>(channel, ".harmonic.created", async (event) => {
    onEvent(event);
  });
  return null;
};

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

  const handleHarmonicEvent = async (event: HarmonicEvent) => {
    if (chorusCore.getIsInitialized()) {
      // Process the harmonic using ChorusCore
      await chorusCore.processHarmonic(event);

      // Update the React state
      updateReactState();
    }
  };

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
      <ChorusContext.Provider value={state}>
        <HarmonicListener
            channel={`chorus.user.${userId ?? "guest"}`}
            onEvent={handleHarmonicEvent}
        />
        {channelPrefix && (
            <HarmonicListener
                channel={`chorus.${channelPrefix}.user.${userId ?? "guest"}`}
                onEvent={handleHarmonicEvent}
            />
        )}
        {children}
      </ChorusContext.Provider>
  );
}

// Custom hook to access the Chorus context
export function useChorus() {
  return useContext(ChorusContext);
}

type Action<TInput, T> = (data: TInput, sideEffect?: (data: TInput) => Promise<void>) => void;

interface HarmonicActions<T, TInput> {
  create?: Action<TInput, T>;
  update?: Action<Partial<TInput> & { id: string }, T>;
  delete?: Action<{ id: string }, T>;
}

// Define the response structure for the useHarmonics hook
export interface HarmonicResponse<T, TInput = never> {
  data: T[] | undefined;
  isLoading: boolean;
  error: any;
  lastUpdate: Date | null;
  actions: HarmonicActions<T, TInput>;
}

// Custom hook to access harmonized data
export function useHarmonics<T, TInput = never>(
    tableName: string
): HarmonicResponse<T, TInput> {
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

  // Define the actions
  const actions: HarmonicActions<T, TInput> = {
    create: (data, sideEffect) => {
      if (sideEffect) {
        sideEffect(data).then(result => {
          console.log('Side effect completed successfully:', result);
        }).catch(error => {
          console.error('Side effect failed:', error);
        });
      }
    },
    update: (data, sideEffect) => {
      console.log("update", data);
      if (sideEffect) {
        sideEffect(data).then(result => {
          console.log('Side effect completed successfully:', result);
        }).catch(error => {
          console.error('Side effect failed:', error);
        });
      }
    },
    delete: (data, sideEffect) => {
      console.log("delete", data);
      if (sideEffect) {
        sideEffect(data).then(result => {
          console.log('Side effect completed successfully:', result);
        }).catch(error => {
          console.error('Side effect failed:', error);
        });
      }
    }
  };

  return {
    data,
    isLoading: tableState.isLoading,
    error: tableState.error,
    lastUpdate: tableState.lastUpdate,
    actions,
  };
}