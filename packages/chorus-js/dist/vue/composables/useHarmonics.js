var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ref, computed, watchEffect, onUnmounted } from 'vue';
import { useChorus } from '../providers/ChorusProvider';
export function useHarmonics(tableName, query) {
    const shadowTableName = `${tableName}_shadow`;
    const deltaTableName = `${tableName}_deltas`;
    const { chorusCore, tables, isInitialized } = useChorus();
    const data = ref(undefined);
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
    let isActive = true;
    let updateInterval = null;
    const updateData = () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!isActive)
            return;
        try {
            yield chorusCore.waitUntilReady(); // blocks until DB is initialized
            // Check if the specific table exists
            if (!chorusCore.hasTable(tableName)) {
                console.warn(`[Chorus] Table ${tableName} does not exist in schema`);
                data.value = [];
                return;
            }
            const db = chorusCore.getDb();
            if (!db || !db.isOpen()) {
                console.log(`[Chorus] Database not available or not open for ${tableName}`);
                data.value = [];
                return;
            }
            const mainCollection = db.table(tableName);
            const shadowCollection = db.table(shadowTableName);
            if (!mainCollection || !shadowCollection) {
                console.warn(`[Chorus] Tables not found: ${tableName}, ${shadowTableName}`);
                data.value = [];
                return;
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
                data.value = merged;
                return;
            }
            const pendingDeletes = yield deltaTable
                .where('[operation+sync_status]')
                .equals(['delete', 'pending'])
                .toArray();
            const deleteIds = new Set(pendingDeletes.map((delta) => delta.data.id));
            data.value = merged.filter((item) => !deleteIds.has(item.id));
        }
        catch (queryError) {
            console.error(`[Chorus] Error querying ${tableName}:`, queryError);
            data.value = [];
        }
    });
    // Watch for initialization and start polling
    watchEffect(() => {
        if (isInitialized.value) {
            updateData();
            // Set up polling for real-time updates
            if (updateInterval) {
                clearInterval(updateInterval);
            }
            updateInterval = window.setInterval(updateData, 100); // Poll every 100ms
        }
    });
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
            // Trigger immediate update
            updateData();
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
            // Trigger immediate update
            updateData();
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
            // Trigger immediate update
            updateData();
        }),
    };
    onUnmounted(() => {
        isActive = false;
        if (updateInterval) {
            clearInterval(updateInterval);
        }
    });
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
 * const query = useHarmonicsQuery<Message>(
 *   (table) => selectedPlatform.value
 *     ? table.where('platform_id').equals(selectedPlatform.value)
 *     : table,
 *   [selectedPlatform] // dependencies
 * );
 * const { data } = useHarmonics('messages', query.value);
 */
export function useHarmonicsQuery(queryFn, deps) {
    return computed(() => queryFn);
}
