<template>
  <div v-if="!isOnline" :class="`offline-banner ${className}`">
    <span>You are currently offline. Changes will be synced when you reconnect.</span>
  </div>
</template>

<script setup lang="ts">
import { useOffline } from '../composables/useOffline';

export interface OfflineBannerProps {
  className?: string;
}

const props = withDefaults(defineProps<OfflineBannerProps>(), {
  className: ''
});

const { isOnline } = useOffline();
</script>

<style scoped>
.offline-banner {
  padding: 12px 16px;
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
  text-align: center;
  font-size: 14px;
}
</style>