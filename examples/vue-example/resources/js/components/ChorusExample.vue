<script setup lang="ts">
// Test the Vue Chorus implementation
import {
    useChorus,
    useOffline
} from '@pixelsprout/chorus-js/vue';
import OfflineIndicator from '@pixelsprout/chorus-js/vue/components/OfflineIndicator.vue';

// Get Chorus state
const {
    isInitialized,
    tables,
    schema,
    initializationError
} = useChorus();

// Get offline state
const {
    isOnline,
    pendingRequestsCount
} = useOffline();
</script>

<template>
  <div class="chorus-example">
    <h2>Chorus Vue Implementation Test</h2>

    <div class="status">
      <p>Initialized: {{ isInitialized }}</p>
      <p v-if="initializationError" class="error">
        Error: {{ initializationError }}
      </p>
    </div>

    <OfflineIndicator class="mb-4" />

    <div class="offline-status">
      <p>Online: {{ isOnline }}</p>
      <p>Pending Requests: {{ pendingRequestsCount }}</p>
    </div>

    <div class="schema-info">
      <h3>Schema Tables:</h3>
      <ul>
        <li v-for="(tableSchema, tableName) in schema" :key="tableName">
          {{ tableName }}
        </li>
      </ul>
    </div>

    <div class="table-states">
      <h3>Table States:</h3>
      <div v-for="(state, tableName) in tables" :key="tableName" class="table-state">
        <h4>{{ tableName }}</h4>
        <p>Loading: {{ state.isLoading }}</p>
        <p>Last Update: {{ state.lastUpdate ? new Date(state.lastUpdate).toLocaleString() : 'Never' }}</p>
        <p v-if="state.error" class="error">Error: {{ state.error }}</p>
      </div>
    </div>
  </div>
</template>



<style scoped>
.chorus-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.status {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.error {
  color: #dc2626;
  font-weight: bold;
}

.offline-status {
  background: #e0f2fe;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.schema-info, .table-states {
  margin-bottom: 20px;
}

.table-state {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

h2, h3, h4 {
  margin-top: 0;
}

ul {
  margin: 0;
  padding-left: 20px;
}
</style>
