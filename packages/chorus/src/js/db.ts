// chorus/js/db.ts
import Dexie, { EntityTable } from 'dexie';

// Define the database class and export it as an abstract class
export class ChorusDatabase extends Dexie {
  constructor(databaseName: string = 'ChorusDatabase') {
    super(databaseName);
  }

  // Method to initialize the database with schema
  initializeSchema(tables: Record<string, string>): void {
    this.version(1).stores(tables);
  }

  // Method to register a table in the database
  registerTable<T>(tableName: string, schema: string): EntityTable<T> {
    // This is a workaround since we can't dynamically add tables to the Dexie instance
    // We use indexing to access the table
    return this.table(tableName) as EntityTable<T>;
  }
}

// Create and export a default instance
export const createChorusDb = (databaseName: string = 'ChorusDatabase'): ChorusDatabase => {
  return new ChorusDatabase(databaseName);
};
