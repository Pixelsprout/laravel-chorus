import Dexie from "dexie";
export declare class ChorusDatabase extends Dexie {
    private schemaInitialized;
    private currentSchemaHash;
    constructor(databaseName?: string);
    private generateSchemaHash;
    initializeSchema(tables: Record<string, string>, forceVersion?: number): Promise<void>;
    resetSchemaFlag(): void;
}
export declare function createChorusDb(databaseName?: string): ChorusDatabase;
