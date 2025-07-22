// Database core functionality
import Dexie from "dexie";

// Define the base database class
export class ChorusDatabase extends Dexie {
  private schemaInitialized: boolean = false;
  private currentSchemaHash: string = '';

  constructor(databaseName: string = "ChorusDatabase") {
    super(databaseName);
  }

  // Generate a hash of the schema to detect changes
  private generateSchemaHash(tables: Record<string, string>): string {
    const sortedKeys = Object.keys(tables).sort();
    const schemaString = sortedKeys.map(key => `${key}:${tables[key]}`).join('|');
    // Simple hash function
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
  async initializeSchema(tables: Record<string, string>, forceVersion?: number): Promise<void> {
    const newSchemaHash = this.generateSchemaHash(tables);
    
    // Check if schema has changed or if we're forcing a version
    if (this.schemaInitialized && this.currentSchemaHash === newSchemaHash && !forceVersion) {
      console.log('[Chorus] Schema unchanged, skipping initialization...');
      return;
    }

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

    console.log('[Chorus] Initializing database schema with tables:', Object.keys(schemaWithDeltas));

    if (this.isOpen()) {
      this.close();
    }

    // Calculate version based on schema hash or use forced version
    const version = forceVersion || parseInt(newSchemaHash.slice(-8), 16) % 1000000 + 1;
    
    console.log(`[Chorus] Using database version: ${version} (schema hash: ${newSchemaHash})`);
    
    // Use the calculated version to trigger proper IndexedDB upgrades
    this.version(version).stores(schemaWithDeltas);
    
    // Open the database to ensure schema is applied
    try {
      await this.open();
      console.log(`[Chorus] Database opened successfully with schema version ${version}`);
      this.schemaInitialized = true;
      this.currentSchemaHash = newSchemaHash;
    } catch (error) {
      console.error('[Chorus] Failed to open database:', error);
      throw error;
    }
  }

  // Method to reset schema initialization flag (used when rebuilding database)
  resetSchemaFlag(): void {
    this.schemaInitialized = false;
  }
}

// Factory function to create a database instance
export function createChorusDb(
  databaseName: string = "ChorusDatabase",
): ChorusDatabase {
  return new ChorusDatabase(databaseName);
}
