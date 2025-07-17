import { HarmonicEvent, TableState } from "../../core/chorus";
import React from "react";
import { Collection, Table } from "dexie";
interface ChorusContextState {
    isInitialized: boolean;
    tables: Record<string, TableState>;
}
interface ChorusProviderProps {
    children: React.ReactNode;
    userId?: number;
    channelPrefix?: string;
    schema?: Record<string, any>;
    onRejectedHarmonic?: (harmonic: HarmonicEvent) => void;
}
export declare function ChorusProvider({ children, userId, channelPrefix, schema, onRejectedHarmonic, }: ChorusProviderProps): React.JSX.Element;
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
export {};
