import Dexie from "dexie";
export declare class ChorusDatabase extends Dexie {
    constructor(databaseName?: string);
    initializeSchema(tables: Record<string, string>): void;
}
export declare function createChorusDb(databaseName?: string): ChorusDatabase;
