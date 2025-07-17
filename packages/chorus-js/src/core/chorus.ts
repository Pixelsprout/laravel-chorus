import { createChorusDb } from "./db";

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
  rejected?: boolean;
  rejected_reason?: string;
}

// Define the table state structure
export interface TableState {
  lastUpdate: Date | null;
  isLoading: boolean;
  error: string | null;
}

// Storage key
const getLatestHarmonicIdKey = (userId?: string) =>
  `chorus_latest_harmonic_id_${userId ?? "guest"}`;
const FAILED_EVENTS_KEY = "chorus_failed_events";

// Custom error type
export class SyncError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

/**
 * ChorusCore class - handles the core data sync functionality
 */
export class ChorusCore {
  private db: ReturnType<typeof createChorusDb> | null = null;
  private tableNames: string[];
  private isInitialized: boolean = false;
  private tableStates: Record<string, TableState> = {};
  private userId: string | number | null = null;
  private onRejectedHarmonic?: (harmonic: HarmonicEvent) => void;
  private processedRejectedHarmonics = new Set<string>();

  constructor() {
    this.tableNames = [];
  }

  /**
   * Reset the ChorusCore state
   */
  public reset(): void {
    if (this.db && this.db.isOpen()) {
      this.db.close();
    }
    this.db = null;
    this.tableNames = [];
    this.isInitialized = false;
    this.tableStates = {};
    this.userId = null;
    this.log("ChorusCore has been reset.");
  }

  /**
   * Set up the ChorusCore with a userId and schema
   */
  public setup(userId: string | number, schema: Record<string, any>, onRejectedHarmonic?: (harmonic: HarmonicEvent) => void): void {
    this.userId = userId;
    this.onRejectedHarmonic = onRejectedHarmonic;
    const dbName = `chorus_db_${userId || "guest"}`;
    this.db = createChorusDb(dbName);
    this.tableNames = Object.keys(schema || {});

    // Initialize table states
    this.tableNames.forEach((tableName) => {
      this.tableStates[tableName] = {
        lastUpdate: null,
        isLoading: false,
        error: null,
      };
    });

    this.log("Setting up ChorusCore with userId", userId);
    this.db.initializeSchema(schema);
    this.isInitialized = true;
  }

