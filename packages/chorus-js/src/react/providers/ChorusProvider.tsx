import { useEcho } from "@laravel/echo-react";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  channelPrefix?: string;
  schema?: Record<string, any>;
}

const HarmonicListener: React.FC<{
  channel: string;
  onEvent: (event: HarmonicEvent) => void;
}> = ({ channel, onEvent }) => {
  useEcho<HarmonicEvent>(channel, ".harmonic.created", (event) => {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [tables, setTables] = useState<Record<string, TableState>>({});

  const handleHarmonicEvent = async (event: HarmonicEvent) => {
    if (!chorusCore.getIsInitialized()) return;

    const db = chorusCore.getDb();
    if (!db) return;

    // Process the harmonic first to update the main table
    await chorusCore.processHarmonic(event);

    // Now, find the matching pending delta and mark it as synced
    const deltaTableName = `${event.table_name}_deltas`;
    const deltaTable = db.table(deltaTableName);
    const eventData = JSON.parse(event.data as unknown as string);

    const pendingDeltas = await deltaTable.where('sync_status').equals('pending').toArray();
    for (const delta of pendingDeltas) {
        if (delta.data.id === eventData.id) {
            try {
                await deltaTable.update(delta.id, { sync_status: 'synced' });
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
      chorusCore.reset();
      chorusCore.setup(userId ?? "guest", schema ?? {});
      await chorusCore.initializeTables();
      if (!isCancelled) {
        setIsInitialized(chorusCore.getIsInitialized());
        setTables(chorusCore.getAllTableStates());
      }
    };
    initialize();
    return () => {
      isCancelled = true;
      chorusCore.reset();
    };
  }, [userId, channelPrefix, schema]);

  const contextValue = useMemo(() => ({
    isInitialized,
    tables,
  }), [isInitialized, tables]);

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

export function useHarmonics<T, TInput = never>(
  tableName: string
): HarmonicResponse<T, TInput> {
  const deltaTableName = `${tableName}_deltas`;

  const data = useLiveQuery<T[]>(() => chorusCore.getDb()?.table(tableName).toArray() ?? [], [tableName]);
  const optimisticData = useLiveQuery<any[]>(() => chorusCore.getDb()?.table(deltaTableName).toArray() ?? [], [deltaTableName]);

  const { tables } = useChorus();
  const tableState = tables[tableName] || { lastUpdate: null, isLoading: false, error: null };

  const actions: HarmonicActions<T, TInput> = {
    create: async (data, sideEffect) => {
      const db = chorusCore.getDb();
      if (!db) return;
      const deltaTable = db.table(deltaTableName);
      await deltaTable.add({ operation: 'create', data, sync_status: 'pending' });
      if (sideEffect) {
        sideEffect(data).catch(error => console.error('[Chorus] Side effect for create failed:', error));
      }
    },
    update: async (data, sideEffect) => {
      const db = chorusCore.getDb();
      if (!db) return;
      const deltaTable = db.table(deltaTableName);
      await deltaTable.add({ operation: 'update', data, sync_status: 'pending' });
      if (sideEffect) {
        sideEffect(data).catch(error => console.error('[Chorus] Side effect for update failed:', error));
      }
    },
    delete: async (data, sideEffect) => {
      const db = chorusCore.getDb();
      if (!db) return;
      const deltaTable = db.table(deltaTableName);
      await deltaTable.add({ operation: 'delete', data, sync_status: 'pending' });
      if (sideEffect) {
        sideEffect(data).catch(error => console.error('[Chorus] Side effect for delete failed:', error));
      }
    },
  };

  const mergedData = useMemo(() => {
    if (!optimisticData) return data;
    const pendingDeltas = optimisticData.filter((delta) => delta.sync_status === 'pending');
    if (pendingDeltas.length === 0) return data;

    let processedData = [...(data ?? [])];
    for (const delta of pendingDeltas) {
      switch (delta.operation) {
        case 'create': {
          const existingIndex = processedData.findIndex((item: any) => item.id === delta.data.id);
          if (existingIndex !== -1) {
            processedData[existingIndex] = { ...processedData[existingIndex], ...delta.data };
          } else {
            processedData.push(delta.data);
          }
          break;
        }
        case 'update':
          processedData = processedData.map((item: any) =>
            item.id === delta.data.id ? { ...item, ...delta.data } : item
          );
          break;
        case 'delete':
          processedData = processedData.filter((item: any) => item.id !== delta.data.id);
          break;
      }
    }
    return processedData;
  }, [data, optimisticData]);

  return {
    data: mergedData,
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
