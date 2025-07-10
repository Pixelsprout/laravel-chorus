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
import { createContext, useContext, useEffect, useState } from "react";
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
    // Get data from IndexedDB with reactive updates
    const data = useLiveQuery(() => {
        var _a, _b;
        return (_b = (_a = chorusCore.getDb()) === null || _a === void 0 ? void 0 : _a.table(tableName).toArray()) !== null && _b !== void 0 ? _b : [];
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
