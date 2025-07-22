import { useMemo } from 'react';
import { writeActions, TableWriteActions, OptimisticCallback } from '../../core/write-actions';

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
export function useTable<T = any>(
  tableName: string, 
  options?: UseTableOptions<T>
): TableWriteActions<T> {
  return useMemo(() => {
    const table = writeActions.table<T>(tableName);
    
    // Set up optimistic callbacks if provided
    if (options?.optimisticActions?.create) {
      table.setOptimisticCallback('create', options.optimisticActions.create);
    }
    if (options?.optimisticActions?.update) {
      table.setOptimisticCallback('update', options.optimisticActions.update);
    }
    if (options?.optimisticActions?.delete) {
      table.setOptimisticCallback('delete', options.optimisticActions.delete);
    }
    
    return table;
  }, [tableName, options?.optimisticActions]);
}

/**
 * Hook that returns multiple table instances
 * 
 * Usage:
 * const { messages, posts } = useTables(['messages', 'posts']);
 * await messages.create({ content: 'Hello' });
 * await posts.create({ title: 'New Post' });
 */
export function useTables<T extends Record<string, any> = Record<string, any>>(
  tableNames: string[]
): Record<string, TableWriteActions> {
  return useMemo(() => {
    const tables: Record<string, TableWriteActions> = {};
    tableNames.forEach(tableName => {
      tables[tableName] = writeActions.table(tableName);
    });
    return tables;
  }, [tableNames.join(',')]);
}