// Database core functionality
import Dexie, { Table } from "dexie";

// Define the base database class
export class ChorusDatabase extends Dexie {
  constructor(databaseName: string = "ChorusDatabase") {
    super(databaseName);
  }

  private userId: string = "guest";

  public setUserId(userId: string | null): void {
    this.userId = userId ?? "guest";
  }

  public getUserId(): string | null {
    return this.userId;
  }

  // Initialize schema with a mapping of table names to schema definitions
  // We are also keeping track of optimistic changes (delta) per table.
  initializeSchema(tables: Record<string, string>): void {
    const schemaWithDeltas: Record<string, string> = {};
    for (const key in tables) {
      if (Object.prototype.hasOwnProperty.call(tables, key)) {
        schemaWithDeltas[key] = tables[key];
        schemaWithDeltas[`${key}_deltas`] =
          "++id, operation, data, sync_status";
      }
    }
    this.version(1).stores(schemaWithDeltas);
  }

  // Helper to check if a table exists
  async hasTable(tableName: string): Promise<boolean> {
    return this.tables.some((table) => table.name === tableName);
  }

  // Create a new table (if schema changes)
  async createTable(tableName: string, schema: string): Promise<void> {
    // Check if the table already exists
    if (await this.hasTable(tableName)) {
      return;
    }

    // Create a new version with the updated schema
    const newVersion = this.verno + 1;
    const schemaUpdate: Record<string, string> = {};
    schemaUpdate[tableName] = schema;

    // Apply the new version
    this.version(newVersion).stores(schemaUpdate);
    await this.open();
  }
}

// Factory function to create a database instance
export function createChorusDb(
  databaseName: string = "ChorusDatabase",
): ChorusDatabase {
  return new ChorusDatabase(databaseName);
}
