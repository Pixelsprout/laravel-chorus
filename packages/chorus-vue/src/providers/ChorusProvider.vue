<script setup lang="ts">
import { ref, reactive, provide, onMounted, onUnmounted, watch, defineComponent, h } from 'vue';

// Add immediate debug log to see if component is even loading
console.log('🎵 [ChorusProvider] Component is loading!');
import { useEcho } from '@laravel/echo-vue';
import { ChorusCore, HarmonicEvent, TableState } from '@pixelsprout/chorus-core';
import { ChorusCoreKey, ChorusStateKey } from '../injection-keys';
import type { VueChorusProviderProps } from '@pixelsprout/chorus-core';

const props = withDefaults(defineProps<VueChorusProviderProps>(), {
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

  // Process the harmonic - chorus-core now handles shadow cleanup and delta sync status
  await chorusCore.processHarmonic(event);

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
