import { ChorusCore } from "@pixelsprout/chorus-core";
/**
 * Chorus Alpine.js Plugin
 *
 * Usage:
 *   import Alpine from 'alpinejs'
 *   import chorus from '@pixelsprout/chorus-alpine'
 *
 *   Alpine.plugin(chorus)
 *   Alpine.start()
 *
 * Then access via magic properties:
 *   - $chorus - Access the Chorus core instance
 *   - $table('tableName') - Access reactive table data
 *
 * Configuration can be provided via:
 *   1. window.chorusConfig (set by Blade directive)
 *   2. await $chorus.init(config) - Manual initialization
 */
export default function chorusPlugin(Alpine) {
    let chorusInstance = null;
    let initializationPromise = null;
    let isInitialized = false;
    const tableProxies = new Map();
    /**
     * Set up Echo listeners for real-time WebSocket updates
     */
    function setupEchoListeners(userId, channelPrefix) {
        if (typeof window === "undefined" || !window.Echo) {
            console.warn("[Chorus] Echo (Laravel WebSocket) not available for real-time updates");
            return;
        }
        const echo = window.Echo;
        const handleHarmonicEvent = async (event) => {
            if (!chorusInstance)
                return;
            // Skip processing harmonics during database rebuild
            if (chorusInstance.getIsRebuilding?.()) {
                console.log("[Chorus] Skipping harmonic event during database rebuild:", event);
                return;
            }
            // Process the harmonic to update DexieDB
            await chorusInstance.processHarmonic(event);
            // Update all table proxies that might be affected
            tableProxies.forEach((proxy) => {
                if (proxy.getTableName() === event.table_name) {
                    proxy.refreshData();
                }
            });
        };
        // Subscribe to main channel (private channel requires authorization)
        const mainChannel = `chorus.user.${userId}`;
        echo.private(mainChannel).listen(".harmonic.created", handleHarmonicEvent);
        // Subscribe to optional prefix channel
        if (channelPrefix) {
            const prefixChannel = `chorus.${channelPrefix}.user.${userId}`;
            echo.private(prefixChannel).listen(".harmonic.created", handleHarmonicEvent);
        }
    }
    /**
     * Initialize Chorus with the provided configuration
     */
    async function initialize(config) {
        // If already initializing, return existing promise
        if (initializationPromise) {
            return initializationPromise;
        }
        // If already initialized, return immediately
        if (isInitialized && chorusInstance) {
            return Promise.resolve();
        }
        // Start initialization
        initializationPromise = (async () => {
            // Merge provided config with global config from Blade directive
            const globalConfig = window.chorusConfig || {};
            const finalConfig = { ...globalConfig, ...config };
            // Initialize Chorus core
            chorusInstance = new ChorusCore({
                debugMode: finalConfig.debugMode ?? false,
            });
            // Set up Chorus
            chorusInstance.setup(finalConfig.userId ?? "guest", finalConfig.onRejectedHarmonic, finalConfig.onSchemaVersionChange, finalConfig.onDatabaseVersionChange);
            // Fetch schema and initialize tables
            await chorusInstance.fetchAndInitializeSchema();
            await chorusInstance.initializeTables();
            // Set up Echo listeners for real-time WebSocket updates
            setupEchoListeners(finalConfig.userId ?? "guest", finalConfig.channelPrefix);
            isInitialized = true;
            console.log("Chorus Alpine.js plugin initialized");
        })();
        return initializationPromise;
    }
    // Auto-initialize if window.chorusConfig is present
    if (typeof window !== "undefined" && window.chorusConfig) {
        initialize().catch((error) => {
            console.error("Failed to auto-initialize Chorus:", error);
        });
    }
    // Add the $chorus magic method for accessing the core instance and initialization
    Alpine.magic("chorus", () => {
        return {
            get instance() {
                if (!chorusInstance) {
                    throw new Error("Chorus not initialized. Call await $chorus.init() first or set window.chorusConfig.");
                }
                return chorusInstance;
            },
            init: initialize,
            get isInitialized() {
                return isInitialized;
            },
        };
    });
    // Add the $table magic method to Alpine
    Alpine.magic("table", () => {
        return (tableName) => {
            if (!chorusInstance) {
                throw new Error("Chorus not initialized. Call await $chorus.init() first or set window.chorusConfig.");
            }
            // Reuse existing proxy or create new one
            if (!tableProxies.has(tableName)) {
                const tableProxy = new TableProxy(tableName, chorusInstance, initializationPromise, Alpine);
                tableProxies.set(tableName, tableProxy);
            }
            // Return the reactive items array, not the proxy object itself
            return tableProxies.get(tableName).getReactiveData();
        };
    });
}
/**
 * Manager class for reactive table data
 */
class TableProxy {
    constructor(tableName, chorus, initializationPromise, alpine) {
        this.initialized = false;
        this.data = [];
        this.tableName = tableName;
        this.chorus = chorus;
        this.data = [];
        this.alpine = alpine;
        // Create reactive wrapper once and reuse it
        this.reactiveData = alpine.reactive(this.data);
        // Wait for initialization before loading table data
        if (initializationPromise) {
            initializationPromise.then(() => {
                this.loadTableData();
                this.initialized = true;
            });
        }
        else {
            // If no initialization promise, load immediately
            this.loadTableData();
            this.initialized = true;
        }
    }
    getTableName() {
        return this.tableName;
    }
    getReactiveData() {
        return this.reactiveData;
    }
    async refreshData() {
        await this.loadTableData();
    }
    async loadTableData() {
        try {
            const freshData = await this.chorus.getTableData(this.tableName);
            // Mutate through the reactive proxy to ensure Alpine detects changes
            this.reactiveData.splice(0, this.reactiveData.length, ...freshData);
        }
        catch (error) {
            console.error(`Error loading table ${this.tableName}:`, error);
        }
    }
    // Clean up resources when the proxy is no longer needed
    destroy() {
        // No more interval to clean up - using WebSocket instead
    }
}
