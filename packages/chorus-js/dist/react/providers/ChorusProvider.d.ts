import { TableState } from "../../core/chorus";
import React from "react";
interface ChorusContextState {
    isInitialized: boolean;
    tables: Record<string, TableState>;
}
interface ChorusProviderProps {
    children: React.ReactNode;
    userId?: number;
    schema?: Record<string, any>;
}
export declare function ChorusProvider({ children, userId, schema, }: ChorusProviderProps): React.JSX.Element;
export declare function useChorus(): ChorusContextState;
export declare function useHarmonics<T = any>(tableName: string): {
    data: T[] | undefined;
    isLoading: boolean;
    error: string | null;
    lastUpdate: Date | null;
};
export {};
