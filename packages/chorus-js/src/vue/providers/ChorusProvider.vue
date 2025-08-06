<template>
  <div style="display: contents">
    <!-- Debug indicator to show provider is rendering -->
    <div style="position: fixed; top: 10px; right: 10px; background: green; color: white; padding: 4px; font-size: 10px; z-index: 9999;">
      ChorusProvider Active
    </div>
    <HarmonicListener 
      :channel="`chorus.user.${userId ?? 'guest'}`" 
      @harmonic-event="handleHarmonicEvent" 
    />
    <HarmonicListener 
      v-if="channelPrefix"
      :channel="`chorus.${channelPrefix}.user.${userId ?? 'guest'}`" 
      @harmonic-event="handleHarmonicEvent" 
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, provide, onMounted, onUnmounted, watch, defineComponent, h } from 'vue';

// Add immediate debug log to see if component is even loading
console.log('🎵 [ChorusProvider] Component is loading!');
import { useEcho } from '@laravel/echo-vue';
import { ChorusCore, HarmonicEvent, TableState } from '../../core/chorus';
import { ChorusCoreKey, ChorusStateKey } from '../injection-keys';

interface ChorusProviderProps {
  userId?: number;
  channelPrefix?: string;
  onRejectedHarmonic?: (harmonic: HarmonicEvent) => void;
  onSchemaVersionChange?: (oldVersion: string | null, newVersion: string) => void;
  onDatabaseVersionChange?: (oldVersion: string | null, newVersion: string) => void;
  debugMode?: boolean;
}

const props = withDefaults(defineProps<ChorusProviderProps>(), {
  debugMode: false
});

// Create a new ChorusCore instance - shared across all components
const chorusCore = new ChorusCore({ debugMode: props.debugMode });

// Reactive state
const isInitialized = ref(false);
const tables = reactive<Record<string, TableState>>({});
const schema = reactive<Record<string, any>>({});
const initializationError = ref<string | null>(null);

// According to Vue docs, provide should be called in setup()
// We need to provide the core instance and reactive state
console.log('[ChorusProvider] Providing keys:', { ChorusCoreKey, ChorusStateKey });
console.log('[ChorusProvider] Key descriptions:', { 
  coreDesc: ChorusCoreKey.description, 
  stateDesc: ChorusStateKey.description,
  coreString: ChorusCoreKey.toString(),
  stateString: ChorusStateKey.toString()
});
console.log('[ChorusProvider] Providing chorusCore:', chorusCore);

// Provide ChorusCore instance
provide(ChorusCoreKey, chorusCore);

// Provide reactive state object
const chorusState = {
  isInitialized,
  tables,
  schema,
  initializationError
};
provide(ChorusStateKey, chorusState);
console.log('[ChorusProvider] Provided successfully');

// HarmonicListener component using useEcho
const HarmonicListener = defineComponent({
  props: {
    channel: {
      type: String,
      required: true
    },
  },
  emits: ['harmonic-event'],
  setup(props, { emit }) {
    useEcho<HarmonicEvent>(props.channel, '.harmonic.created', (event) => {
      emit('harmonic-event', event);
    });

    return () => h('div', { style: { display: 'none' } });
  }
});

