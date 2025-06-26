import { createChorusDb } from './db';
import { chorusSchema } from '@/_generated/schema';

// Define the HarmonicEvent interface
export interface HarmonicEvent {
  id: string;
  table_name: string;
  data: string;
  operation: string;
  record_id: string | number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

// Define the table state structure
export interface TableState {
  lastUpdate: Date | null;
  isLoading: boolean;
  error: string | null;
}

// Storage key
const LATEST_HARMONIC_ID_KEY = 'chorus_latest_harmonic_id';
const FAILED_EVENTS_KEY = 'chorus_failed_events';

// Custom error type
export class SyncError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SyncError';
  }
}

/**
 * ChorusCore class - handles the core data sync functionality
 */
export class ChorusCore {
  private db: ReturnType<typeof createChorusDb>;
  private tableNames: string[];
  private isInitialized: boolean = false;
  private tableStates: Record<string, TableState> = {};
  
  constructor() {
    // Create a new database instance with the generated schema
    this.db = createChorusDb();
    this.tableNames = Object.keys(chorusSchema || {});
    
    // Initialize table states
    this.tableNames.forEach(tableName => {
      this.tableStates[tableName] = {
        lastUpdate: null,
        isLoading: false,
        error: null
      };
    });
  }
  
  /**
   * Simple logging utility
   */
  private log(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      if (data === undefined) {
        console.log(`[Chorus] ${message}`);
      } else {
        console.log(`[Chorus] ${message}`, data);
      }
    }
  }
  
  /**
   * Get the latest harmonic ID from localStorage
   */
  private getLatestHarmonicId(): string | null {
    return localStorage.getItem(LATEST_HARMONIC_ID_KEY);
  }
  
  /**
   * Save the latest harmonic ID to localStorage
   */
  private saveLatestHarmonicId(id: string): void {
    localStorage.setItem(LATEST_HARMONIC_ID_KEY, id);
  }
  
  /**
   * Initialize the database schema
   */
  public initializeDatabase(): void {
    this.log('Initializing database with schema', chorusSchema);
    this.db.initializeSchema(chorusSchema);
  }
  
  /**
   * Process a batch of harmonics
   */
  public async processHarmonics(tableName: string, harmonics: HarmonicEvent[]): Promise<boolean> {
    if (!harmonics.length) return true;
  
    // Group by operation type
    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: (string | number)[] = [];
    const errors: Error[] = [];
    
    for (const harmonic of harmonics) {
      try {
        const data = JSON.parse(harmonic.data);
        
        switch (harmonic.operation) {
          case 'create':
            creates.push(data);
            break;
          case 'update':
            updates.push(data);
            break;
          case 'delete':
            deletes.push(harmonic.record_id);
            break;
          default:
            this.log(`Unknown operation type: ${harmonic.operation}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push(new SyncError(`Error processing harmonic ${harmonic.id}`, error));
      }
    }
    
    // Process batches
    try {
      const operations = [];
      
      if (creates.length) {
        this.log(`Batch adding ${creates.length} records to ${tableName}`);
        operations.push(this.db.table(tableName).bulkAdd(creates));
      }
      
      if (updates.length) {
        this.log(`Batch updating ${updates.length} records in ${tableName}`);
        operations.push(this.db.table(tableName).bulkPut(updates));
      }
      
      if (deletes.length) {
        this.log(`Batch deleting ${deletes.length} records from ${tableName}`);
        operations.push(this.db.table(tableName).bulkDelete(deletes));
      }
      
      if (operations.length) {
        await Promise.all(operations);
      }
      
      // Save latest harmonic ID
      this.saveLatestHarmonicId(harmonics[harmonics.length - 1].id);
      
      if (errors.length) {
        errors.forEach(error => console.error(error));
      }
      
      return true;
    } catch (err) {
      console.error(`Error during batch processing for ${tableName}:`, err);
      throw new SyncError(`Failed to process harmonics batch for ${tableName}`, 
        err instanceof Error ? err : new Error(String(err)));
    }
  }
  
  /**
   * Process a single harmonic event
   */
  public async processHarmonic(event: HarmonicEvent): Promise<boolean> {
    const tableName = event.table_name;
    try {
      const data = JSON.parse(event.data);
  
      switch (event.operation) {
        case 'create':
          this.log(`Adding new ${tableName} record`, data);
          await this.db.table(tableName).add(data);
          break;
        case 'update':
          this.log(`Updating ${tableName} record`, data);
          await this.db.table(tableName).put(data);
          break;
        case 'delete':
          this.log(`Deleting ${tableName} record with ID`, event.record_id);
          await this.db.table(tableName).delete(event.record_id);
          break;
        default:
          this.log(`Unknown operation type: ${event.operation}`);
      }
      
      // Save the latest harmonic ID
      this.saveLatestHarmonicId(event.id);
      
      // Update the table state
      this.updateTableState(tableName, {
        lastUpdate: new Date(),
        isLoading: false,
        error: null
      });
      
      return true;
    } catch (err) {
      const enhancedError = new SyncError(
        `Error processing ${tableName} harmonic ID ${event.id}`, 
        err instanceof Error ? err : new Error(String(err))
      );
      console.error(enhancedError);
      
      // Store failed events for potential retry
      const failedEvents = JSON.parse(localStorage.getItem(FAILED_EVENTS_KEY) || '[]');
      failedEvents.push(event);
      localStorage.setItem(FAILED_EVENTS_KEY, JSON.stringify(failedEvents.slice(-100))); // Keep last 100
      
      // Update the table state
      this.updateTableState(tableName, {
        ...this.getTableState(tableName),
        error: `Error processing ${tableName} update: ${enhancedError.message}`
      });
      
      return false;
    }
  }
  
  /**
   * Initialize all tables with data
   */
  public async initializeTables(): Promise<void> {
    // Skip if no tables are defined
    if (this.tableNames.length === 0) {
      this.log('No tables defined in schema. Run php artisan chorus:generate to generate schema.');
      this.isInitialized = true;
      return;
    }
    
    // Set all tables to loading state
    this.tableNames.forEach(tableName => {
      this.updateTableState(tableName, {
        lastUpdate: null,
        isLoading: true,
        error: null
      });
    });
    
    // Get the latest harmonic ID once for all tables
    const latestHarmonicId = this.getLatestHarmonicId();
    
    for (const tableName of this.tableNames) {
      try {
        // Check if we have data already
        const count = await this.db.table(tableName).count();
        const isInitialSync = count === 0;
        
        // Build the API URL
        let url = `/api/sync/${tableName}`;
        if (isInitialSync) {
          url += '?initial=true';
        } else if (latestHarmonicId) {
          url += `?after=${latestHarmonicId}`;
        }

        this.log(`Syncing ${tableName}: ${isInitialSync ? 'Initial sync' : 'Incremental sync'}`);
        
        // Fetch data
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // Save latest harmonic ID - only update if it's newer than our current one
        if (responseData.latest_harmonic_id) {
          const currentId = this.getLatestHarmonicId();
          // Save if we don't have an ID yet or if the new one is greater
          if (!currentId || responseData.latest_harmonic_id > currentId) {
            this.saveLatestHarmonicId(responseData.latest_harmonic_id);
          }
        }
        
        // Process the data
        if (isInitialSync && responseData.records) {
          this.log(`Initial sync: received ${responseData.records.length} records for ${tableName}`);
          await this.db.table(tableName).bulkPut(responseData.records);
        } else if (responseData.harmonics && responseData.harmonics.length > 0) {
          this.log(`Incremental sync: received ${responseData.harmonics.length} harmonics for ${tableName}`);
          await this.processHarmonics(tableName, responseData.harmonics);
        } else {
          this.log(`No changes to sync for ${tableName}`);
        }
        
        // Update state for this table
        this.updateTableState(tableName, {
          lastUpdate: new Date(),
          isLoading: false,
          error: null
        });
      } catch (err) {
        console.error(`Failed to sync data for ${tableName}:`, err);
        
        // Update state with error
        this.updateTableState(tableName, {
          ...this.getTableState(tableName),
          isLoading: false,
          error: `Failed to sync ${tableName} data: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    }
    
    // Mark as initialized
    this.isInitialized = true;
    this.log('Chorus initialization complete');
  }
  
  /**
   * Update the state for a specific table
   */
  private updateTableState(tableName: string, newState: Partial<TableState>): void {
    this.tableStates[tableName] = {
      ...this.tableStates[tableName],
      ...newState
    };
  }
  
  /**
   * Get the current state for a specific table
   */
  public getTableState(tableName: string): TableState {
    return this.tableStates[tableName] || {
      lastUpdate: null,
      isLoading: false,
      error: null
    };
  }
  
  /**
   * Get all table states
   */
  public getAllTableStates(): Record<string, TableState> {
    return this.tableStates;
  }
  
  /**
   * Check if Chorus is fully initialized
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get the database instance
   */
  public getDb() {
    return this.db;
  }
  
  /**
   * Get data from a specific table
   */
  public async getTableData<T = any>(tableName: string): Promise<T[]> {
    return this.db.table<T>(tableName).toArray();
  }
}