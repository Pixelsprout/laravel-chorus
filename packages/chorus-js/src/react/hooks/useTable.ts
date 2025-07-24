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
export function useTable<T extends { id: string | number } = any>(
  tableName: string, 
  options?: UseTableOptions<T>
) {
  // Get data and actions from harmonics stream
  const { data, isLoading, error, lastUpdate, actions } = useHarmonics<T, T>(tableName, options?.query);
  
  // Get write actions
  const writeActionsTable = useMemo(() => {
    const table = writeActions.table<T>(tableName);
    
    // Set up optimistic callbacks - use harmonics actions or provided ones
    // We need to wrap the harmonics actions to match the OptimisticCallback signature
    const createCallback = options?.optimisticActions?.create || 
      (actions.create ? (optimisticData: T) => actions.create!(optimisticData as any) : undefined);
    const updateCallback = options?.optimisticActions?.update || 
      (actions.update ? (optimisticData: T) => actions.update!(optimisticData as any) : undefined);
    const removeCallback = options?.optimisticActions?.remove || 
      (actions.delete ? (optimisticData: T) => actions.delete!({ id: optimisticData.id } as any) : undefined);
    
    if (createCallback) {
      table.setOptimisticCallback('create', createCallback);
    }
    if (updateCallback) {
      table.setOptimisticCallback('update', updateCallback);
    }
    if (removeCallback) {
      table.setOptimisticCallback('delete', removeCallback);
    }
    
    return table;
  }, [tableName, actions, options?.optimisticActions]);

  return {
    // Data access from harmonics
    data,
    isLoading,
    error,
    lastUpdate,
    // Write actions (bound to preserve 'this' context)
    create: writeActionsTable.create.bind(writeActionsTable),
    update: writeActionsTable.update.bind(writeActionsTable),
    remove: writeActionsTable.delete.bind(writeActionsTable),
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