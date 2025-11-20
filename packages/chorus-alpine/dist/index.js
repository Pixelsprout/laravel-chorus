import { ChorusCore, ClientWritesCollector, createActionContext, ChorusActionsAPI, connectChorusActionsAPI, } from "@pixelsprout/chorus-core";
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
    let chorusActionsAPI = null;
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
            // Initialize ChorusActionsAPI for optimistic updates
            chorusActionsAPI = new ChorusActionsAPI("/api");
            connectChorusActionsAPI(chorusInstance, chorusActionsAPI);
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
    // Add the $harmonize magic method for Livewire action integration
    Alpine.magic("harmonize", (el) => {
        return async (actionName, callback) => {
            console.log(`[Chorus] $harmonize.${actionName} called`);
            if (!chorusActionsAPI) {
                throw new Error("Chorus not initialized");
            }
            // Get the Livewire component from the element
            const livewireEl = el?.closest("[wire\\:id]") || el;
            const livewireId = livewireEl?.getAttribute("wire:id");
            if (!livewireId) {
                throw new Error("Could not find Livewire component");
            }
            console.log(`[Chorus] Livewire ID found: ${livewireId}`);
            // Get the $wire instance from Livewire's component registry
            const $wire = livewireEl?.$wire;
            if (!$wire) {
                console.error("[Chorus] Available Livewire components:", window.Livewire?.components);
                throw new Error("$wire not available. Make sure this is called from within a Livewire component");
            }
            // Create a writes collector to capture operations
            const collector = new ClientWritesCollector();
            const actionContext = createActionContext(collector);
            console.log("[Chorus] Starting operation collection");
            collector.startCollecting();
            try {
                // Execute the callback to collect operations
                callback(actionContext);
            }
            finally {
                collector.stopCollecting();
            }
            // Get the collected operations
            const operations = collector.getOperations();
            console.log(`[Chorus] Collected ${operations.length} operations:`, operations);
            if (operations.length === 0) {
                console.log("[Chorus] No operations collected, calling Livewire directly");
                return $wire[actionName]();
            }
            // Perform optimistic updates before calling Livewire
            try {
                await chorusActionsAPI.handleOptimisticUpdates?.(operations, actionName, {});
            }
            catch (error) {
                console.warn("[Chorus] Failed to apply optimistic updates:", error);
            }
            // Call Livewire method with the operations array
            try {
                console.log(`[Chorus] Calling $wire.${actionName} with operations`);
                const response = await $wire[actionName](operations);
                // Mark deltas as synced after successful server response
                console.log(`[Chorus] Marking deltas as synced for action: ${actionName}`);
                try {
                    await chorusActionsAPI.markDeltasAsSynced?.(actionName);
                }
                catch (syncError) {
                    console.warn("[Chorus] Failed to mark deltas as synced:", syncError);
                }
                // Refresh affected table proxies after successful response
                const affectedTables = new Set(operations.map((op) => op.table));
                affectedTables.forEach((tableName) => {
                    const proxy = tableProxies.get(tableName);
                    if (proxy) {
                        proxy.refreshData();
                    }
                });
                return response;
            }
            catch (error) {
                // Rollback optimistic updates on error
                try {
                    await chorusActionsAPI.rollbackOptimisticUpdates?.(operations);
                }
                catch (rollbackError) {
                    console.warn("[Chorus] Failed to rollback optimistic updates:", rollbackError);
                }
                console.error(`[Chorus] Failed to execute Livewire action ${actionName}:`, error);
                throw error;
            }
        };
    });
    // Hook into Livewire's lifecycle to wrap $wire methods
    if (typeof window !== "undefined") {
        document.addEventListener("livewire:init", function () {
            console.log("[Chorus] livewire:init event fired");
            // Try multiple hooks to ensure we catch component initialization
            window.Livewire?.hook("component.initialized", (component) => {
                console.log("[Chorus] component.initialized hook fired");
                setupHarmonizeComponent(component);
            });
            window.Livewire?.hook("element.updating", (el, component) => {
                console.log("[Chorus] element.updating hook fired");
                setupHarmonizeComponent(component);
            });
            window.Livewire?.hook("element.updated", (el, component) => {
                console.log("[Chorus] element.updated hook fired");
                setupHarmonizeComponent(component);
            });
            // Also wrap $wire globally as a fallback
            setTimeout(() => {
                console.log("[Chorus] Setting up global $wire wrapper");
                const originalWire = window.$wire;
                if (originalWire && typeof originalWire === 'object') {
                    window.$wire = new Proxy(originalWire, {
                        get(target, prop) {
                            const original = target[prop];
                            if (typeof original === "function") {
                                return async function wrappedMethod(...args) {
                                    console.log(`[Chorus] $wire.${String(prop)} called with ${args.length} args`);
                                    if (args.length > 0 && typeof args[0] === "function" && chorusActionsAPI) {
                                        console.log("[Chorus] Intercepting callback-based Livewire call");
                                        const callback = args[0];
                                        const actionName = prop;
                                        const collector = new ClientWritesCollector();
                                        const actionContext = createActionContext(collector);
                                        collector.startCollecting();
                                        try {
                                            callback(actionContext);
                                        }
                                        finally {
                                            collector.stopCollecting();
                                        }
                                        const operations = collector.getOperations();
                                        console.log(`[Chorus] Collected ${operations.length} operations`);
                                        if (operations.length > 0) {
                                            try {
                                                await chorusActionsAPI.handleOptimisticUpdates?.(operations, actionName, {});
                                            }
                                            catch (error) {
                                                console.warn("[Chorus] Failed to apply optimistic updates:", error);
                                            }
                                        }
                                        return original.call(target, operations);
                                    }
                                    return original.apply(target, args);
                                };
                            }
                            return original;
                        },
                    });
                    console.log("[Chorus] Global $wire wrapper installed");
                }
            }, 100);
        });
    }
    /**
     * Set up a Livewire component for Harmonize operation collection
     */
    function setupHarmonizeComponent(component) {
        if (!chorusActionsAPI) {
            console.log("[Chorus] ChorusActionsAPI not ready, skipping component setup");
            return; // Chorus not initialized yet
        }
        if (!component || !component.$wire) {
            console.log("[Chorus] Component or $wire not ready");
            return; // Component not ready yet
        }
        console.log("[Chorus] Setting up Harmonize component proxy");
        const originalWire = component.$wire;
        // Create a proxy that intercepts method calls
        const wireProxy = new Proxy(originalWire, {
            get(target, prop) {
                const original = target[prop];
                // If it's a method, wrap it to handle operation collection
                if (typeof original === "function") {
                    return async function wrappedMethod(...args) {
                        // Check if the first argument is a callback (operation collection pattern)
                        if (args.length > 0 && typeof args[0] === "function") {
                            const callback = args[0];
                            const actionName = prop;
                            // Create a writes collector to capture operations
                            const collector = new ClientWritesCollector();
                            const actionContext = createActionContext(collector);
                            // Start collecting operations
                            collector.startCollecting();
                            try {
                                // Execute the callback to collect operations
                                callback(actionContext);
                            }
                            finally {
                                collector.stopCollecting();
                            }
                            // Get the collected operations
                            const operations = collector.getOperations();
                            if (operations.length === 0) {
                                // No operations, call normally
                                return original.apply(target, args);
                            }
                            // Perform optimistic updates before calling Livewire
                            try {
                                await chorusActionsAPI.handleOptimisticUpdates?.(operations, actionName, {});
                            }
                            catch (error) {
                                console.warn("[Chorus] Failed to apply optimistic updates:", error);
                            }
                            // Call Livewire method with the operations array
                            try {
                                const response = await original.call(target, operations);
                                // Mark deltas as synced after successful server response
                                try {
                                    await chorusActionsAPI.markDeltasAsSynced?.(actionName);
                                }
                                catch (syncError) {
                                    console.warn("[Chorus] Failed to mark deltas as synced:", syncError);
                                }
                                // Refresh affected table proxies after successful response
                                const affectedTables = new Set(operations.map((op) => op.table));
                                affectedTables.forEach((tableName) => {
                                    const proxy = tableProxies.get(tableName);
                                    if (proxy) {
                                        proxy.refreshData();
                                    }
                                });
                                return response;
                            }
                            catch (error) {
                                // Rollback optimistic updates on error
                                try {
                                    await chorusActionsAPI.rollbackOptimisticUpdates?.(operations);
                                }
                                catch (rollbackError) {
                                    console.warn("[Chorus] Failed to rollback optimistic updates:", rollbackError);
                                }
                                console.error(`[Chorus] Failed to execute Livewire action ${actionName}:`, error);
                                throw error;
                            }
                        }
                        // Normal method call
                        return original.apply(target, args);
                    };
                }
                return original;
            },
        });
        // Replace the component's $wire with our proxy
        Object.defineProperty(component, "$wire", {
            get() {
                return wireProxy;
            },
            configurable: true,
        });
    }
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
