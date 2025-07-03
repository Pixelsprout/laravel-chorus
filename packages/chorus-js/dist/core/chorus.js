var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createChorusDb } from "./db";
// Storage key
const getLatestHarmonicIdKey = (userId) => `chorus_latest_harmonic_id_${userId !== null && userId !== void 0 ? userId : "guest"}`;
const FAILED_EVENTS_KEY = "chorus_failed_events";
// Custom error type
export class SyncError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "SyncError";
    }
}
/**
 * ChorusCore class - handles the core data sync functionality
 */
export class ChorusCore {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.tableStates = {};
        this.userId = null;
        this.tableNames = [];
    }
    /**
     * Reset the ChorusCore state
     */
    reset() {
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
     * Setup the ChorusCore with a userId and schema
     */
    setup(userId, schema) {
        console.log("Chorus schema: ", schema);
        this.userId = userId;
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
    log(message, data) {
        if (process.env.NODE_ENV !== "production") {
            if (data === undefined) {
                console.log(`[Chorus] ${message}`);
            }
            else {
                console.log(`[Chorus] ${message}`, data);
            }
        }
    }
    /**
     * Get the latest harmonic ID from localStorage
     */
    getLatestHarmonicId() {
        var _a;
        return localStorage.getItem(getLatestHarmonicIdKey((_a = this.userId) === null || _a === void 0 ? void 0 : _a.toString()));
    }
    /**
     * Save the latest harmonic ID to localStorage
     */
    saveLatestHarmonicId(id) {
        var _a;
        localStorage.setItem(getLatestHarmonicIdKey((_a = this.userId) === null || _a === void 0 ? void 0 : _a.toString()), id);
    }
    /**
     * Process a batch of harmonics
     */
    processHarmonics(tableName, harmonics) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!harmonics.length)
                return true;
            // Group by operation type
            const creates = [];
            const updates = [];
            const deletes = [];
            const errors = [];
            for (const harmonic of harmonics) {
                try {
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
                }
                catch (err) {
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
                    yield Promise.all(operations);
                }
                // Save latest harmonic ID
                this.saveLatestHarmonicId(harmonics[harmonics.length - 1].id);
                if (errors.length) {
                    errors.forEach((error) => console.error(error));
                }
                return true;
            }
            catch (err) {
                console.error(`Error during batch processing for ${tableName}:`, err);
                throw new SyncError(`Failed to process harmonics batch for ${tableName}`, err instanceof Error ? err : new Error(String(err)));
            }
        });
    }
    /**
     * Process a single harmonic event
     */
    processHarmonic(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = event.table_name;
            try {
                const data = JSON.parse(event.data);
                switch (event.operation) {
                    case "create":
                        this.log(`Adding new ${tableName} record`, data);
                        yield this.db.table(tableName).add(data);
                        break;
                    case "update":
                        this.log(`Updating ${tableName} record`, data);
                        yield this.db.table(tableName).put(data);
                        break;
                    case "delete":
                        this.log(`Deleting ${tableName} record with ID`, event.record_id);
                        yield this.db.table(tableName).delete(event.record_id);
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
            }
            catch (err) {
                const enhancedError = new SyncError(`Error processing ${tableName} harmonic ID ${event.id}`, err instanceof Error ? err : new Error(String(err)));
                console.error(enhancedError);
                // Store failed events for potential retry
                const failedEvents = JSON.parse(localStorage.getItem(FAILED_EVENTS_KEY) || "[]");
                failedEvents.push(event);
                localStorage.setItem(FAILED_EVENTS_KEY, JSON.stringify(failedEvents.slice(-100))); // Keep last 100
                // Update the table state
                this.updateTableState(tableName, Object.assign(Object.assign({}, this.getTableState(tableName)), { error: `Error processing ${tableName} update: ${enhancedError.message}` }));
                return false;
            }
        });
    }
    /**
     * Initialize all tables with data
     */
    initializeTables() {
        return __awaiter(this, void 0, void 0, function* () {
            // Skip if no tables are defined
            if (this.tableNames.length === 0) {
                this.log("No tables defined in schema. Run php artisan chorus:generate to generate schema.");
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
                    const count = yield this.db.table(tableName).count();
                    const isInitialSync = count === 0;
                    // Build the API URL
                    let url = `/api/sync/${tableName}`;
                    if (isInitialSync) {
                        url += "?initial=true";
                    }
                    else if (latestHarmonicId) {
                        url += `?after=${latestHarmonicId}`;
                    }
                    this.log(`Syncing ${tableName}: ${isInitialSync ? "Initial sync" : "Incremental sync"}`);
                    // Fetch data
                    const response = yield fetch(url);
                    if (!response.ok) {
                        const errorText = yield response.text();
                        console.error("Error response body:", errorText);
                        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
                    }
                    const responseData = yield response.json();
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
                        yield this.db.table(tableName).bulkPut(responseData.records);
                    }
                    else if (responseData.harmonics &&
                        responseData.harmonics.length > 0) {
                        this.log(`Incremental sync: received ${responseData.harmonics.length} harmonics for ${tableName}`);
                        yield this.processHarmonics(tableName, responseData.harmonics);
                    }
                    else {
                        this.log(`No changes to sync for ${tableName}`);
                    }
                    // Update state for this table
                    this.updateTableState(tableName, {
                        lastUpdate: new Date(),
                        isLoading: false,
                        error: null,
                    });
                }
                catch (err) {
                    console.error(`Failed to sync data for ${tableName}:`, err);
                    // Update state with error
                    this.updateTableState(tableName, Object.assign(Object.assign({}, this.getTableState(tableName)), { isLoading: false, error: `Failed to sync ${tableName} data: ${err instanceof Error ? err.message : String(err)}` }));
                }
            }
            // Mark as initialized
            this.isInitialized = true;
            this.log("Chorus initialization complete");
        });
    }
    /**
     * Update the state for a specific table
     */
    updateTableState(tableName, newState) {
        this.tableStates[tableName] = Object.assign(Object.assign({}, this.tableStates[tableName]), newState);
    }
    /**
     * Get the current state for a specific table
     */
    getTableState(tableName) {
        return (this.tableStates[tableName] || {
            lastUpdate: null,
            isLoading: false,
            error: null,
        });
    }
    /**
     * Get all table states
     */
    getAllTableStates() {
        return this.tableStates;
    }
    /**
     * Check if Chorus is fully initialized
     */
    getIsInitialized() {
        return this.isInitialized;
    }
    /**
     * Get the database instance
     */
    getDb() {
        return this.db;
    }
    /**
     * Get data from a specific table
     */
    getTableData(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.db) {
                throw new Error("Database not initialized. Call setup() first.");
            }
            if (!this.db) {
                throw new Error("Database not initialized. Call setup() first.");
            }
            return this.db.table(tableName).toArray();
        });
    }
}
