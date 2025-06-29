// Database core functionality
import Dexie, { Table } from 'dexie';

// Define the base database class
export class ChorusDatabase extends Dexie {
  constructor(databaseName: string = 'ChorusDatabase') {
    super(databaseName);
  }

  // Initialize schema with a mapping of table names to schema definitions
  initializeSchema(tables: Record<string, string>): void {
    this.version(1).stores(tables);
  }

  // Get a typed table reference
  table<T>(tableName: string): Table<T> {
    return super.table<T>(tableName);
  }

  // Helper to check if a table exists
  async hasTable(tableName: string): Promise<boolean> {
    return this.tables.some(table => table.name === tableName);
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
export function createChorusDb(databaseName: string = 'ChorusDatabase'): ChorusDatabase {
  return new ChorusDatabase(databaseName);
}
