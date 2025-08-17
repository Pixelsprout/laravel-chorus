// Vue-specific exports for Chorus
export { useChorus } from './providers/ChorusProvider';
export { useHarmonics, useHarmonicsQuery } from './composables/useHarmonics';
export { useTable, useTables } from './composables/useTable';
export { useOffline } from './composables/useOffline';
export { useWriteActions } from './composables/useWriteActions';
export { useChorusActions } from './composables/useChorusActions';

// ChorusProvider component should be imported directly:
// import ChorusProvider from '@pixelsprout/chorus-js/vue/providers/ChorusProvider.vue'
// Vue components are exported directly from their files
// Import them directly in your Vue app:
// import OfflineIndicator from '@pixelsprout/chorus-js/vue/components/OfflineIndicator.vue'
// import OfflineBanner from '@pixelsprout/chorus-js/vue/components/OfflineBanner.vue'

// Re-export core types
export type { 
  HarmonicEvent, 
  TableState, 
  SyncError 
} from '../core/types';

// Re-export chorus actions types
export type {
  ChorusActionResponse,
  ChorusActionConfig,
  ChorusActionMeta
} from '../core/chorus-actions';

// Re-export additional types for convenience
export type { 
  HarmonicResponse
} from './composables/useHarmonics';
export type { 
  UseTableOptions
} from './composables/useTable';
export type { UseOfflineReturn } from './composables/useOffline';
export type { UseWriteActionsReturn } from './composables/useWriteActions';
export type { UseChorusActionsOptions } from './composables/useChorusActions';
export type { ChorusState } from './injection-keys';

// Export injection keys so they can be imported consistently
export { ChorusCoreKey, ChorusStateKey } from './injection-keys';

// Export shared provider types
export type { 
  ChorusProviderProps, 
  VueChorusProviderProps 
} from '../shared/provider-types';