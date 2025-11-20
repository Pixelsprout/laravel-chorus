var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useEcho } from "@laravel/echo-react";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ChorusCore } from "@pixelsprout/chorus-core";
import { connectChorusActionsAPI } from "@pixelsprout/chorus-core";
import React from "react";
// Create the context with default values
const ChorusContext = createContext({
    isInitialized: false,
    tables: {},
    schema: {},
    chorusCore: null,
});
const HarmonicListener = ({ channel, onEvent }) => {
    useEcho(channel, ".harmonic.created", (event) => {
        onEvent(event);
    });
    return null;
};
export function ChorusProvider({ children, userId, channelPrefix, onRejectedHarmonic, onSchemaVersionChange, onDatabaseVersionChange, debugMode, }) {
    // Create a new ChorusCore instance for this component instance
    // This prevents shared state issues across component remounts
    const [chorusCore] = useState(() => new ChorusCore({ debugMode: debugMode !== null && debugMode !== void 0 ? debugMode : false }));
    const [isInitialized, setIsInitialized] = useState(false);
    const [tables, setTables] = useState({});
    const [schema, setSchema] = useState({});
    const [initializationError, setInitializationError] = useState(null);
    const handleHarmonicEvent = (event) => __awaiter(this, void 0, void 0, function* () {
        // Skip processing harmonics during database rebuild
        if (chorusCore.getIsRebuilding()) {
            console.log('[Chorus] Skipping harmonic event during database rebuild:', event);
            return;
        }
        // Process the harmonic - chorus-core now handles shadow cleanup and delta sync status
        yield chorusCore.processHarmonic(event);
        // Refresh the UI state
        setTables(chorusCore.getAllTableStates());
    });
    useEffect(() => {
        let isCancelled = false;
        const initialize = () => __awaiter(this, void 0, void 0, function* () {
            try {
                setInitializationError(null);
                chorusCore.setup(userId !== null && userId !== void 0 ? userId : "guest", onRejectedHarmonic, onSchemaVersionChange, onDatabaseVersionChange, (newTableStates) => {
                    if (!isCancelled) {
                        setTables(newTableStates);
                    }
                });
                const fetchedSchema = yield chorusCore.fetchAndInitializeSchema();
                yield chorusCore.initializeTables();
                // Connect ChorusActionsAPI with ChorusCore for optimistic updates
                connectChorusActionsAPI(chorusCore);
                if (!isCancelled) {
                    setSchema(fetchedSchema);
                }
                if (!isCancelled) {
                    setIsInitialized(chorusCore.getIsInitialized());
                    setTables(chorusCore.getAllTableStates());
                }
            }
            catch (error) {
                console.error("[Chorus] Failed to initialize:", error);
                if (!isCancelled) {
                    setIsInitialized(false);
                    setInitializationError(error instanceof Error ? error.message : String(error));
                    // Set error state for all tables
                    const errorTables = {};
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
        });
        initialize();
        return () => {
            isCancelled = true;
            // Cleanup ChorusCore when component unmounts
            try {
                if (chorusCore && typeof chorusCore.cleanup === 'function') {
                    chorusCore.cleanup();
                }
            }
            catch (err) {
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
    return (React.createElement(ChorusContext.Provider, { value: contextValue },
        React.createElement(HarmonicListener, { channel: `chorus.user.${userId !== null && userId !== void 0 ? userId : "guest"}`, onEvent: handleHarmonicEvent }),
        channelPrefix && (React.createElement(HarmonicListener, { channel: `chorus.${channelPrefix}.user.${userId !== null && userId !== void 0 ? userId : "guest"}`, onEvent: handleHarmonicEvent })),
        children));
}
export function useChorus() {
    return useContext(ChorusContext);
}
export function useHarmonics(tableName, query) {
    const shadowTableName = `${tableName}_shadow`;
    const deltaTableName = `${tableName}_deltas`;
    const { tables, isInitialized } = useChorus();
    const tableState = tables[tableName] || {
        lastUpdate: null,
        isLoading: false,
        error: null,
    };
    const { chorusCore } = useChorus();
    const data = useLiveQuery(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!chorusCore)
            return [];
        yield chorusCore.waitUntilReady(); // blocks until DB is initialized
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
            const deltaTable = (_a = chorusCore === null || chorusCore === void 0 ? void 0 : chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(deltaTableName);
            if (!deltaTable)
                return merged;
            const pendingDeletes = yield deltaTable
                .where('[operation+sync_status]')
                .equals(['delete', 'pending'])
                .toArray();
            const deleteIds = new Set(pendingDeletes.map((delta) => delta.data.id));
            return merged.filter((item) => !deleteIds.has(item.id));
        }
        catch (error) {
            console.error(`[Chorus] Error querying ${tableName}:`, error);
            return [];
        }
    }), [isInitialized, tableName, query]);
    const actions = useMemo(() => ({
        create: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore === null || chorusCore === void 0 ? void 0 : chorusCore.getDb();
            if (!db)
                return;
            const shadowTable = db.table(shadowTableName);
            const deltaTable = db.table(deltaTableName);
            yield shadowTable.add(data);
            yield deltaTable.add({
                operation: "create",
                data,
                sync_status: "pending",
            });
            if (sideEffect) {
                sideEffect(data).catch((error) => console.error("[Chorus] Side effect for create failed:", error));
            }
        }),
        update: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore === null || chorusCore === void 0 ? void 0 : chorusCore.getDb();
            if (!db)
                return;
            const shadowTable = db.table(shadowTableName);
            const deltaTable = db.table(deltaTableName);
            yield shadowTable.put(data);
            yield deltaTable.add({
                operation: "update",
                data,
                sync_status: "pending",
            });
            if (sideEffect) {
                sideEffect(data).catch((error) => console.error("[Chorus] Side effect for update failed:", error));
            }
        }),
        delete: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore === null || chorusCore === void 0 ? void 0 : chorusCore.getDb();
            if (!db)
                return;
            const shadowTable = db.table(shadowTableName);
            const deltaTable = db.table(deltaTableName);
            yield shadowTable.delete(data.id);
            yield deltaTable.add({
                operation: "delete",
                data,
                sync_status: "pending",
            });
            if (sideEffect) {
                sideEffect(data).catch((error) => console.error("[Chorus] Side effect for delete failed:", error));
            }
        }),
    }), [shadowTableName, deltaTableName]);
    return {
        data,
        isLoading: tableState.isLoading,
        error: tableState.error,
        lastUpdate: tableState.lastUpdate,
        actions,
    };
}
export function useChorusStatus(tableName) {
    const { tables } = useChorus();
    return tables[tableName] || { lastUpdate: null, isLoading: false, error: null };
}
/**
 * Helper hook that automatically memoizes query functions for useHarmonics.
 * Use this when your query depends on reactive values to prevent infinite re-renders.
 *
 * @example
 * const query = useTableQuery<Message>(
 *   (table) => selectedPlatform
 *     ? table.where('platform_id').equals(selectedPlatform)
 *     : table,
 *   [selectedPlatform] // dependencies
 * );
 * const { data } = useHarmonics('messages', query);
 */
export function useTableQuery(queryFn, deps) {
    return useCallback(queryFn, deps);
}
