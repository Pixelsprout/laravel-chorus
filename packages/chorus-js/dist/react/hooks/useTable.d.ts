import { TableWriteActions, OptimisticCallback } from '../../core/write-actions';
/**
 * Options for configuring table actions
 */
export interface UseTableOptions<T = any> {
    optimisticActions?: {
        create?: OptimisticCallback<T>;
        update?: OptimisticCallback<T>;
        delete?: OptimisticCallback<T>;
    };
}
/**
 * Simple hook that returns a table instance with clean write actions API
 *
 * Usage:
 * const messages = useTable('messages', {
 *   optimisticActions: {
 *     create: messageActions.create,
 *     update: messageActions.update,
 *     delete: messageActions.delete
 *   }
 * });
 *
 * await messages.create(optimisticData, serverData, callback);
 */
export declare function useTable<T = any>(tableName: string, options?: UseTableOptions<T>): TableWriteActions<T>;
/**
 * Hook that returns multiple table instances
 *
 * Usage:
 * const { messages, posts } = useTables(['messages', 'posts']);
 * await messages.create({ content: 'Hello' });
 * await posts.create({ title: 'New Post' });
 */
export declare function useTables<T extends Record<string, any> = Record<string, any>>(tableNames: string[]): Record<string, TableWriteActions>;
