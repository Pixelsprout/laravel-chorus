import { ChorusCore, TableState } from "@pixelsprout/chorus-core";
import type { ReactChorusProviderProps } from "../provider-types";
import React from "react";
import { Collection, Table } from "dexie";
interface ChorusContextState {
    isInitialized: boolean;
    tables: Record<string, TableState>;
    schema: Record<string, any>;
    chorusCore: ChorusCore | null;
}
export declare function ChorusProvider({ children, userId, channelPrefix, onRejectedHarmonic, onSchemaVersionChange, onDatabaseVersionChange, debugMode, }: ReactChorusProviderProps): React.JSX.Element;
export declare function useChorus(): ChorusContextState;
type Action<TInput, T> = (data: TInput, sideEffect?: (data: TInput) => Promise<void>) => void;
interface HarmonicActions<T, TInput> {
    create?: Action<TInput, T>;
    update?: Action<Partial<TInput> & {
        id: string;
    }, T>;
    delete?: Action<{
        id: string;
    }, T>;
}
export interface HarmonicResponse<T, TInput = never> {
    data: T[] | undefined;
    isLoading: boolean;
    error: any;
    lastUpdate: Date | null;
    actions: HarmonicActions<T, TInput>;
}
export declare function useHarmonics<T extends {
    id: string | number;
}, TInput = never>(tableName: string, query?: (table: Table<T>) => Table<T> | Collection<T, any>): HarmonicResponse<T, TInput>;
export declare function useChorusStatus(tableName: string): TableState;
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
export declare function useTableQuery<T extends {
    id: string | number;
}>(queryFn: (table: Table<T>) => Table<T> | Collection<T, any>, deps: React.DependencyList): (table: Table<T>) => Table<T> | Collection<T, any>;
export {};
