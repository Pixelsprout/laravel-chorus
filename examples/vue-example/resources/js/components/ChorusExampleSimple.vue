<template>
  <div class="chorus-test">
    <h2>Chorus Injection Test</h2>
    <div v-if="injectionWorking">
      <p>✅ Injection working!</p>
      <p>Chorus Core: {{ chorusCore ? 'Found' : 'Not found' }}</p>
      <p>Initialized: {{ isInitialized }}</p>
      <p>Error: {{ initializationError || 'None' }}</p>
      <p>Tables: {{ Object.keys(tables).join(', ') || 'None' }}</p>
    </div>
    <div v-else>
      <p>❌ Injection not working</p>
      <p>Error: {{ injectionError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChorus } from '@pixelsprout/chorus-js/vue';

const injectionWorking = ref(false);
const injectionError = ref('');
const chorusCore = ref(null);
const isInitialized = ref(false);
const initializationError = ref(null);
const tables = ref({});

try {
  console.log('[ChorusExampleSimple] Attempting to use Chorus...');
  // Call useChorus during setup phase (this is where inject() works)
  const chorus = useChorus();
  console.log('[ChorusExampleSimple] useChorus successful:', chorus);
  
  chorusCore.value = chorus.chorusCore;
  isInitialized.value = chorus.isInitialized.value;
  initializationError.value = chorus.initializationError.value;
  tables.value = chorus.tables;
  
  injectionWorking.value = true;
  console.log('[ChorusExampleSimple] All values set successfully');
} catch (error) {
  console.error('[ChorusExampleSimple] useChorus failed:', error);
  injectionError.value = error instanceof Error ? error.message : String(error);
  injectionWorking.value = false;
}
</script>

<style scoped>
.chorus-test {
  padding: 20px;
  border: 2px solid #ccc;
  border-radius: 8px;
  margin: 20px;
}
</style>