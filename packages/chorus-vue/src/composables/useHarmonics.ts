import { ref, computed, watchEffect, onUnmounted, type Ref } from 'vue';
import type { Collection, Table } from 'dexie';
import { liveQuery } from 'dexie';
import { useObservable } from '@vueuse/rxjs';
import { useChorus } from '../providers/ChorusProvider';

interface HarmonicActions<T, TInput> {
  create?: (data: TInput, sideEffect?: (data: TInput) => Promise<void>) => Promise<void>;
  update?: (data: Partial<TInput> & { id: string }, sideEffect?: (data: Partial<TInput> & { id: string }) => Promise<void>) => Promise<void>;
  delete?: (data: { id: string }, sideEffect?: (data: { id: string }) => Promise<void>) => Promise<void>;
}

export interface HarmonicResponse<T, TInput = never> {
  data: Ref<T[]>;
  isLoading: Ref<boolean>;
  error: Ref<any>;
  lastUpdate: Ref<Date | null>;
  actions: HarmonicActions<T, TInput>;
}

export function useHarmonics<T extends { id: string | number }, TInput = never>(
  tableName: string,
  query?: (table: Table<T>) => Table<T> | Collection<T, any>,
): HarmonicResponse<T, TInput> {
  const shadowTableName = `${tableName}_shadow`;
  const deltaTableName = `${tableName}_deltas`;

  const { chorusCore, tables, isInitialized } = useChorus();
  
  const isLoading = ref(false);
  const error = ref<any>(null);
  const lastUpdate = ref<Date | null>(null);

  // Watch for table state changes
  const tableState = computed(() => 
    tables[tableName] || {
      lastUpdate: null,
      isLoading: false,
      error: null,
    }
  );

  // Update reactive refs when table state changes
  watchEffect(() => {
    isLoading.value = tableState.value.isLoading;
    error.value = tableState.value.error;
    lastUpdate.value = tableState.value.lastUpdate;
  });

  // Use liveQuery for reactive database updates
  const data = useObservable(
    liveQuery(async (): Promise<T[]> => {
      try {
        await chorusCore.waitUntilReady();

        // Check if the specific table exists
        if (!chorusCore.hasTable(tableName)) {
          console.warn(`[Chorus] Table ${tableName} does not exist in schema`);
          return [] as T[];
        }

        const db = chorusCore.getDb();
        if (!db || !db.isOpen()) {
          console.log(`[Chorus] Database not available or not open for ${tableName}`);
          return [] as T[];
        }

        const mainCollection = db.table(tableName);
        const shadowCollection = db.table(shadowTableName);

        if (!mainCollection || !shadowCollection) {
          console.warn(`[Chorus] Tables not found: ${tableName}, ${shadowTableName}`);
          return [] as T[];
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

        const deltaTable = chorusCore.getDb()?.table(deltaTableName);
        if (!deltaTable) {
          return merged;
        }

        const pendingDeletes = await deltaTable
            .where('[operation+sync_status]')
            .equals(['delete', 'pending'])
            .toArray();
        const deleteIds = new Set(pendingDeletes.map((delta: any) => delta.data.id));
        return merged.filter((item) => !deleteIds.has(item.id));
      } catch (queryError) {
        console.error(`[Chorus] Error querying ${tableName}:`, queryError);
        return [] as T[];
      }
    }) as any,
    { initialValue: [] as T[] }
  ) as Ref<T[]>;

  // Actions
  const actions: HarmonicActions<T, TInput> = {
    create: async (inputData, sideEffect) => {
      const db = chorusCore.getDb();
      if (!db) return;
      const shadowTable = db.table(shadowTableName);
      const deltaTable = db.table(deltaTableName);
      await shadowTable.add(inputData);
      await deltaTable.add({
        operation: "create",
        data: inputData,
        sync_status: "pending",
      });
      if (sideEffect) {
        sideEffect(inputData).catch((error) =>
          console.error("[Chorus] Side effect for create failed:", error),
        );
      }
    },
    update: async (inputData, sideEffect) => {
      const db = chorusCore.getDb();
      if (!db) return;
      const shadowTable = db.table(shadowTableName);
      const deltaTable = db.table(deltaTableName);
      await shadowTable.put(inputData);
      await deltaTable.add({
        operation: "update",
        data: inputData,
        sync_status: "pending",
      });
      if (sideEffect) {
        sideEffect(inputData).catch((error) =>
          console.error("[Chorus] Side effect for update failed:", error),
        );
      }
    },
    delete: async (inputData, sideEffect) => {
      const db = chorusCore.getDb();
      if (!db) return;
      const shadowTable = db.table(shadowTableName);
      const deltaTable = db.table(deltaTableName);
      await shadowTable.delete(inputData.id);
      await deltaTable.add({
        operation: "delete",
        data: inputData,
        sync_status: "pending",
      });
      if (sideEffect) {
        sideEffect(inputData).catch((error) =>
          console.error("[Chorus] Side effect for delete failed:", error),
        );
      }
    },
  };

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    actions,
  };
}

/**
 * Helper composable that automatically memoizes query functions for useHarmonics.
 * Use this when your query depends on reactive values to prevent infinite re-renders.
 * 
 * @example
 * const query = useTableQuery<Message>(
 *   (table) => selectedPlatform.value
 *     ? table.where('platform_id').equals(selectedPlatform.value)
 *     : table,
 *   [selectedPlatform] // dependencies
 * );
 * const { data } = useHarmonics('messages', query.value);
 */
export function useTableQuery<T extends { id: string | number }>(
  queryFn: (table: Table<T>) => Table<T> | Collection<T, any>,
  deps: Ref<any>[]
): Ref<(table: Table<T>) => Table<T> | Collection<T, any>> {
  return computed(() => queryFn);
}