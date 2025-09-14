<template>
  <div v-if="shouldShow" :class="`offline-indicator ${className}`">
    <div v-if="!isOnline" class="offline-status">
      <span class="offline-icon">📡</span>
      <span class="offline-text">Offline</span>
    </div>
    
    <div 
      v-if="pendingRequestsCount > 0 && showPendingCount" 
      class="pending-requests"
    >
      <span class="pending-icon">⏳</span>
      <span class="pending-text">
        {{ pendingRequestsCount }} request{{ pendingRequestsCount !== 1 ? 's' : '' }} pending
      </span>
    </div>
    
    <button 
      v-if="isOnline && pendingRequestsCount > 0 && showRetryButton"
      class="retry-button"
      @click="handleRetry"
      type="button"
    >
      Sync Now
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useOffline } from '../composables/useOffline';

export interface OfflineIndicatorProps {
  className?: string;
  showPendingCount?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
}

const props = withDefaults(defineProps<OfflineIndicatorProps>(), {
  className: '',
  showPendingCount: true,
  showRetryButton: true
});

const { isOnline, pendingRequestsCount, processPendingRequests } = useOffline();

const shouldShow = computed(() => {
  return !isOnline.value || pendingRequestsCount.value > 0;
});

const handleRetry = async () => {
  if (props.onRetry) {
    props.onRetry();
  } else {
    await processPendingRequests();
  }
};
</script>

<style scoped>
.offline-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 14px;
}

.offline-status,
.pending-requests {
  display: flex;
  align-items: center;
  gap: 6px;
}

.offline-icon,
.pending-icon {
  font-size: 16px;
}

.retry-button {
  padding: 4px 8px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.retry-button:hover {
  background-color: #2563eb;
}
</style>