  /**
   * Simple logging utility
   */
  private log(message: string, data?: any): void {
    if (process.env.NODE_ENV !== "production") {
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
    return localStorage.getItem(
      getLatestHarmonicIdKey(this.userId?.toString()),
    );
  }

  /**
   * Save the latest harmonic ID to localStorage
   */
  private saveLatestHarmonicId(id: string): void {
    localStorage.setItem(getLatestHarmonicIdKey(this.userId?.toString()), id);
  }

  /**
   * Process a batch of harmonics
   */
  public async processHarmonics(
    tableName: string,
    harmonics: HarmonicEvent[],
  ): Promise<boolean> {
    if (!harmonics.length) return true;

    // Group by operation type
    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: (string | number)[] = [];
    const errors: Error[] = [];

    for (const harmonic of harmonics) {
      try {
        // Handle rejected harmonics
        if (harmonic.rejected) {
          this.log(`Processing rejected harmonic: ${harmonic.rejected_reason}`, harmonic);
          // Only call callback if we haven't processed this rejected harmonic before
          if (this.onRejectedHarmonic && !this.processedRejectedHarmonics.has(harmonic.id)) {
            this.processedRejectedHarmonics.add(harmonic.id);
            this.onRejectedHarmonic(harmonic);
          }
          continue;
        }

        const data = JSON.parse(harmonic.data);

        switch (harmonic.operation) {
          case "create":
            creates.push(data);
            break;
          case "update":
            updates.push(data);
            break;
          case "delete":
            deletes.push(harmonic.record_id);
            break;
          default:
            this.log(`Unknown operation type: ${harmonic.operation}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push(
          new SyncError(`Error processing harmonic ${harmonic.id}`, error),
        );
      }
    }

    // Process batches
    try {
      const operations = [];

      if (creates.length) {
        this.log(`Batch adding ${creates.length} records to ${tableName}`);
        operations.push(this.db!.table(tableName).bulkAdd(creates));
      }

      if (updates.length) {
        this.log(`Batch updating ${updates.length} records in ${tableName}`);
        operations.push(this.db!.table(tableName).bulkPut(updates));
      }

      if (deletes.length) {
        this.log(`Batch deleting ${deletes.length} records from ${tableName}`);
        operations.push(this.db!.table(tableName).bulkDelete(deletes));
      }

      if (operations.length) {
        await Promise.all(operations);
      }

      this.saveLatestHarmonicId(harmonics[harmonics.length - 1].id);

      if (errors.length) {
        errors.forEach((error) => console.error(error));
      }

      return true;
    } catch (err) {
      console.error(`Error during batch processing for ${tableName}:`, err);
      throw new SyncError(
        `Failed to process harmonics batch for ${tableName}`,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Process a single harmonic event
   */
  public async processHarmonic(event: HarmonicEvent): Promise<boolean> {
    // Handle rejected harmonics
    if (event.rejected) {
      this.log(`Processing rejected harmonic: ${event.rejected_reason}`, event);
      // Only call callback if we haven't processed this rejected harmonic before
      if (this.onRejectedHarmonic && !this.processedRejectedHarmonics.has(event.id)) {
        this.processedRejectedHarmonics.add(event.id);
        this.onRejectedHarmonic(event);
      }
      // Save the latest harmonic ID even for rejected events
      this.saveLatestHarmonicId(event.id);
      return true;
    }

    const tableName = event.table_name;
    try {
      const data = JSON.parse(event.data);

      switch (event.operation) {
        case "create":
          this.log(`Adding new ${tableName} record`, data);
          await this.db!.table(tableName).add(data);
          break;
        case "update":
          this.log(`Updating ${tableName} record`, data);
          await this.db!.table(tableName).put(data);
          break;
        case "delete":
          this.log(`Deleting ${tableName} record with ID`, event.record_id);
          await this.db!.table(tableName).delete(event.record_id);
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
        error: null,
      });

      return true;
    } catch (err) {
      const enhancedError = new SyncError(
        `Error processing ${tableName} harmonic ID ${event.id}`,
        err instanceof Error ? err : new Error(String(err)),
      );
      console.error(enhancedError);

      // Store failed events for potential retry
      const failedEvents = JSON.parse(
        localStorage.getItem(FAILED_EVENTS_KEY) || "[]",
      );
      failedEvents.push(event);
      localStorage.setItem(
        FAILED_EVENTS_KEY,
        JSON.stringify(failedEvents.slice(-100)),
      ); // Keep last 100

      // Update the table state
      this.updateTableState(tableName, {
        ...this.getTableState(tableName),
        error: `Error processing ${tableName} update: ${enhancedError.message}`,
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
      this.log(
        "No tables defined in schema. Run php artisan chorus:generate to generate schema.",
      );
      this.isInitialized = true;
      return;
    }
    if (!this.db) {
      throw new Error("Database not initialized. Call setup() first.");
    }

    // Set all tables to loading state
    this.tableNames.forEach((tableName) => {
      this.updateTableState(tableName, {
        lastUpdate: null,
        isLoading: true,
        error: null,
      });
    });

    // Get the latest harmonic ID once for all tables
    const latestHarmonicId = this.getLatestHarmonicId();

    for (const tableName of this.tableNames) {
      try {
        // Check if we have data already
        if(!tableName) {
          console.log(`Table ${tableName} not initialized. Call setup() first`);
        }
        const count = await this.db!.table(tableName).count();
        const isInitialSync = count === 0;

        // Build the API URL
        let url = `/api/sync/${tableName}`;
        if (isInitialSync) {
          url += "?initial=true";
        } else if (latestHarmonicId) {
          url += `?after=${latestHarmonicId}`;
        }

        this.log(
          `Syncing ${tableName}: ${isInitialSync ? "Initial sync" : "Incremental sync"}`,
        );

        // Fetch data
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response body:", errorText);
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
          this.log(
            `Initial sync: received ${responseData.records.length} records for ${tableName}`,
          );
          await this.db.table(tableName).bulkPut(responseData.records);
        } else if (
          responseData.harmonics &&
          responseData.harmonics.length > 0
        ) {
          this.log(
            `Incremental sync: received ${responseData.harmonics.length} harmonics for ${tableName}`,
          );
          await this.processHarmonics(tableName, responseData.harmonics);
        } else {
          this.log(`No changes to sync for ${tableName}`);
        }

        // Update state for this table
        this.updateTableState(tableName, {
          lastUpdate: new Date(),
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error(`Failed to sync data for ${tableName}:`, err);

        // Update state with error
        this.updateTableState(tableName, {
          ...this.getTableState(tableName),
          isLoading: false,
          error: `Failed to sync ${tableName} data: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // Mark as initialized
    this.isInitialized = true;
    this.log("Chorus initialization complete");
  }

  /**
   * Update the state for a specific table
   */
  private updateTableState(
    tableName: string,
    newState: Partial<TableState>,
  ): void {
    this.tableStates[tableName] = {
      ...this.tableStates[tableName],
      ...newState,
    };
  }

  /**
   * Get the current state for a specific table
   */
  public getTableState(tableName: string): TableState {
    return (
      this.tableStates[tableName] || {
        lastUpdate: null,
        isLoading: false,
        error: null,
      }
    );
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
    if (!this.db) {
      throw new Error("Database not initialized. Call setup() first.");
    }
    if (!this.db) {
      throw new Error("Database not initialized. Call setup() first.");
    }
    return this.db.table<T>(tableName).toArray();
  }
}
