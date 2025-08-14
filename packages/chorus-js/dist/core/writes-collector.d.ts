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
