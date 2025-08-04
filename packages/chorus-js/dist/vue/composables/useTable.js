import { computed } from 'vue';
import { writeActions } from '../../core/write-actions';
import { useHarmonics } from './useHarmonics';
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
export function useTable(tableName, options) {
    // Get data and actions from harmonics stream
    const { data, isLoading, error, lastUpdate, actions } = useHarmonics(tableName, options === null || options === void 0 ? void 0 : options.query);
    // Get write actions
    const writeActionsTable = computed(() => {
        var _a, _b, _c;
        const table = writeActions.table(tableName);
        // Set up optimistic callbacks - use harmonics actions or provided ones
        // We need to wrap the harmonics actions to match the OptimisticCallback signature
        const createCallback = ((_a = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _a === void 0 ? void 0 : _a.create) ||
            (actions.create ? (optimisticData) => actions.create(optimisticData) : undefined);
        const updateCallback = ((_b = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _b === void 0 ? void 0 : _b.update) ||
            (actions.update ? (optimisticData) => actions.update(optimisticData) : undefined);
        const removeCallback = ((_c = options === null || options === void 0 ? void 0 : options.optimisticActions) === null || _c === void 0 ? void 0 : _c.remove) ||
            (actions.delete ? (optimisticData) => actions.delete({ id: optimisticData.id }) : undefined);
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
    });
    return {
        // Data access from harmonics
        data,
        isLoading,
        error,
        lastUpdate,
        // Write actions (bound to preserve 'this' context)
        create: (...args) => writeActionsTable.value.create(...args),
        update: (...args) => writeActionsTable.value.update(...args),
        remove: (...args) => writeActionsTable.value.delete(...args),
    };
}
/**
 * Composable that returns multiple table instances
 *
 * Usage:
 * const { messages, posts } = useTables(['messages', 'posts']);
 * await messages.create({ content: 'Hello' });
 * await posts.create({ title: 'New Post' });
 */
export function useTables(tableNames) {
    return computed(() => {
        const tables = {};
        tableNames.forEach(tableName => {
            tables[tableName] = writeActions.table(tableName);
        });
        return tables;
    }).value;
}
