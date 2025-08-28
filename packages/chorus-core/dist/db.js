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
        this.schemaInitialized = false;
        this.currentSchemaHash = '';
        this.userId = '';
        // Extract userId from database name if it follows the pattern chorus_db_{userId}
        const match = databaseName.match(/chorus_db_(.+)/);
        if (match) {
            this.userId = match[1];
        }
        // Load the current schema hash from localStorage if available
        if (this.userId) {
            const storedHash = localStorage.getItem(`chorus_schema_hash_${this.userId}`);
            if (storedHash) {
                this.currentSchemaHash = storedHash;
                this.schemaInitialized = true;
            }
        }
    }
    // Generate a hash of the schema to detect changes
    generateSchemaHash(tables) {
        const sortedKeys = Object.keys(tables).sort();
        const schemaString = sortedKeys.map(key => `${key}:${tables[key]}`).join('|');
        let hash = 0;
        for (let i = 0; i < schemaString.length; i++) {
            const char = schemaString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString();
    }
    // Initialize schema with a mapping of table names to schema definitions.
    // We are also keeping track of an optimistic changes (delta) per table.
    initializeSchema(tables, forceVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            const newSchemaHash = this.generateSchemaHash(tables);
            // Use forceVersion if provided, otherwise use hash-based versioning
            let calculatedVersion;
            if (forceVersion) {
                calculatedVersion = forceVersion;
                console.log(`[Chorus] Using forced version: ${calculatedVersion}`);
            }
            else {
                // Generate a consistent version number from the schema hash
                const hashValue = parseInt(newSchemaHash.substring(0, 8), 16);
                calculatedVersion = (hashValue % 999999) + 1; // Ensure positive and reasonable
                const hashMatches = this.currentSchemaHash === newSchemaHash;
                if (!hashMatches && this.schemaInitialized) {
                    console.log(`[Chorus] Schema changed - using hash-based version: ${calculatedVersion}`);
                    console.log(`[Chorus] Old schema hash: ${this.currentSchemaHash}`);
                    console.log(`[Chorus] New schema hash: ${newSchemaHash}`);
                }
                else {
                    console.log(`[Chorus] Schema unchanged - using version: ${calculatedVersion}`);
                }
            }
            const hashMatches = this.currentSchemaHash === newSchemaHash;
            const schemaUnchanged = this.schemaInitialized && hashMatches;
            const schemaWithDeltas = {};
            for (const key in tables) {
                if (Object.prototype.hasOwnProperty.call(tables, key)) {
                    schemaWithDeltas[key] = tables[key];
                    schemaWithDeltas[`${key}_shadow`] = tables[key];
                    schemaWithDeltas[`${key}_deltas`] =
                        "++id, operation, data, sync_status, action_name, action_data, timestamp, [operation+sync_status], [action_name+sync_status]";
                }
            }
            if (schemaUnchanged) {
                // Configure the database schema even if unchanged
                this.version(calculatedVersion).stores(schemaWithDeltas);
                if (!this.isOpen()) {
                    try {
                        yield this.open();
                    }
                    catch (error) {
                        console.error('[Chorus] Failed to reopen database:', error);
                        throw error;
                    }
                }
                // Database version is now managed by chorus.ts
                return;
            }
            if (this.isOpen()) {
                this.close();
            }
            // Use the calculated version to trigger proper IndexedDB upgrades
            this.version(calculatedVersion).stores(schemaWithDeltas);
            // Open the database to ensure schema is applied
            try {
                yield this.open();
                this.schemaInitialized = true;
                this.currentSchemaHash = newSchemaHash;
                // Store the calculated version and schema hash in localStorage for future comparison
                // Always update the version to ensure it's stored properly
                if (this.userId) {
                    // Database version is now managed by chorus.ts
                    localStorage.setItem(`chorus_schema_hash_${this.userId}`, newSchemaHash);
                }
            }
            catch (error) {
                console.error('[Chorus] Failed to open database:', error);
                throw error;
            }
        });
    }
    // Method to reset schema initialization flag (used when rebuilding database)
    resetSchemaFlag() {
        this.schemaInitialized = false;
    }
}
// Factory function to create a database instance
export function createChorusDb(databaseName = "ChorusDatabase") {
    return new ChorusDatabase(databaseName);
}