const handleHarmonicEvent = async (event: HarmonicEvent) => {
  // Skip processing harmonics during database rebuild
  if (chorusCore.getIsRebuilding()) {
    console.log('[Chorus] Skipping harmonic event during database rebuild:', event);
    return;
  }

  const db = chorusCore.getDb();
  if (!db) return;

  // Process the harmonic first to update the main table
  await chorusCore.processHarmonic(event);

  // If this is a rejected harmonic, we need to update the delta status and remove from shadow
  if (event.rejected) {
    // Find and update the corresponding delta to mark it as rejected
    if (event.data) {
      try {
        const eventData = event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (eventData.id) {
          // Find all tables to check for matching deltas
          const tableNames = Object.keys(chorusCore.getAllTableStates());
          for (const tableName of tableNames) {
            const deltaTableName = `${tableName}_deltas`;
            const shadowTableName = `${tableName}_shadow`;
            const deltaTable = db.table(deltaTableName);
            const shadowTable = db.table(shadowTableName);

            const pendingDeltas = await deltaTable
                .where("sync_status")
                .equals("pending")
                .toArray();

            for (const delta of pendingDeltas) {
              if (delta.data?.id === eventData.id) {
                // Mark delta as rejected (keeping it as a log)
                await deltaTable.update(delta.id, {
                  sync_status: "rejected",
                  rejected_reason: event.rejected_reason
                });

                // Remove the item from shadow table so it disappears from UI
                await shadowTable.delete(eventData.id);
                break;
              }
            }
          }
        }
      } catch (err) {
        // Only log DatabaseClosedError as warning, others as errors
        if (err instanceof Error && err.name === 'DatabaseClosedError') {
          console.warn('Database was closed during rejected delta processing:', err.message);
        } else {
          console.error('Failed to update rejected delta:', err);
        }
      }
    }
    updateTables();
    return;
  }

  // Now, find the matching pending delta and mark it as synced
  const deltaTableName = `${event.table_name}_deltas`;
  const shadowTableName = `${event.table_name}_shadow`;
  const deltaTable = db.table(deltaTableName);
  const shadowTable = db.table(shadowTableName);
  const eventData = JSON.parse(event.data as unknown as string);

  const pendingDeltas = await deltaTable
      .where("sync_status")
      .equals("pending")
      .toArray();
  for (const delta of pendingDeltas) {
    if (delta.data.id === eventData.id) {
      try {
        const syncStatus = event.rejected ? "rejected" : "synced";
        await deltaTable.update(delta.id, {
          sync_status: syncStatus,
          rejected_reason: event.rejected_reason
        });
        if (!event.rejected) {
          await shadowTable.delete(delta.data.id);
        }
      } catch (err) {
        console.error(`[Chorus] Failed to update delta ${delta.id}:`, err);
      }
      break; // Exit after finding and processing the match
    }
  }

  // Refresh the UI state
  updateTables();
};

const updateTables = () => {
  const newTableStates = chorusCore.getAllTableStates();
  Object.assign(tables, newTableStates);
};

// Watch for debug mode changes
watch(() => props.debugMode, (newValue) => {
  chorusCore.setDebugMode(newValue);
});

let isCancelled = false;

onMounted(async () => {
  try {
    initializationError.value = null;
    chorusCore.setup(
        props.userId ?? "guest",
        props.onRejectedHarmonic,
        props.onSchemaVersionChange,
        props.onDatabaseVersionChange,
        (newTableStates) => {
          if (!isCancelled) {
            Object.assign(tables, newTableStates);
          }
        }
    );

    const fetchedSchema = await chorusCore.fetchAndInitializeSchema();

    await chorusCore.initializeTables();

    if (!isCancelled) {
      Object.assign(schema, fetchedSchema);
    }

    if (!isCancelled) {
      isInitialized.value = chorusCore.getIsInitialized();
      updateTables();
    }
  } catch (error) {
    console.error("[Chorus] Failed to initialize:", error);
    if (!isCancelled) {
      isInitialized.value = false;
      initializationError.value = error instanceof Error ? error.message : String(error);
      // Set error state for all tables
      const errorTables: Record<string, TableState> = {};
      const currentSchema = chorusCore.getSchema();
      Object.keys(currentSchema).forEach(tableName => {
        errorTables[tableName] = {
          lastUpdate: null,
          isLoading: false,
          error: `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`
        };
      });
      Object.assign(tables, errorTables);
    }
  }
});

onUnmounted(() => {
  isCancelled = true;
});

// Show initialization error if there is one
watch(initializationError, (error) => {
  if (error) {
    console.error("[Chorus] Initialization error:", error);
  }
});
</script>