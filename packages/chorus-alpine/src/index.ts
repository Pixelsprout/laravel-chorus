import {
    ChorusCore,
    type HarmonicEvent,
    ClientWritesCollector,
    createActionContext,
    ChorusActionsAPI,
    connectChorusActionsAPI,
    offlineManager,
    type OfflineLivewireCall,
} from "@pixelsprout/chorus-core";
import type {Alpine as AlpineType} from "alpinejs";
import {liveQuery} from "dexie";

// Extend Alpine type to include effect method
interface AlpineWithEffect extends AlpineType {
    effect(callback: () => void): () => void;
}

declare global {
    interface Window {
        Alpine?: AlpineWithEffect;
        chorusConfig?: ChorusAlpineConfig;
        Echo?: any; // Laravel Echo instance
        Livewire?: any; // Livewire instance
        $wire?: any; // Livewire $wire instance
    }
}


interface ChorusAlpineConfig {
    userId?: string | number;
    channelPrefix?: string;
    onRejectedHarmonic?: (harmonic: HarmonicEvent) => void;
    onSchemaVersionChange?: (
        oldVersion: string | null,
        newVersion: string,
    ) => void;
    onDatabaseVersionChange?: (
        oldVersion: string | null,
        newVersion: string,
    ) => void;
    debugMode?: boolean;
}

