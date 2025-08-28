import { TableWriteActions, OptimisticCallback } from '@pixelsprout/chorus-core';
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
 * Combined hook that provides both data access and write actions for a table
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
    data: T[] | undefined;
    isLoading: boolean;
    error: any;
    lastUpdate: Date | null;
    create: {
        (optimisticData: T, serverData: Record<string, any>, callback?: ((response: import("@pixelsprout/chorus-core").WriteActionResponse<T>) => void) | undefined): Promise<import("@pixelsprout/chorus-core").WriteActionResponse<T>>;
        (serverData: Record<string, any>, callback?: ((response: import("@pixelsprout/chorus-core").WriteActionResponse<T>) => void) | undefined): Promise<import("@pixelsprout/chorus-core").WriteActionResponse<T>>;
    };
    update: {
        (optimisticData: T, serverData: Record<string, any>, callback?: ((response: import("@pixelsprout/chorus-core").WriteActionResponse<T>) => void) | undefined): Promise<import("@pixelsprout/chorus-core").WriteActionResponse<T>>;
        (serverData: Record<string, any>, callback?: ((response: import("@pixelsprout/chorus-core").WriteActionResponse<T>) => void) | undefined): Promise<import("@pixelsprout/chorus-core").WriteActionResponse<T>>;
    };
    remove: {
        (optimisticData: {
            id: string | number;
        }, serverData: Record<string, any>, callback?: ((response: import("@pixelsprout/chorus-core").WriteActionResponse<T>) => void) | undefined): Promise<import("@pixelsprout/chorus-core").WriteActionResponse<T>>;
        (serverData: Record<string, any>, callback?: ((response: import("@pixelsprout/chorus-core").WriteActionResponse<T>) => void) | undefined): Promise<import("@pixelsprout/chorus-core").WriteActionResponse<T>>;
    };
};
/**
 * Hook that returns multiple table instances
 *
 * Usage:
 * const { messages, posts } = useTables(['messages', 'posts']);
 * await messages.create({ content: 'Hello' });
 * await posts.create({ title: 'New Post' });
 */
export declare function useTables<T extends Record<string, any> = Record<string, any>>(tableNames: string[]): Record<string, TableWriteActions>;
