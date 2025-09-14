var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ref, computed, watchEffect } from 'vue';
import { liveQuery } from 'dexie';
import { useObservable } from '@vueuse/rxjs';
import { useChorus } from '../providers/ChorusProvider';
export function useHarmonics(tableName, query) {
    const shadowTableName = `${tableName}_shadow`;
    const deltaTableName = `${tableName}_deltas`;
    const { chorusCore, tables, isInitialized } = useChorus();
    const isLoading = ref(false);
    const error = ref(null);
    const lastUpdate = ref(null);
    // Watch for table state changes
    const tableState = computed(() => tables[tableName] || {
        lastUpdate: null,
        isLoading: false,
        error: null,
    });
    // Update reactive refs when table state changes
    watchEffect(() => {
        isLoading.value = tableState.value.isLoading;
        error.value = tableState.value.error;
        lastUpdate.value = tableState.value.lastUpdate;
    });
    // Use liveQuery for reactive database updates
    const data = useObservable(liveQuery(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            yield chorusCore.waitUntilReady();
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
            const mainCollection = db.table(tableName);
            const shadowCollection = db.table(shadowTableName);
            if (!mainCollection || !shadowCollection) {
                console.warn(`[Chorus] Tables not found: ${tableName}, ${shadowTableName}`);
                return [];
            }
            const toArray = (result) => __awaiter(this, void 0, void 0, function* () {
                if (Array.isArray(result)) {
                    return result;
                }
                if (result && typeof result.toArray === 'function') {
                    return yield result.toArray();
                }
                return result;
            });
            const mainQuery = query ? query(mainCollection) : mainCollection;
            const shadowQuery = query ? query(shadowCollection) : shadowCollection;
            const [mainData, shadowData] = yield Promise.all([
                toArray(mainQuery),
                toArray(shadowQuery)
            ]);
            const shadowDataMap = new Map((shadowData !== null && shadowData !== void 0 ? shadowData : []).map((item) => [item.id, item]));
            const merged = (mainData !== null && mainData !== void 0 ? mainData : []).map((item) => shadowDataMap.has(item.id) ? shadowDataMap.get(item.id) : item);
            const mainDataIds = new Set((mainData !== null && mainData !== void 0 ? mainData : []).map((item) => item.id));
            if (shadowData && shadowData.length) {
                for (const item of shadowData) {
                    if (!mainDataIds.has(item.id)) {
                        merged.push(item);
                    }
                }
            }
            const deltaTable = (_a = chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(deltaTableName);
            if (!deltaTable) {
                return merged;
            }
            const pendingDeletes = yield deltaTable
                .where('[operation+sync_status]')
                .equals(['delete', 'pending'])
                .toArray();
            const deleteIds = new Set(pendingDeletes.map((delta) => delta.data.id));
            return merged.filter((item) => !deleteIds.has(item.id));
        }
        catch (queryError) {
            console.error(`[Chorus] Error querying ${tableName}:`, queryError);
            return [];
        }
    })), { initialValue: [] });
    // Actions
    const actions = {
        create: (inputData, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const shadowTable = db.table(shadowTableName);
            const deltaTable = db.table(deltaTableName);
            yield shadowTable.add(inputData);
            yield deltaTable.add({
                operation: "create",
                data: inputData,
                sync_status: "pending",
            });
            if (sideEffect) {
                sideEffect(inputData).catch((error) => console.error("[Chorus] Side effect for create failed:", error));
            }
        }),
        update: (inputData, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const shadowTable = db.table(shadowTableName);
            const deltaTable = db.table(deltaTableName);
            yield shadowTable.put(inputData);
            yield deltaTable.add({
                operation: "update",
                data: inputData,
                sync_status: "pending",
            });
            if (sideEffect) {
                sideEffect(inputData).catch((error) => console.error("[Chorus] Side effect for update failed:", error));
            }
        }),
        delete: (inputData, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const shadowTable = db.table(shadowTableName);
            const deltaTable = db.table(deltaTableName);
            yield shadowTable.delete(inputData.id);
            yield deltaTable.add({
                operation: "delete",
                data: inputData,
                sync_status: "pending",
            });
            if (sideEffect) {
                sideEffect(inputData).catch((error) => console.error("[Chorus] Side effect for delete failed:", error));
            }
        }),
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
export function useTableQuery(queryFn, deps) {
    return computed(() => queryFn);
}
