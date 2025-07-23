import { useMemo } from 'react';
import { writeActions } from '../../core/write-actions';
import { useHarmonics } from '../providers/ChorusProvider';
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
export function useTable(tableName, options) {
    // Get data from harmonics stream
    const { data, isLoading, error, lastUpdate } = useHarmonics(tableName, options === null || options === void 0 ? void 0 : options.query);
    // Get write actions
    const writeActionsTable = useMemo(() => {
        var _a, _b, _c;
        const table = writeActions.table(tableName);
        // Set up optimistic callbacks if provided
        if ((_a = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _a === void 0 ? void 0 : _a.create) {
            table.setOptimisticCallback('create', options.optimisticActions.create);
        }
        if ((_b = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _b === void 0 ? void 0 : _b.update) {
            table.setOptimisticCallback('update', options.optimisticActions.update);
        }
        if ((_c = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _c === void 0 ? void 0 : _c.delete) {
            table.setOptimisticCallback('delete', options.optimisticActions.delete);
        }
        return table;
    }, [tableName, options === null || options === void 0 ? void 0 : options.optimisticActions]);
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
export function useTables(tableNames) {
    return useMemo(() => {
        const tables = {};
        tableNames.forEach(tableName => {
            tables[tableName] = writeActions.table(tableName);
        });
        return tables;
    }, [tableNames.join(',')]);
}
