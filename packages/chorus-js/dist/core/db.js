var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Database core functionality
import Dexie from "dexie";
// Define the base database class
export class ChorusDatabase extends Dexie {
    constructor(databaseName = "ChorusDatabase") {
        super(databaseName);
        this.userId = "guest";
    }
    setUserId(userId) {
        this.userId = userId !== null && userId !== void 0 ? userId : "guest";
    }
    getUserId() {
        return this.userId;
    }
    // Initialize schema with a mapping of table names to schema definitions
    // We are also keeping track of an optimistic changes (delta) per table.
    initializeSchema(tables) {
        const schemaWithDeltas = {};
        for (const key in tables) {
            if (Object.prototype.hasOwnProperty.call(tables, key)) {
                schemaWithDeltas[key] = tables[key];
                // Add a shadow table for local writes.
                schemaWithDeltas[`${key}_shadow`] = tables[key];
                schemaWithDeltas[`${key}_deltas`] =
                    "++id, operation, data, sync_status, [operation+sync_status]";
            }
        }
        this.version(1).stores(schemaWithDeltas);
    }
    // Helper to check if a table exists
    hasTable(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.tables.some((table) => table.name === tableName);
        });
    }
    // Create a new table (if schema changes)
    createTable(tableName, schema) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if the table already exists
            if (yield this.hasTable(tableName)) {
                return;
            }
            // Create a new version with the updated schema
            const newVersion = this.verno + 1;
            const schemaUpdate = {};
            schemaUpdate[tableName] = schema;
            // Apply the new version
            this.version(newVersion).stores(schemaUpdate);
            yield this.open();
        });
    }
}
// Factory function to create a database instance
export function createChorusDb(databaseName = "ChorusDatabase") {
    return new ChorusDatabase(databaseName);
}
