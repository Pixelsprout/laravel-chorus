// Database core functionality
import Dexie from "dexie";

// Define the base database class
export class ChorusDatabase extends Dexie {
  private schemaInitialized: boolean = false;
  private currentSchemaHash: string = '';
  private userId: string = '';

  constructor(databaseName: string = "ChorusDatabase") {
    super(databaseName);
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
  private generateSchemaHash(tables: Record<string, string>): string {
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
  async initializeSchema(tables: Record<string, string>, forceVersion?: number): Promise<void> {
    const newSchemaHash = this.generateSchemaHash(tables);

    const storedDbVersion = localStorage.getItem(`chorus_db_version_${this.userId}`);
    const calculatedVersion = forceVersion || parseInt(newSchemaHash.slice(-8), 16) % 1000000 + 1;
    
    const hashMatches = this.currentSchemaHash === newSchemaHash;
    const versionChanged = storedDbVersion && calculatedVersion.toString() !== storedDbVersion;
    const schemaUnchanged = this.schemaInitialized && hashMatches && !versionChanged;

    const schemaWithDeltas: Record<string, string> = {};
    for (const key in tables) {
      if (Object.prototype.hasOwnProperty.call(tables, key)) {
        schemaWithDeltas[key] = tables[key];
        schemaWithDeltas[`${key}_shadow`] = tables[key];
        schemaWithDeltas[`${key}_deltas`] =
            "++id, operation, data, sync_status, [operation+sync_status]";
      }
    }

    if (schemaUnchanged) {

      // Configure the database schema even if unchanged
      this.version(calculatedVersion).stores(schemaWithDeltas);
      
      if (!this.isOpen()) {
        try {
          await this.open();
        } catch (error) {
          console.error('[Chorus] Failed to reopen database:', error);
          throw error;
        }
      }
      return;
    }

    if (this.isOpen()) {
      this.close();
    }

    // Use the calculated version to trigger proper IndexedDB upgrades
    this.version(calculatedVersion).stores(schemaWithDeltas);
    
    // Open the database to ensure schema is applied
    try {
      await this.open();
      this.schemaInitialized = true;
      this.currentSchemaHash = newSchemaHash;
      
      // Store the calculated version and schema hash in localStorage for future comparison
      // Use a separate key to avoid conflicts with chorus.ts
      if (this.userId) {
        localStorage.setItem(`chorus_db_version_${this.userId}`, calculatedVersion.toString());
        localStorage.setItem(`chorus_schema_hash_${this.userId}`, newSchemaHash);
      }
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
