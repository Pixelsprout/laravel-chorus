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
    useEcho(channel, ".harmonic.created", (event) => __awaiter(void 0, void 0, void 0, function* () {
        onEvent(event);
    }));
    return null;
};
export function ChorusProvider({ children, userId, channelPrefix, schema, }) {
    // State to track syncing status across tables
    const [state, setState] = useState({
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
    const handleHarmonicEvent = (event) => __awaiter(this, void 0, void 0, function* () {
        if (chorusCore.getIsInitialized()) {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTableName = `${event.table_name}_deltas`;
            const deltaTable = db.table(deltaTableName);
            const pendingDeltas = yield deltaTable.where('sync_status').equals('pending').toArray();
            const eventData = JSON.parse(event.data);
            console.debug("eventData", eventData);
            for (const delta of pendingDeltas) {
                if (delta.data.id === eventData.id) {
                    yield deltaTable.update(delta.id, { sync_status: 'synced' });
                }
            }
            // Process the harmonic using ChorusCore
            yield chorusCore.processHarmonic(event);
            // Update the React state
            updateReactState();
        }
    });
    // Initialize the data sync
    useEffect(() => {
        let isCancelled = false;
        const initialize = () => __awaiter(this, void 0, void 0, function* () {
            // Reset core for the new user
            chorusCore.reset();
            chorusCore.setup(userId !== null && userId !== void 0 ? userId : "guest", schema !== null && schema !== void 0 ? schema : {});
            // Initialize all tables using ChorusCore
            yield chorusCore.initializeTables();
            if (!isCancelled) {
                // Update the React state
                updateReactState();
            }
        });
        initialize();
        return () => {
            isCancelled = true;
            chorusCore.reset();
        };
    }, [userId, channelPrefix]); // Re-run when userId or channelPrefix changes
    return (React.createElement(ChorusContext.Provider, { value: state },
        React.createElement(HarmonicListener, { channel: `chorus.user.${userId !== null && userId !== void 0 ? userId : "guest"}`, onEvent: handleHarmonicEvent }),
        channelPrefix && (React.createElement(HarmonicListener, { channel: `chorus.${channelPrefix}.user.${userId !== null && userId !== void 0 ? userId : "guest"}`, onEvent: handleHarmonicEvent })),
        children));
}
// Custom hook to access the Chorus context
export function useChorus() {
    return useContext(ChorusContext);
}
// Custom hook to access harmonized data
export function useHarmonics(tableName) {
    const deltaTableName = `${tableName}_deltas`;
    // Get data from IndexedDB with reactive updates
    const data = useLiveQuery(() => {
        var _a, _b;
        return (_b = (_a = chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(tableName).toArray()) !== null && _b !== void 0 ? _b : [];
    }, [tableName]);
    const optimisticData = useLiveQuery(() => {
        var _a, _b;
        return (_b = (_a = chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(deltaTableName).toArray()) !== null && _b !== void 0 ? _b : [];
    }, [deltaTableName]);
    // Get status from the Chorus context
    const chorusState = useContext(ChorusContext);
    const tableState = chorusState.tables[tableName] || {
        lastUpdate: null,
        isLoading: false,
        error: null,
    };
    // Define the actions
    const actions = {
        create: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTable = db.table(deltaTableName);
            yield deltaTable.add({
                operation: 'create',
                data: data,
                sync_status: 'pending'
            });
            if (sideEffect) {
                sideEffect(data).then(result => {
                    console.log('Side effect completed successfully:', result);
                }).catch(error => {
                    console.error('Side effect failed:', error);
                });
            }
        }),
        update: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTable = db.table(deltaTableName);
            yield deltaTable.add({
                operation: 'update',
                data: data,
                sync_status: 'pending'
            });
            if (sideEffect) {
                sideEffect(data).then(result => {
                    console.log('Side effect completed successfully:', result);
                }).catch(error => {
                    console.error('Side effect failed:', error);
                });
            }
        }),
        delete: (data, sideEffect) => __awaiter(this, void 0, void 0, function* () {
            const db = chorusCore.getDb();
            if (!db)
                return;
            const deltaTable = db.table(deltaTableName);
            yield deltaTable.add({
                operation: 'delete',
                data: data,
                sync_status: 'pending'
            });
            if (sideEffect) {
                sideEffect(data).then(result => {
                    console.log('Side effect completed successfully:', result);
                }).catch(error => {
                    console.error('Side effect failed:', error);
                });
            }
        })
    };
    const mergedData = useMemo(() => {
        if (!optimisticData) {
            return data;
        }
        const pendingDeltas = optimisticData.filter((delta) => delta.sync_status === 'pending');
        if (pendingDeltas.length === 0) {
            return data;
        }
        let processedData = [...(data !== null && data !== void 0 ? data : [])];
        for (const delta of pendingDeltas) {
            if (data && data.length > 0) {
                const firstItem = data[0];
                const deltaKeys = Object.keys(delta.data).sort();
                const dataKeys = Object.keys(firstItem).sort();
                if (JSON.stringify(deltaKeys) !== JSON.stringify(dataKeys)) {
                    console.warn(`Optimistic data for table '${tableName}' has a different structure than the synced data. This may cause unexpected behavior.`, {
                        optimisticKeys: deltaKeys,
                        syncedKeys: dataKeys,
                    });
                    continue; // we don't want to break the app.
                }
            }
            switch (delta.operation) {
                case 'create':
                    processedData.push(delta.data);
                    break;
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
