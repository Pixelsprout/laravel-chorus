import Dexie from "dexie";
export declare class ChorusDatabase extends Dexie {
    constructor(databaseName?: string);
    private userId;
    setUserId(userId: string | null): void;
    getUserId(): string | null;
    initializeSchema(tables: Record<string, string>): void;
    hasTable(tableName: string): Promise<boolean>;
    createTable(tableName: string, schema: string): Promise<void>;
}
export declare function createChorusDb(databaseName?: string): ChorusDatabase;