interface LivewireEl extends HTMLElement {
    $wire?: any;
}

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
export default function chorusPlugin(Alpine: AlpineWithEffect) {
    let chorusInstance: ChorusCore | null = null;
    let chorusActionsAPI: ChorusActionsAPI | null = null;
    let initializationPromise: Promise<void> | null = null;
    let isInitialized = false;
    const tableProxies = new Map<string, TableProxy>();

    /**
     * Set up Echo listeners for real-time WebSocket updates
     */
    function setupEchoListeners(userId: string | number, channelPrefix?: string) {
        if (typeof window === "undefined" || !window.Echo) {
            console.warn("[Chorus] Echo (Laravel WebSocket) not available for real-time updates");
            return;
        }

        const echo = window.Echo;

        const handleHarmonicEvent = async (event: HarmonicEvent) => {
            if (!chorusInstance) return;

            // Skip processing harmonics during database rebuild
            if ((chorusInstance as any).getIsRebuilding?.()) {
                console.log("[Chorus] Skipping harmonic event during database rebuild:", event);
                return;
            }

            // Process the harmonic to update DexieDB
            // liveQuery automatically detects database changes and updates reactive data
            await chorusInstance.processHarmonic(event);
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
     * Phase 2: Set up Livewire request interceptor to prevent requests when offline
     */
    function setupLivewireRequestInterceptor(): void {
        if (!window.Livewire) {
            console.warn('[Chorus] Livewire not available for request interception');
            return;
        }

        window.Livewire.interceptRequest(({abort}: any) => {
            if (!offlineManager.getIsOnline()) {
                console.log('[Chorus] Aborting Livewire request (offline)');
                abort();
            }
        });
    }

    /**
     * Set up offline sync - replay cached Livewire method calls when coming back online
     */
    function setupOfflineSync(api: ChorusActionsAPI): void {
        // Listen for online event
        offlineManager.onOnline(async () => {
            console.log("[Chorus] Browser came online");
            try {
                // Replay cached Livewire method calls
                const cachedCalls = offlineManager.getLivewireMethodCalls();

                if (cachedCalls.length > 0) {
                    for (const call of cachedCalls) {
                        try {
                            const component = window.Livewire?.find(call.componentId);

                            if (!component) {
                                console.warn(`[Chorus] Component ${call.componentId} not found for replay`);
                                continue;
                            }

                            // Try to call the method directly on the Livewire component
                            // This is the most direct path that avoids any proxies or interceptors
                            const method = component[call.methodName];
                            if (method && typeof method === 'function') {
                                try {
                                    await method.apply(component, call.params);
                                    continue;
                                } catch (directCallError) {
                                    console.warn(`[Chorus] Direct component method call failed, will try via $wire:`, directCallError);
                                }
                            }

                            // Fallback: try to get the original unwrapped Livewire $wire
                            // This is stored when setupHarmonizeComponent wraps the component
                            const originalWire = (component as any).__chorusOriginalWire;

                            if (!originalWire) {
                                console.warn(`[Chorus] Original wire not found and method not callable directly. Cannot replay ${call.methodName}.`);
                                continue;
                            }

                            if (typeof originalWire[call.methodName] !== 'function') {
                                console.warn(`[Chorus] Method ${call.methodName} not found on original wire for component ${call.componentId}`);
                                continue;
                            }
                            // Call via the original Livewire $wire (fallback if direct method didn't work)
                            await originalWire[call.methodName](...call.params);
                        } catch (error) {
                            console.error(`[Chorus] Failed to replay ${call.methodName}:`, error);
                        }
                    }

                    // Clear the cached calls after replay
                    offlineManager.clearLivewireMethodCalls();
                }

                // Give Livewire a moment to process any updates
                await new Promise(resolve => setTimeout(resolve, 100));

                // liveQuery automatically detects database changes and updates reactive data
            } catch (error) {
                console.error("[Chorus] Error processing online reconnection:", error);
            }
        });
    }

    /**
     * Initialize Chorus with the provided configuration
     */
    async function initialize(config?: ChorusAlpineConfig): Promise<void> {
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
            const finalConfig = {...globalConfig, ...config};

            // Initialize Chorus core
            chorusInstance = new ChorusCore({
                debugMode: finalConfig.debugMode ?? false,
            });

            // Set up Chorus
            chorusInstance.setup(
                finalConfig.userId ?? "guest",
                finalConfig.onRejectedHarmonic,
                finalConfig.onSchemaVersionChange,
                finalConfig.onDatabaseVersionChange,
            );

            // Fetch schema and initialize tables
            await chorusInstance.fetchAndInitializeSchema();
            await chorusInstance.initializeTables();

            // Initialize ChorusActionsAPI for optimistic updates only
            // Don't call connectChorusActionsAPI because it sets up Livewire hooks that route through /api/actions/
            // For Alpine, we want native Livewire calls
            // Note: We don't call setupAutoSync() because we handle offline replay through Livewire's native mechanism
            chorusActionsAPI = new ChorusActionsAPI("/api");

            // Manually connect just the core instance without the Livewire routing
            chorusActionsAPI.setChorusCore(chorusInstance);

            // Set up Echo listeners for real-time WebSocket updates
            setupEchoListeners(finalConfig.userId ?? "guest", finalConfig.channelPrefix);

            // Set up automatic sync when coming back online
            setupOfflineSync(chorusActionsAPI);

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
                    throw new Error(
                        "Chorus not initialized. Call await $chorus.init() first or set window.chorusConfig.",
                    );
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
        return (tableName: string, queryFn?: (table: any) => any) => {
            if (!chorusInstance) {
                throw new Error(
                    "Chorus not initialized. Call await $chorus.init() first or set window.chorusConfig.",
                );
            }

            if (queryFn) {
                // For queries with filter/sort functions, always create a new TableProxy
                // Alpine.effect() inside TableProxy will automatically track the reactive dependencies
                const tableProxy = new TableProxy(tableName, chorusInstance, initializationPromise, Alpine, queryFn);
                // We don't cache query-based proxies as they're created fresh for each Alpine.effect scope
                return tableProxy.getReactiveData();
            } else {
                // Reuse existing proxy for simple table access (no filters)
                if (!tableProxies.has(tableName)) {
                    const tableProxy = new TableProxy(tableName, chorusInstance, initializationPromise, Alpine);
                    tableProxies.set(tableName, tableProxy);
                }
                return tableProxies.get(tableName)!.getReactiveData();
            }
        };
    });

    // Add the $harmonize magic method for Livewire action integration
    Alpine.magic("harmonize", (el) => {
        return async (actionName: string, callback: (context: any) => void) => {
            if (!chorusActionsAPI) {
                throw new Error("Chorus not initialized");
            }

            // Get the Livewire component from the element
            const livewireEl: LivewireEl | undefined = el?.closest("[wire\\:id]") || el;
            const livewireId = livewireEl?.getAttribute("wire:id");

            if (!livewireId) {
                throw new Error("Could not find Livewire component");
            }
            // Get the $wire instance from Livewire's component registry
            const $wire = livewireEl?.$wire;

            if (!$wire) {
                console.error("[Chorus] Available Livewire components:", (window as any).Livewire?.components);
                throw new Error("$wire not available. Make sure this is called from within a Livewire component");
            }

            // Create a writes collector to capture operations
            const collector = new ClientWritesCollector();
            const actionContext = createActionContext(collector);

            collector.startCollecting();

            try {
                // Execute the callback to collect operations
                callback(actionContext);
            } finally {
                collector.stopCollecting();
            }

            // Get the collected operations
            const operations = collector.getOperations();

            if (operations.length === 0) {
                return $wire[actionName]();
            }

            // Perform optimistic updates before calling Livewire
            try {
                if (!chorusActionsAPI) {
                    console.warn("[Chorus] chorusActionsAPI not initialized");
                }
                const result = await (chorusActionsAPI as any).handleOptimisticUpdates?.(
                    operations,
                    actionName,
                    {}
                );
            } catch (error) {
                console.warn("[Chorus] Failed to apply optimistic updates:", error);
            }

            // Check if we're offline BEFORE calling Livewire
            // This prevents relying on Livewire's interceptor to throw an exception
            if (!offlineManager.getIsOnline()) {
                // Cache the method call for replay when online
                const offlineCall: OfflineLivewireCall = {
                    componentId: livewireId,
                    methodName: actionName,
                    params: [operations],
                    timestamp: Date.now(),
                };
                offlineManager.cacheLivewireMethodCall(offlineCall);

                // liveQuery automatically detects the optimistic updates in the database and updates reactive data
                // No need to manually refresh proxies

                // Return optimistic response so the caller thinks it succeeded
                return {
                    success: true,
                    operations: operations.map((op, index) => ({
                        success: true,
                        index,
                        operation: {
                            table: op.table,
                            operation: op.operation,
                            data: op.data,
                        },
                        data: op.data,
                    })),
                    summary: {
                        total: operations.length,
                        successful: operations.length,
                        failed: 0,
                    },
                };
            }

            // Call Livewire method with the operations array (we're online)
            try {
                const response = await $wire[actionName](operations);

                // liveQuery automatically detects the database changes and updates reactive data

                return response;
            } catch (error) {
                console.log(`[Chorus] Exception caught in $harmonize:`, error);

                // If we're online and got an error, rollback optimistic updates
                try {
                    await chorusActionsAPI.rollbackOptimisticUpdates?.(operations);
                } catch (rollbackError) {
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
            setupLivewireRequestInterceptor();

            // Try multiple hooks to ensure we catch component initialization
            window.Livewire?.hook("component.initialized", (component: any) => {
                setupHarmonizeComponent(component);
            });

            window.Livewire?.hook("element.updating", (el: any, component: any) => {
                setupHarmonizeComponent(component);
            });

            window.Livewire?.hook("element.updated", (el: any, component: any) => {
                setupHarmonizeComponent(component);
            });

            // Also wrap $wire globally as a fallback
            const originalWire = window.$wire;
            if (originalWire && typeof originalWire === 'object') {
                window.$wire = new Proxy(originalWire, {
                    get(target, prop: string | symbol) {
                        const original = target[prop as any];

                        if (typeof original === "function") {
                            return async function wrappedMethod(...args: any[]) {
                                console.log(`[Chorus] $wire.${String(prop)} called with ${args.length} args`);

                                if (args.length > 0 && typeof args[0] === "function" && chorusActionsAPI) {
                                    console.log("[Chorus] Intercepting callback-based Livewire call");
                                    const callback = args[0];
                                    const actionName = prop as string;

                                    const collector = new ClientWritesCollector();
                                    const actionContext = createActionContext(collector);

                                    collector.startCollecting();
                                    try {
                                        callback(actionContext);
                                    } finally {
                                        collector.stopCollecting();
                                    }

                                    const operations = collector.getOperations();
                                    console.log(`[Chorus] Collected ${operations.length} operations`);

                                    if (operations.length > 0) {
                                        try {
                                            await (chorusActionsAPI as any).handleOptimisticUpdates?.(
                                                operations,
                                                actionName,
                                                {}
                                            );
                                        } catch (error) {
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
            }
        });
    }

    /**
     * Set up a Livewire component for Harmonize operation collection
     */
    function setupHarmonizeComponent(component: any): void {
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
            get(target, prop: string | symbol) {
                const original = target[prop as any];

                // If it's a method, wrap it to handle operation collection
                if (typeof original === "function") {
                    return async function wrappedMethod(...args: any[]) {
                        // Check if the first argument is a callback (operation collection pattern)
                        if (args.length > 0 && typeof args[0] === "function") {
                            const callback = args[0];
                            const actionName = prop as string;

                            // Create a writes collector to capture operations
                            const collector = new ClientWritesCollector();
                            const actionContext = createActionContext(collector);

                            // Start collecting operations
                            collector.startCollecting();

                            try {
                                // Execute the callback to collect operations
                                callback(actionContext);
                            } finally {
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
                                console.log("[Chorus] Applying optimistic updates in setupHarmonizeComponent...");
                                if (!chorusActionsAPI) {
                                    console.warn("[Chorus] chorusActionsAPI not initialized");
                                }
                                const result = await (chorusActionsAPI as any).handleOptimisticUpdates?.(
                                    operations,
                                    actionName,
                                    {}
                                );
                                console.log("[Chorus] Optimistic updates applied:", result);
                            } catch (error) {
                                console.warn("[Chorus] Failed to apply optimistic updates:", error);
                            }

                            // Check if we're offline BEFORE calling Livewire
                            // This prevents relying on Livewire's interceptor to throw an exception
                            if (!offlineManager.getIsOnline()) {
                                console.log(`[Chorus] Browser is offline in setupHarmonizeComponent, caching method call for replay`);

                                // Cache the method call for replay when online
                                const offlineCall: OfflineLivewireCall = {
                                    componentId: component.$id || 'unknown',
                                    methodName: actionName,
                                    params: [operations],
                                    timestamp: Date.now(),
                                };
                                offlineManager.cacheLivewireMethodCall(offlineCall);
                                console.log(`[Chorus] Cached Livewire method call for replay when online`);

                                // liveQuery automatically detects the optimistic updates in the database and updates reactive data
                                // No need to manually refresh proxies

                                // Return optimistic response so the caller thinks it succeeded
                                return {
                                    success: true,
                                    operations: operations.map((op, index) => ({
                                        success: true,
                                        index,
                                        operation: {
                                            table: op.table,
                                            operation: op.operation,
                                            data: op.data,
                                        },
                                        data: op.data,
                                    })),
                                    summary: {
                                        total: operations.length,
                                        successful: operations.length,
                                        failed: 0,
                                    },
                                };
                            }

                            // Call Livewire method with the operations array (we're online)
                            try {
                                const response = await original.call(target, operations);

                                // liveQuery automatically detects the database changes and updates reactive data

                                return response;
                            } catch (error) {
                                // If we're online and got an error, rollback optimistic updates
                                try {
                                    await (chorusActionsAPI as any).rollbackOptimisticUpdates?.(operations);
                                } catch (rollbackError) {
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

        // Store the original unwrapped wire for offline replay
        (component as any).__chorusOriginalWire = originalWire;

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
 * Manager class for reactive table data with optional query support
 * Uses Alpine.effect() to bridge Alpine's reactivity with Dexie's liveQuery
 */
class TableProxy {
    private tableName: string;
    private chorus: ChorusCore;
    private alpine: AlpineWithEffect;
    private reactiveData: any;
    private queryFn?: (table: any) => any;
    private liveQuerySubscription?: any;
    private alpineEffect?: () => void;

    constructor(
        tableName: string,
        chorus: ChorusCore,
        initializationPromise: Promise<void> | null,
        alpine: AlpineWithEffect,
        queryFn?: (table: any) => any,
    ) {
        this.tableName = tableName;
        this.chorus = chorus;
        this.alpine = alpine;
        this.queryFn = queryFn;
        this.reactiveData = alpine.reactive([]);

        // Wait for initialization before setting up liveQuery with reactivity
        if (initializationPromise) {
            initializationPromise.then(() => {
                this.setupReactiveQuery();
            });
        } else {
            this.setupReactiveQuery();
        }
    }

    private setupReactiveQuery(): void {
        const db = this.chorus.getDb();
        if (!db || !db.isOpen()) {
            console.warn(`[Chorus] Database not available for liveQuery on ${this.tableName}`);
            return;
        }

        // Use Alpine.effect to track reactive dependencies from the query function
        // Call queryFn synchronously so Alpine can track its reactive property accesses
        this.alpineEffect = this.alpine.effect(() => {
            // Clean up old subscription before creating a new one
            if (this.liveQuerySubscription) {
                this.liveQuerySubscription.unsubscribe();
            }

            // IMPORTANT: Call queryFn synchronously here so Alpine.effect() tracks reactive property access
            // This ensures the effect re-runs when filter/sort/etc properties change
            let mainQuery: any;
            let shadowQuery: any;

            try {
                const shadowTableName = `${this.tableName}_shadow`;
                const mainTable = db.table(this.tableName);
                const shadowTable = db.table(shadowTableName);

                if (!mainTable || !shadowTable) {
                    console.warn(`[Chorus] Tables not found: ${this.tableName}, ${shadowTableName}`);
                    mainQuery = mainTable;
                    shadowQuery = shadowTable;
                } else {
                    // Call queryFn synchronously to capture reactive dependencies
                    mainQuery = this.queryFn ? this.queryFn(mainTable) : mainTable;
                    shadowQuery = this.queryFn ? this.queryFn(shadowTable) : shadowTable;
                }
            } catch (error) {
                console.error(`[Chorus] Error building query for ${this.tableName}:`, error);
                return;
            }

            // Now create liveQuery with the captured query objects
            this.liveQuerySubscription = liveQuery(async () => {
                try {
                    const shadowTableName = `${this.tableName}_shadow`;
                    const deltaTableName = `${this.tableName}_deltas`;

                    const deltaTable = db.table(deltaTableName);

                    // Execute queries
                    const mainData = await this.toArray(mainQuery);
                    const shadowData = await this.toArray(shadowQuery);

                    // Merge shadow data with main data (shadow takes precedence for optimistic updates)
                    const shadowDataMap = new Map((shadowData ?? []).map((item) => [item.id, item]));
                    const merged = (mainData ?? []).map((item) =>
                        shadowDataMap.has(item.id) ? shadowDataMap.get(item.id)! : item
                    );

                    const mainDataIds = new Set((mainData ?? []).map((item) => item.id));

                    // Add shadow items that don't exist in main table
                    if (shadowData && shadowData.length) {
                        for (const item of shadowData) {
                            if (!mainDataIds.has(item.id)) {
                                merged.push(item);
                            }
                        }
                    }

                    // Re-apply sorting to the merged result to ensure shadow items appear in correct position
                    // This is necessary because shadow items added above will be at the end otherwise
                    if (this.queryFn && merged.length > 0) {
                        // Detect sort order by comparing the first and last items of mainData
                        // If mainData is sorted descending by created_at, the first item's created_at > last item's created_at
                        if ((mainData ?? []).length > 1) {
                            const first = mainData[0];
                            const last = mainData[mainData.length - 1];

                            // Check if data is sorted descending (newest first)
                            const isDescending = new Date(first.created_at).getTime() > new Date(last.created_at).getTime();

                            // Re-sort the merged array by created_at in the same order
                            merged.sort((a, b) => {
                                const aTime = new Date(a.created_at).getTime();
                                const bTime = new Date(b.created_at).getTime();
                                return isDescending ? bTime - aTime : aTime - bTime;
                            });
                        }
                    }

                    // Filter out pending deletes
                    if (deltaTable) {
                        const pendingDeletes = await deltaTable
                            .where('[operation+sync_status]')
                            .equals(['delete', 'pending'])
                            .toArray();
                        const deleteIds = new Set(pendingDeletes.map((delta: any) => delta.data.id));
                        return merged.filter((item) => !deleteIds.has(item.id));
                    }

                    return merged;
                } catch (error) {
                    console.error(`Error in liveQuery for ${this.tableName}:`, error);
                    return [];
                }
            }).subscribe((data: any) => {
                // Update reactive data whenever the query results change
                this.reactiveData.splice(0, this.reactiveData.length, ...(data ?? []));
            });
        });
    }

    getTableName(): string {
        return this.tableName;
    }

    getReactiveData() {
        return this.reactiveData;
    }

    private async toArray(result: any): Promise<any[]> {
        if (Array.isArray(result)) {
            return result;
        }
        if (result && typeof result.toArray === 'function') {
            return await result.toArray();
        }
        return result ?? [];
    }

    // Clean up resources when the proxy is no longer needed
    destroy() {
        // Unsubscribe from liveQuery
        if (this.liveQuerySubscription) {
            this.liveQuerySubscription.unsubscribe();
        }
        // Stop the Alpine effect
        if (this.alpineEffect) {
            this.alpineEffect();
        }
    }
}

// Export types
export type {ChorusAlpineConfig};
export type {
    ChorusCore,
    HarmonicEvent,
    TableState,
    SyncError,
} from "@pixelsprout/chorus-core";
