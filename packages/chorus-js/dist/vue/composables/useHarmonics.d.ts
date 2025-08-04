import { type Ref } from 'vue';
import type { Collection, Table } from 'dexie';
interface HarmonicActions<T, TInput> {
    create?: (data: TInput, sideEffect?: (data: TInput) => Promise<void>) => Promise<void>;
    update?: (data: Partial<TInput> & {
        id: string;
    }, sideEffect?: (data: Partial<TInput> & {
        id: string;
    }) => Promise<void>) => Promise<void>;
    delete?: (data: {
        id: string;
    }, sideEffect?: (data: {
        id: string;
    }) => Promise<void>) => Promise<void>;
}
export interface HarmonicResponse<T, TInput = never> {
    data: Ref<T[] | undefined>;
    isLoading: Ref<boolean>;
    error: Ref<any>;
    lastUpdate: Ref<Date | null>;
    actions: HarmonicActions<T, TInput>;
}
export declare function useHarmonics<T extends {
    id: string | number;
}, TInput = never>(tableName: string, query?: (table: Table<T>) => Table<T> | Collection<T, any>): HarmonicResponse<T, TInput>;
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
export declare function useHarmonicsQuery<T extends {
    id: string | number;
}>(queryFn: (table: Table<T>) => Table<T> | Collection<T, any>, deps: Ref<any>[]): Ref<(table: Table<T>) => Table<T> | Collection<T, any>>;
export {};
