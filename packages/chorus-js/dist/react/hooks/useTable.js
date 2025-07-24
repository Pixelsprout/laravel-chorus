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
    // Get data and actions from harmonics stream
    const { data, isLoading, error, lastUpdate, actions } = useHarmonics(tableName, options === null || options === void 0 ? void 0 : options.query);
    // Get write actions
    const writeActionsTable = useMemo(() => {
        var _a, _b, _c;
        const table = writeActions.table(tableName);
        // Set up optimistic callbacks - use harmonics actions or provided ones
        // We need to wrap the harmonics actions to match the OptimisticCallback signature
        const createCallback = ((_a = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _a === void 0 ? void 0 : _a.create) ||
            (actions.create ? (optimisticData) => actions.create(optimisticData) : undefined);
        const updateCallback = ((_b = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _b === void 0 ? void 0 : _b.update) ||
            (actions.update ? (optimisticData) => actions.update(optimisticData) : undefined);
        const deleteCallback = ((_c = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _c === void 0 ? void 0 : _c.delete) ||
            (actions.delete ? (optimisticData) => actions.delete({ id: optimisticData.id }) : undefined);
        if (createCallback) {
            table.setOptimisticCallback('create', createCallback);
        }
        if (updateCallback) {
            table.setOptimisticCallback('update', updateCallback);
        }
        if (deleteCallback) {
            table.setOptimisticCallback('delete', deleteCallback);
        }
        return table;
    }, [tableName, actions, options === null || options === void 0 ? void 0 : options.optimisticActions]);
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
