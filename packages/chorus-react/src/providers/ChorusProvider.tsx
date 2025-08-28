import { useEcho } from "@laravel/echo-react";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ChorusCore, HarmonicEvent, TableState } from "@pixelsprout/chorus-core";
import { connectChorusActionsAPI } from "@pixelsprout/chorus-core";
import type { ReactChorusProviderProps } from "../provider-types";

import React from "react";
import {Collection, Table} from "dexie";

// Create a new ChorusCore instance per provider instance
// This prevents shared state issues across component remounts

// Define the context state structure
interface ChorusContextState {
  isInitialized: boolean;
  tables: Record<string, TableState>;
  schema: Record<string, any>;
  chorusCore: ChorusCore | null;
}

// Create the context with default values
const ChorusContext = createContext<ChorusContextState>({
  isInitialized: false,
  tables: {},
  schema: {},
  chorusCore: null,
});

const HarmonicListener: React.FC<{
  channel: string;
  onEvent: (event: HarmonicEvent) => void;
}> = ({ channel, onEvent }) => {
  useEcho<HarmonicEvent>(channel, ".harmonic.created", (event: HarmonicEvent) => {
    onEvent(event);
  });
  return null;
};

export function ChorusProvider({
  children,
  userId,
  channelPrefix,
  onRejectedHarmonic,
  onSchemaVersionChange,
  onDatabaseVersionChange,
  debugMode,
}: ReactChorusProviderProps) {
  // Create a new ChorusCore instance for this component instance
  // This prevents shared state issues across component remounts
  const [chorusCore] = useState(() => new ChorusCore({ debugMode: debugMode ?? false }));
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [tables, setTables] = useState<Record<string, TableState>>({});
  const [schema, setSchema] = useState<Record<string, any>>({});
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const handleHarmonicEvent = async (event: HarmonicEvent) => {
    // if (!chorusCore.getIsInitialized()) return;

    // Skip processing harmonics during database rebuild
    if (chorusCore.getIsRebuilding()) {
      console.log('[Chorus] Skipping harmonic event during database rebuild:', event);
      return;
    }

    const db = chorusCore.getDb();
    if (!db) return;

    // Process the harmonic first to update the main table
    await chorusCore.processHarmonic(event);

    // If this is a rejected harmonic, we need to update the delta status and remove from shadow
    if (event.rejected) {
      // Find and update the corresponding delta to mark it as rejected
      if (event.data) {
        try {
          const eventData = event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (eventData.id) {
            // Find all tables to check for matching deltas
            const tableNames = Object.keys(chorusCore.getAllTableStates());
            for (const tableName of tableNames) {
              const deltaTableName = `${tableName}_deltas`;
              const shadowTableName = `${tableName}_shadow`;
              const deltaTable = db.table(deltaTableName);
              const shadowTable = db.table(shadowTableName);
              
              const pendingDeltas = await deltaTable
                .where("sync_status")
                .equals("pending")
                .toArray();
              
              for (const delta of pendingDeltas) {
                if (delta.data?.id === eventData.id) {
                  // Mark delta as rejected (keeping it as a log)
                  await deltaTable.update(delta.id, { 
                    sync_status: "rejected",
                    rejected_reason: event.rejected_reason 
                  });
                  
                  // Remove the item from shadow table so it disappears from UI
                  await shadowTable.delete(eventData.id);
                  break;
                }
              }
            }
          }
        } catch (err) {
          // Only log DatabaseClosedError as warning, others as errors
          if (err instanceof Error && err.name === 'DatabaseClosedError') {
            console.warn('Database was closed during rejected delta processing:', err.message);
          } else {
            console.error('Failed to update rejected delta:', err);
          }
        }
      }
      setTables(chorusCore.getAllTableStates());
      return;
    }

    // Now, find the matching pending delta and mark it as synced
    const deltaTableName = `${event.table_name}_deltas`;
    const shadowTableName = `${event.table_name}_shadow`;
    const deltaTable = db.table(deltaTableName);
    const shadowTable = db.table(shadowTableName);
    const eventData = JSON.parse(event.data as unknown as string);

    const pendingDeltas = await deltaTable
      .where("sync_status")
      .equals("pending")
      .toArray();
    for (const delta of pendingDeltas) {
      if (delta.data.id === eventData.id) {
        try {
          const syncStatus = event.rejected ? "rejected" : "synced";
          await deltaTable.update(delta.id, { 
            sync_status: syncStatus,
            rejected_reason: event.rejected_reason 
          });
          if (!event.rejected) {
            await shadowTable.delete(delta.data.id);
          }
        } catch (err) {
          console.error(`[Chorus] Failed to update delta ${delta.id}:`, err);
        }
        break; // Exit after finding and processing the match
      }
    }

    // Refresh the UI state
    setTables(chorusCore.getAllTableStates());
  };

  useEffect(() => {
    let isCancelled = false;
    const initialize = async () => {
      try {
        setInitializationError(null);
        chorusCore.setup(
          userId ?? "guest", 
          onRejectedHarmonic, 
          onSchemaVersionChange, 
          onDatabaseVersionChange,
          (newTableStates) => {
            if (!isCancelled) {
              setTables(newTableStates);
            }
          }
        );
        
        const fetchedSchema = await chorusCore.fetchAndInitializeSchema();
        
        await chorusCore.initializeTables();

        // Connect ChorusActionsAPI with ChorusCore for optimistic updates
        connectChorusActionsAPI(chorusCore);

        if (!isCancelled) {
          setSchema(fetchedSchema);
        }
        
        if (!isCancelled) {
          setIsInitialized(chorusCore.getIsInitialized());
          setTables(chorusCore.getAllTableStates());
        }
      } catch (error) {
        console.error("[Chorus] Failed to initialize:", error);
        if (!isCancelled) {
          setIsInitialized(false);
          setInitializationError(error instanceof Error ? error.message : String(error));
          // Set error state for all tables
          const errorTables: Record<string, TableState> = {};
          const currentSchema = chorusCore.getSchema();
          Object.keys(currentSchema).forEach(tableName => {
            errorTables[tableName] = {
              lastUpdate: null,
              isLoading: false,
              error: `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
            };
          });
          setTables(errorTables);
        }
      }
    };
    initialize();
    return () => {
      isCancelled = true;
      // Cleanup ChorusCore when component unmounts
      try {
        if (chorusCore && typeof chorusCore.cleanup === 'function') {
          chorusCore.cleanup();
        }
      } catch (err) {
        console.error("[Chorus] Error during cleanup:", err);
      }
    };
  }, [userId, channelPrefix, onRejectedHarmonic, onSchemaVersionChange, onDatabaseVersionChange]);

  const contextValue = useMemo(() => ({
    isInitialized,
    tables,
    schema,
    chorusCore,
  }), [isInitialized, tables, schema, chorusCore]);

  // Show initialization error if there is one
  if (initializationError) {
    console.error("[Chorus] Initialization error:", initializationError);
  }

  return (
    <ChorusContext.Provider value={contextValue}>
      <HarmonicListener channel={`chorus.user.${userId ?? "guest"}`} onEvent={handleHarmonicEvent} />
      {channelPrefix && (
        <HarmonicListener channel={`chorus.${channelPrefix}.user.${userId ?? "guest"}`} onEvent={handleHarmonicEvent} />
      )}
      {children}
    </ChorusContext.Provider>
  );
}

export function useChorus() {
  return useContext(ChorusContext);
}

type Action<TInput, T> = (data: TInput, sideEffect?: (data: TInput) => Promise<void>) => void;

interface HarmonicActions<T, TInput> {
  create?: Action<TInput, T>;
  update?: Action<Partial<TInput> & { id: string }, T>;
  delete?: Action<{ id: string }, T>;
}

export interface HarmonicResponse<T, TInput = never> {
  data: T[] | undefined;
  isLoading: boolean;
  error: any;
  lastUpdate: Date | null;
  actions: HarmonicActions<T, TInput>;
}

export function useHarmonics<T extends { id: string | number}, TInput = never>(
  tableName: string,
  query?: (table: Table<T>) => Table<T> | Collection<T, any>,
): HarmonicResponse<T, TInput> {
  const shadowTableName = `${tableName}_shadow`;
  const deltaTableName = `${tableName}_deltas`;

  const { tables, isInitialized } = useChorus();
  const tableState = tables[tableName] || {
    lastUpdate: null,
    isLoading: false,
    error: null,
  };

  const { chorusCore } = useChorus();
  
  const data = useLiveQuery<T[]>(async () => {
    if (!chorusCore) return [];
    
    await chorusCore.waitUntilReady(); // blocks until DB is initialized

    // Check if the specific table exists
    if (!chorusCore.hasTable(tableName)) {
      console.warn(`[Chorus] Table ${tableName} does not exist in schema`);
      return [];
    }

    const db = chorusCore.getDb();
    if (!db || !db.isOpen()) {
      console.log(`[Chorus] Database not available or not open for ${tableName}`);
      return [];
    }

    try {
      const mainCollection = db.table(tableName);
      const shadowCollection = db.table(shadowTableName);

      if (!mainCollection || !shadowCollection) {
        console.warn(`[Chorus] Tables not found: ${tableName}, ${shadowTableName}`);
        return [];
      }

    const toArray = async (result: any): Promise<T[]> => {
      if (Array.isArray(result)) {
        return result;
      }
      if (result && typeof result.toArray === 'function') {
        return await result.toArray();
      }
      return result;
    };

    const mainQuery = query ? query(mainCollection) : mainCollection;
    const shadowQuery = query ? query(shadowCollection) : shadowCollection;

    const [mainData, shadowData] = await Promise.all([
      toArray(mainQuery),
      toArray(shadowQuery)
    ]);

    const shadowDataMap = new Map((shadowData ?? []).map((item) => [item.id, item]));
    const merged = (mainData ?? []).map((item) =>
        shadowDataMap.has(item.id) ? shadowDataMap.get(item.id)! : item
    );

    const mainDataIds = new Set((mainData ?? []).map((item) => item.id));

    if(shadowData && shadowData.length) {
      for (const item of shadowData) {
        if (!mainDataIds.has(item.id)) {
          merged.push(item);
        }
      }
    }

    const deltaTable = chorusCore?.getDb()?.table(deltaTableName);
    if (!deltaTable) return merged;

    const pendingDeletes = await deltaTable
        .where('[operation+sync_status]')
        .equals(['delete', 'pending'])
        .toArray();
      const deleteIds = new Set(pendingDeletes.map((delta) => delta.data.id));
      return merged.filter((item) => !deleteIds.has(item.id));
    } catch (error) {
      console.error(`[Chorus] Error querying ${tableName}:`, error);
      return [];
    }
  }, [isInitialized, tableName, query]);

  const actions: HarmonicActions<T, TInput> = useMemo(() => ({
    create: async (data, sideEffect) => {
      const db = chorusCore?.getDb();
      if (!db) return;
      const shadowTable = db.table(shadowTableName);
      const deltaTable = db.table(deltaTableName);
      await shadowTable.add(data);
      await deltaTable.add({
        operation: "create",
        data,
        sync_status: "pending",
      });
      if (sideEffect) {
        sideEffect(data).catch((error) =>
          console.error("[Chorus] Side effect for create failed:", error),
        );
      }
    },
    update: async (data, sideEffect) => {
      const db = chorusCore?.getDb();
      if (!db) return;
      const shadowTable = db.table(shadowTableName);
      const deltaTable = db.table(deltaTableName);
      await shadowTable.put(data);
      await deltaTable.add({
        operation: "update",
        data,
        sync_status: "pending",
      });
      if (sideEffect) {
        sideEffect(data).catch((error) =>
          console.error("[Chorus] Side effect for update failed:", error),
        );
      }
    },
    delete: async (data, sideEffect) => {
      const db = chorusCore?.getDb();
      if (!db) return;
      const shadowTable = db.table(shadowTableName);
      const deltaTable = db.table(deltaTableName);
      await shadowTable.delete(data.id);
      await deltaTable.add({
        operation: "delete",
        data,
        sync_status: "pending",
      });
      if (sideEffect) {
        sideEffect(data).catch((error) =>
          console.error("[Chorus] Side effect for delete failed:", error),
        );
      }
    },
  }), [shadowTableName, deltaTableName]);

  return {
    data,
    isLoading: tableState.isLoading,
    error: tableState.error,
    lastUpdate: tableState.lastUpdate,
    actions,
  };
}

export function useChorusStatus(tableName: string) {
  const { tables } = useChorus();
  return tables[tableName] || { lastUpdate: null, isLoading: false, error: null };
}

/**
 * Helper hook that automatically memoizes query functions for useHarmonics.
 * Use this when your query depends on reactive values to prevent infinite re-renders.
 * 
 * @example
 * const query = useHarmonicsQuery<Message>(
 *   (table) => selectedPlatform 
 *     ? table.where('platform_id').equals(selectedPlatform)
 *     : table,
 *   [selectedPlatform] // dependencies
 * );
 * const { data } = useHarmonics('messages', query);
 */
export function useHarmonicsQuery<T extends { id: string | number }>(
  queryFn: (table: Table<T>) => Table<T> | Collection<T, any>,
  deps: React.DependencyList
): (table: Table<T>) => Table<T> | Collection<T, any> {
  return useCallback(queryFn, deps);
}
