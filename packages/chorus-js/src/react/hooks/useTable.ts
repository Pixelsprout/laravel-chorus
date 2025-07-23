import { useMemo } from 'react';
import { writeActions, TableWriteActions, OptimisticCallback } from '../../core/write-actions';
import { useHarmonics } from '../providers/ChorusProvider';

/**
 * Options for configuring table actions
 */
export interface UseTableOptions<T = any> {
  optimisticActions?: {
    create?: OptimisticCallback<T>;
    update?: OptimisticCallback<T>;
    delete?: OptimisticCallback<T>;
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
 *   delete: remove 
 * } = useTable<Message>('messages');
 */
export function useTable<T extends { id: string | number } = any>(
  tableName: string, 
  options?: UseTableOptions<T>
) {
  // Get data from harmonics stream
  const { data, isLoading, error, lastUpdate } = useHarmonics<T>(tableName, options?.query);
  
  // Get write actions
  const writeActionsTable = useMemo(() => {
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

  return {
    // Data access from harmonics
    data,
    isLoading,
    error,
    lastUpdate,
    // Write actions (bound to preserve 'this' context)
    create: writeActionsTable.create.bind(writeActionsTable),
    update: writeActionsTable.update.bind(writeActionsTable),
    delete: writeActionsTable.delete.bind(writeActionsTable),
  };
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