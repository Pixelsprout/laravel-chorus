// Database core functionality
import Dexie, { Table } from "dexie";

// Define the base database class
export class ChorusDatabase extends Dexie {
  constructor(databaseName: string = "ChorusDatabase") {
    super(databaseName);
  }

  // Initialize schema with a mapping of table names to schema definitions.
  // We are also keeping track of an optimistic changes (delta) per table.
  initializeSchema(tables: Record<string, string>): void {
    const schemaWithDeltas: Record<string, string> = {};
    for (const key in tables) {
      if (Object.prototype.hasOwnProperty.call(tables, key)) {
        schemaWithDeltas[key] = tables[key];
        // Add a shadow table for local write operations.
        schemaWithDeltas[`${key}_shadow`] = tables[key];
        schemaWithDeltas[`${key}_deltas`] =
          "++id, operation, data, sync_status, [operation+sync_status]";
      }
    }
    this.version(1).stores(schemaWithDeltas);
  }
}

// Factory function to create a database instance
export function createChorusDb(
  databaseName: string = "ChorusDatabase",
): ChorusDatabase {
  return new ChorusDatabase(databaseName);
}
