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
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ChorusCore } from "../../core/chorus";
import React from "react";
// Create a new ChorusCore instance
const chorusCore = new ChorusCore();
// Create the context with default values
const ChorusContext = createContext({
    isInitialized: false,
    tables: {},
});
const HarmonicListener = ({ channel, onEvent }) => {
    useEcho(channel, ".harmonic.created", (event) => {
        onEvent(event);
    });
    return null;
};
export function ChorusProvider({ children, userId, channelPrefix, schema, }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [tables, setTables] = useState({});
    const handleHarmonicEvent = (event) => __awaiter(this, void 0, void 0, function* () {
        if (!chorusCore.getIsInitialized())
            return;
        const db = chorusCore.getDb();
        if (!db)
            return;
        // Process the harmonic first to update the main table
        yield chorusCore.processHarmonic(event);
        // Now, find the matching pending delta and mark it as synced
        const deltaTableName = `${event.table_name}_deltas`;
        const deltaTable = db.table(deltaTableName);
        const eventData = JSON.parse(event.data);
        // Use a timeout to ensure the optimistic record has been processed
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            const pendingDeltas = yield deltaTable.where('sync_status').equals('pending').toArray();
            for (const delta of pendingDeltas) {
                if (delta.data.id === eventData.id) {
                    try {
                        yield deltaTable.update(delta.id, { sync_status: 'synced' });
                    }
                    catch (err) {
                        console.error(`[Chorus] Failed to update delta ${delta.id}:`, err);
                    }
                    break; // Exit after finding and processing the match
                }
            }
        }), 50); // 50ms delay to prevent race conditions
        // Refresh the UI state
        setTables(chorusCore.getAllTableStates());
    });
    useEffect(() => {
        let isCancelled = false;
        const initialize = () => __awaiter(this, void 0, void 0, function* () {
            chorusCore.reset();
            chorusCore.setup(userId !== null && userId !== void 0 ? userId : "guest", schema !== null && schema !== void 0 ? schema : {});
            yield chorusCore.initializeTables();
            if (!isCancelled) {
                setIsInitialized(chorusCore.getIsInitialized());
                setTables(chorusCore.getAllTableStates());
            }
        });
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
    return (React.createElement(ChorusContext.Provider, { value: contextValue },
        React.createElement(HarmonicListener, { channel: `chorus.user.${userId !== null && userId !== void 0 ? userId : "guest"}`, onEvent: handleHarmonicEvent }),
        channelPrefix && (React.createElement(HarmonicListener, { channel: `chorus.${channelPrefix}.user.${userId !== null && userId !== void 0 ? userId : "guest"}`, onEvent: handleHarmonicEvent })),
        children));
}
export function useChorus() {
    return useContext(ChorusContext);
}
export function useHarmonics(tableName) {
    const deltaTableName = `${tableName}_deltas`;
    const data = useLiveQuery(() => { var _a, _b; return (_b = (_a = chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(tableName).toArray()) !== null && _b !== void 0 ? _b : []; }, [tableName]);
    const optimisticData = useLiveQuery(() => { var _a, _b; return (_b = (_a = chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(deltaTableName).toArray()) !== null && _b !== void 0 ? _b : []; }, [deltaTableName]);
    const { tables } = useChorus();
    const tableState = tables[tableName] || { lastUpdate: null, isLoading: false, error: null };
    const actions = {
        create: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTable = db.table(deltaTableName);
            yield deltaTable.add({ operation: 'create', data, sync_status: 'pending' });
            if (sideEffect) {
                sideEffect(data).catch(error => console.error('[Chorus] Side effect for create failed:', error));
            }
        }),
        update: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTable = db.table(deltaTableName);
            yield deltaTable.add({ operation: 'update', data, sync_status: 'pending' });
            if (sideEffect) {
                sideEffect(data).catch(error => console.error('[Chorus] Side effect for update failed:', error));
            }
        }),
        delete: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTable = db.table(deltaTableName);
            yield deltaTable.add({ operation: 'delete', data, sync_status: 'pending' });
            if (sideEffect) {
                sideEffect(data).catch(error => console.error('[Chorus] Side effect for delete failed:', error));
            }
        }),
    };
    const mergedData = useMemo(() => {
        if (!optimisticData)
            return data;
        const pendingDeltas = optimisticData.filter((delta) => delta.sync_status === 'pending');
        if (pendingDeltas.length === 0)
            return data;
        let processedData = [...(data !== null && data !== void 0 ? data : [])];
        for (const delta of pendingDeltas) {
            switch (delta.operation) {
                case 'create': {
                    const existingIndex = processedData.findIndex((item) => item.id === delta.data.id);
                    if (existingIndex !== -1) {
                        processedData[existingIndex] = Object.assign(Object.assign({}, processedData[existingIndex]), delta.data);
                    }
                    else {
                        processedData.push(delta.data);
                    }
                    break;
                }
                case 'update':
                    processedData = processedData.map((item) => item.id === delta.data.id ? Object.assign(Object.assign({}, item), delta.data) : item);
                    break;
                case 'delete':
                    processedData = processedData.filter((item) => item.id !== delta.data.id);
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
export function useChorusStatus(tableName) {
    const { tables } = useChorus();
    return tables[tableName] || { lastUpdate: null, isLoading: false, error: null };
}
