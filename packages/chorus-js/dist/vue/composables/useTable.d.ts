import { type TableWriteActions, type OptimisticCallback } from '../../core/write-actions';
/**
 * Options for configuring table actions
 */
export interface UseTableOptions<T = any> {
    optimisticActions?: {
        create?: OptimisticCallback<T>;
        update?: OptimisticCallback<T>;
        remove?: OptimisticCallback<T>;
    };
    query?: (table: any) => any;
}
/**
 * Combined composable that provides both data access and write actions for a table
 *
 * Usage:
 * const {
 *   data,
 *   isLoading,
 *   error,
 *   create,
 *   update,
 *   remove
 * } = useTable<Message>('messages');
 */
export declare function useTable<T extends {
    id: string | number;
} = any>(tableName: string, options?: UseTableOptions<T>): {
    data: import("vue").Ref<T[] | undefined, T[] | undefined>;
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<any, any>;
    lastUpdate: import("vue").Ref<Date | null, Date | null>;
    create: (serverData: Record<string, any>, callback?: ((response: import("../../core/write-actions").WriteActionResponse<any>) => void) | undefined) => Promise<import("../../core/write-actions").WriteActionResponse<T>>;
    update: (serverData: Record<string, any>, callback?: ((response: import("../../core/write-actions").WriteActionResponse<any>) => void) | undefined) => Promise<import("../../core/write-actions").WriteActionResponse<T>>;
    remove: (serverData: Record<string, any>, callback?: ((response: import("../../core/write-actions").WriteActionResponse<any>) => void) | undefined) => Promise<import("../../core/write-actions").WriteActionResponse<T>>;
};
/**
 * Composable that returns multiple table instances
 *
 * Usage:
 * const { messages, posts } = useTables(['messages', 'posts']);
 * await messages.create({ content: 'Hello' });
 * await posts.create({ title: 'New Post' });
 */
export declare function useTables<T extends Record<string, any> = Record<string, any>>(tableNames: string[]): Record<string, TableWriteActions>;
