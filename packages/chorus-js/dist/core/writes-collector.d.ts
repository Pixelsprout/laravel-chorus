export interface WriteOperation {
    table: string;
    operation: 'create' | 'update' | 'delete';
    data: Record<string, any>;
    timestamp: number;
}
export interface ModelProxy {
    create(data: Record<string, any>): void;
    update(data: Record<string, any>): void;
    delete(data: Record<string, any>): void;
}
export type WritesProxy = Record<string, ModelProxy>;
export declare class ClientWritesCollector {
    private operations;
    private modelProxies;
    private collecting;
    startCollecting(): void;
    stopCollecting(): void;
    isCollecting(): boolean;
    getOperations(): WriteOperation[];
    getTableProxy(tableName: string): ModelProxy;
    addOperation(tableName: string, operation: 'create' | 'update' | 'delete', data: Record<string, any>): void;
}
export declare function createWritesProxy(collector: ClientWritesCollector): WritesProxy;
/**
 * Enhanced ActionContext-like interface for client-side operations
 */
export interface ActionContextLike {
    create(table: string, data: Record<string, any>): void;
    update(table: string, data: Record<string, any>): void;
    remove(table: string, data: Record<string, any>): void;
}
/**
 * Create an ActionContext-like object that works with the callback API
 * This provides the same simplified API as the server-side ActionContext
 * Supports both property access and destructured access patterns
 */
export declare function createActionContext(collector: ClientWritesCollector): ActionContextLike;
