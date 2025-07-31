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
import { offlineManager } from "./offline";
import { offlineFetch } from "./fetch";
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
    constructor(options = { debugMode: false }) {
        var _a;
        this.db = null;
        this.schema = {};
        this.isInitialized = false;
        this.tableStates = {};
        this.userId = null;
        this.processedRejectedHarmonics = new Set();
        this.isOnline = true;
        this.isRebuilding = false;
        this.debugMode = false;
        this.readyPromise = null;
        this.debugMode = (_a = options.debugMode) !== null && _a !== void 0 ? _a : false;
        this.readyPromise = new Promise((resolve) => {
            this.resolveReady = resolve;
        });
        this.tableNames = [];
        this.setupOfflineHandlers();
    }
    markReady() {
        this.resolveReady();
    }
    waitUntilReady() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.readyPromise;
        });
    }
    /**
     * Set up offline event handlers
     */
    setupOfflineHandlers() {
        offlineManager.onOnline(() => {
            this.isOnline = true;
            this.log("Device came online - processing pending requests and syncing");
            this.handleOnlineReconnection();
        });
        offlineManager.onOffline(() => {
            this.isOnline = false;
            this.log("Device went offline");
        });
        this.isOnline = offlineManager.getIsOnline();
    }
    /**
     * Handle reconnection when device comes back online
     */
    handleOnlineReconnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Process any pending offline requests first
                yield offlineManager.processPendingRequests();
                // Don't sync harmonics here - they will come through WebSocket channels
                // The bulk sync would conflict with optimistic updates from offline requests
            }
            catch (err) {
                console.error("Error during online reconnection:", err);
            }
        });
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
    setDebugMode(debugMode) {
        this.debugMode = debugMode;
    }
    /**
     * Set up the ChorusCore with a userId and optional fallback schema
     */
    setup(userId, onRejectedHarmonic, onSchemaVersionChange, onDatabaseVersionChange, onTableStatesChange) {
        this.userId = userId;
        this.onRejectedHarmonic = onRejectedHarmonic;
        this.onSchemaVersionChange = onSchemaVersionChange;
        this.onDatabaseVersionChange = onDatabaseVersionChange;
        this.onTableStatesChange = onTableStatesChange;
        const dbName = `chorus_db_${userId || "guest"}`;
        this.db = createChorusDb(dbName);
        // Don't initialize schema here - it will be fetched from server
        this.log("Setting up ChorusCore with userId", userId);
    }
    /**
     * Fetch schema from server and initialize database
     */
    fetchAndInitializeSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.log("Fetching schema from server...");
                const response = yield offlineFetch("/api/schema");
                if (!response.ok) {
                    this.log(`Failed to fetch schema: ${response.status}`);
                }
                const schemaData = yield response.json();
                const schema = schemaData.schema || {};
                const newSchemaVersion = schemaData.schema_version;
                const newDatabaseVersion = schemaData.database_version;
                // Store the schema in the class property
                this.schema = schema;
                this.log("Received schema from server", { schema, schemaVersion: newSchemaVersion, databaseVersion: newDatabaseVersion });
                // Check if schema version has changed
                const currentSchemaVersion = localStorage.getItem(`chorus_schema_version_${this.userId}`);
                const schemaVersionChanged = currentSchemaVersion && newSchemaVersion && currentSchemaVersion !== newSchemaVersion.toString();
                // Check if database version has changed (migrations were run)
                const currentDatabaseVersion = localStorage.getItem(`chorus_database_version_${this.userId}`);
                const databaseVersionChanged = currentDatabaseVersion && newDatabaseVersion && currentDatabaseVersion !== newDatabaseVersion.toString();
                const shouldRebuildDb = schemaVersionChanged || databaseVersionChanged;
                if (shouldRebuildDb) {
                    if (schemaVersionChanged) {
                        this.log(`Schema version changed from ${currentSchemaVersion} to ${newSchemaVersion}, rebuilding database...`);
                        // Notify about schema version change
                        if (this.onSchemaVersionChange) {
                            this.onSchemaVersionChange(currentSchemaVersion, newSchemaVersion.toString());
                        }
                    }
                    if (databaseVersionChanged) {
                        this.log(`Database version changed from ${currentDatabaseVersion} to ${newDatabaseVersion}, rebuilding database...`);
                        // Notify about database version change (migrations were run)
                        if (this.onDatabaseVersionChange) {
                            this.onDatabaseVersionChange(currentDatabaseVersion, newDatabaseVersion.toString());
                        }
                    }
                    this.isRebuilding = true;
                    yield this.rebuildDatabase();
                    // Store versions AFTER rebuild to ensure they're updated
                    if (newSchemaVersion) {
                        localStorage.setItem(`chorus_schema_version_${this.userId}`, newSchemaVersion.toString());
                    }
                    if (newDatabaseVersion) {
                        localStorage.setItem(`chorus_database_version_${this.userId}`, newDatabaseVersion.toString());
                    }
                    yield this.initializeWithSchema(schema, newDatabaseVersion, newSchemaVersion);
                    // After rebuilding, we need to do a full resync for all tables
                    // This ensures we have all the data before processing any harmonics
                    this.log("Database rebuilt, performing full resync...");
                    yield this.performFullResync();
                    // After full resync, wait a moment to ensure any pending harmonics are processed
                    // before we start normal operation
                    this.log("Full resync completed, waiting for system to stabilize...");
                    this.isRebuilding = false;
                }
                else {
                    // Store versions for future reference
                    if (newSchemaVersion) {
                        localStorage.setItem(`chorus_schema_version_${this.userId}`, newSchemaVersion.toString());
                    }
                    if (newDatabaseVersion) {
                        localStorage.setItem(`chorus_database_version_${this.userId}`, newDatabaseVersion.toString());
                    }
                    yield this.initializeWithSchema(schema, newDatabaseVersion, newSchemaVersion);
                }
                return this.schema;
            }
            catch (err) {
                this.log("Failed to fetch schema from server, using fallback", err);
                // Return empty schema on error, but still store it
                this.schema = {};
                return this.schema;
            }
        });
    }
    /**
     * Get the current schema
     */
    getSchema() {
        return this.schema;
    }
    /**
     * Rebuild the database by deleting it and clearing stored harmonic IDs
     */
    rebuildDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (this.db && this.db.isOpen()) {
                    yield this.db.close();
                }
                // Delete the database
                const dbName = `chorus_db_${this.userId || "guest"}`;
                yield indexedDB.deleteDatabase(dbName);
                // Clear stored harmonic IDs to force full resync
                localStorage.removeItem(getLatestHarmonicIdKey((_a = this.userId) === null || _a === void 0 ? void 0 : _a.toString()));
                // Recreate the database
                this.db = createChorusDb(dbName);
                this.log("Database rebuilt successfully - will perform full resync");
            }
            catch (err) {
                console.error("Error rebuilding database:", err);
                throw err;
            }
        });
    }
    /**
     * Perform a full resync of all tables after database rebuild
     */
    performFullResync() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tableNames.length === 0) {
                this.log("No tables to resync");
                return;
            }
            this.log("Starting full resync for all tables...");
            for (const tableName of this.tableNames) {
                try {
                    // Set table to loading state
                    this.updateTableState(tableName, {
                        lastUpdate: null,
                        isLoading: true,
                        error: null,
                    });
                    // Force initial sync by requesting all data
                    const url = `/api/sync/${tableName}?initial=true`;
                    this.log(`Full resyncing ${tableName}...`);
                    const response = yield offlineFetch(url, { skipOfflineCache: true });
                    if (!response.ok) {
                        this.log(`Failed to sync ${tableName}: ${response.status}`);
                    }
                    const responseData = yield response.json();
                    // Save latest harmonic ID
                    if (responseData.latest_harmonic_id) {
                        this.saveLatestHarmonicId(responseData.latest_harmonic_id);
                    }
                    // Clear the table first to ensure clean state
                    yield this.db.table(tableName).clear();
                    // NOTE: We don't need to add records here as this will happen naturally though the bulkAdd phase.
                    // Update state for this table
                    this.updateTableState(tableName, {
                        lastUpdate: new Date(),
                        isLoading: false,
                        error: null,
                    });
                }
                catch (err) {
                    console.error(`Failed to resync ${tableName}:`, err);
                    // Update state with error
                    this.updateTableState(tableName, Object.assign(Object.assign({}, this.getTableState(tableName)), { isLoading: false, error: `Failed to resync ${tableName}: ${err instanceof Error ? err.message : String(err)}` }));
                }
            }
            this.log("Full resync completed");
        });
    }
    /**
     * Initialize database with the provided schema
     */
    initializeWithSchema(schema, databaseVersion, schemaVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.db) {
                throw new Error("Database not initialized. Call setup() first.");
            }
            this.tableNames = Object.keys(schema || {});
            // Initialize table states
            this.tableNames.forEach((tableName) => {
                this.tableStates[tableName] = {
                    lastUpdate: null,
                    isLoading: false,
                    error: null,
                };
            });
            // Calculate a version number based on database version and schema version
            let forceVersion;
            if (databaseVersion || schemaVersion) {
                // Create a combined version hash from database and schema versions
                const versionString = `${databaseVersion || 'v1'}_${schemaVersion || '1'}`;
                let hash = 0;
                for (let i = 0; i < versionString.length; i++) {
                    const char = versionString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32-bit integer
                }
                // Ensure version is positive and reasonable (between 1 and 999999)
                forceVersion = Math.abs(hash) % 999999 + 1;
                this.log(`Calculated IndexedDB version ${forceVersion} from database version ${databaseVersion} and schema version ${schemaVersion}`);
            }
            yield this.db.initializeSchema(schema, forceVersion);
            this.isInitialized = true;
        });
    }
    /**
     * Simple logging utility
     */
    log(message, data) {
        if (process.env.NODE_ENV !== "production" && this.debugMode) {
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
    processHarmonics(harmonics, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.db) {
                throw new SyncError("Database not initialized");
            }
            // Skip processing harmonics during database rebuild
            if (this.isRebuilding) {
                this.log(`Skipping batch harmonic processing during database rebuild for ${tableName}`);
                return true;
            }
            if (harmonics.length === 0) {
                return true;
            }
            const creates = [];
            const updates = [];
            const deletes = [];
            const errors = [];
            // Process each harmonic
            for (const harmonic of harmonics) {
                try {
                    // Skip rejected harmonics in batch processing
                    if (harmonic.rejected) {
                        this.log(`Skipping rejected harmonic in batch: ${harmonic.rejected_reason}`, harmonic);
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
            // Skip processing harmonics during database rebuild
            if (this.isRebuilding) {
                this.log(`Skipping harmonic processing during database rebuild`, event);
                return true;
            }
            // Handle rejected harmonics
            if (event.rejected) {
                this.log(`Processing rejected harmonic: ${event.rejected_reason}`, event);
                // Only call callback if we haven't processed this rejected harmonic before
                // and if the event has a valid ID
                if (this.onRejectedHarmonic && event.id && !this.processedRejectedHarmonics.has(event.id)) {
                    this.processedRejectedHarmonics.add(event.id);
                    this.onRejectedHarmonic(event);
                }
                // Save the latest harmonic ID even for rejected events (only if ID exists)
                if (event.id) {
                    this.saveLatestHarmonicId(event.id);
                }
                return true;
            }
            const tableName = event.table_name;
            try {
                const data = JSON.parse(event.data);
                switch (event.operation) {
                    case "create":
                        this.log(`Adding new ${tableName} record`, data);
                        yield this.db.table(tableName).put(data);
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
                // this.saveLatestHarmonicId(event.id);
                // Update the table state
                this.updateTableState(tableName, {
                    lastUpdate: new Date(),
                    isLoading: false,
                    error: null,
                });
                return true;
            }
            catch (err) {
                console.warn(`Error during batch processing for ${tableName}:`, err);
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
                    if (!tableName) {
                        console.log(`Table ${tableName} not initialized. Call setup() first`);
                    }
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
                    // Fetch data using offline-aware fetch
                    const response = yield offlineFetch(url, { skipOfflineCache: true });
                    if (!response.ok) {
                        const errorText = yield response.text();
                        console.error("Error response body:", errorText);
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
                        yield this.processHarmonics(responseData.harmonics, tableName);
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
            this.markReady();
        });
    }
    /**
     * Update the state for a specific table
     */
    updateTableState(tableName, newState) {
        this.tableStates[tableName] = Object.assign(Object.assign({}, this.tableStates[tableName]), newState);
        // Notify React component of state change
        if (this.onTableStatesChange) {
            this.onTableStatesChange(this.tableStates);
        }
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
     * Check if a table exists in the database
     */
    hasTable(tableName) {
        if (!this.db || !this.isInitialized) {
            return false;
        }
        try {
            // Check if table exists in the schema
            return this.tableNames.includes(tableName);
        }
        catch (err) {
            console.warn(`[Chorus] Error checking table ${tableName}:`, err);
            return false;
        }
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
    /**
     * Get current online/offline status
     */
    getIsOnline() {
        return this.isOnline;
    }
    /**
     * Check if the system is currently rebuilding the database
     */
    getIsRebuilding() {
        return this.isRebuilding;
    }
    /**
     * Get offline manager instance for advanced offline operations
     */
    getOfflineManager() {
        return offlineManager;
    }
    /**
     * Make an offline-aware API request
     */
    makeRequest(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, options = {}) {
            return offlineFetch(url, options);
        });
    }
}
