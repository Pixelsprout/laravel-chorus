<script setup lang="ts">
// Test the Vue Chorus implementation
import {
    useChorus,
    useOffline,
    useTable
} from '@pixelsprout/chorus-vue';
import { watch, computed } from 'vue';
import OfflineIndicator from '@pixelsprout/chorus-vue/components/OfflineIndicator.vue';

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


const {
    data: usersData,
    isLoading: usersIsLoading,
    error: usersError,
    lastUpdate: usersLastUpdate,
} = useTable('users');

</script>

<template>
  <div class="chorus-example">
      <div v-if="usersIsLoading" class="loading">
        Loading users data...
      </div>
      <div v-else-if="usersError" class="error">
        Error loading users data: {{ usersError }}
      </div>
      <div v-else-if="usersData && usersData.length > 0">
        <p>Total records: {{ usersData.length }}</p>
        <div class="users-grid">
          <div v-for="record in usersData" :key="record.id" class="user-card">
            <h4>{{ record.name || record.title || `Record ${record.id}` }}</h4>
            <div v-for="(value, key) in record" :key="key">
              <p>
                <span>{{ value }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-data">
        No users records found
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

.schema-info, .table-states, .users-list {
  margin-bottom: 20px;
}

.table-state {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.user-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.user-card h4 {
  margin: 0 0 10px 0;
  color: #1f2937;
  font-size: 1.1em;
}

.user-card p {
  margin: 5px 0;
  font-size: 0.9em;
  color: #4b5563;
}

.unverified {
  color: #dc2626 !important;
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-style: italic;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-style: italic;
  background: #f9fafb;
  border-radius: 4px;
}

h2, h3, h4 {
  margin-top: 0;
}

ul {
  margin: 0;
  padding-left: 20px;
}
</style>
