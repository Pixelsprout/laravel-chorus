// Export all components from the chorus package
export { ChorusDatabase, createChorusDb } from "./core/db";
export {
  ChorusCore,
  HarmonicEvent,
  TableState,
  SyncError,
} from "./core/chorus";
export {
  OfflineManager,
  OfflineRequest,
  OfflineState,
  offlineManager,
} from "./core/offline";
export { offlineFetch, OfflineFetchOptions } from "./core/fetch";
export { InertiaOfflineWrapper, createOfflineRouter, InertiaOfflineOptions } from "./core/inertia-offline";
// Export ChorusActionsAPI for modern callback-style actions
export { 
  ChorusActionsAPI,
  ChorusActionResponse,
  ChorusActionConfig,
  ChorusActionMeta,
  getGlobalChorusActionsAPI,
  connectChorusActionsAPI,
} from "./core/chorus-actions";
export {
  ClientWritesCollector,
  createWritesProxy,
  createActionContext,
  WriteOperation,
  ModelProxy,
  WritesProxy,
  ActionContextLike,
} from "./core/writes-collector";
// CSRF tokens are handled automatically by axios when configured in Laravel
export { 
  WriteActionsAPI, 
  writeActions, 
  writeActionsAPI,
  TableWriteActions,
  EnhancedWriteActionsAPI,
  WriteActionConfig, 
  WriteActionResponse, 
  BatchWriteResponse 
} from "./core/write-actions";
// The schema is imported directly from the application's _generated directory
export {
  ChorusProvider,
  useHarmonics,
  useHarmonicsQuery,
  useChorus,
} from "./react/providers/ChorusProvider";
export { useOffline } from "./react/hooks/useOffline";
export { useWriteActions, UseWriteActionsReturn } from "./react/hooks/useWriteActions";
export { useTable, useTables } from "./react/hooks/useTable";
export { OfflineIndicator, OfflineBanner } from "./react/components/OfflineIndicator";

// Export shared provider types for cross-framework compatibility
export type { 
  ChorusProviderProps,
  ReactChorusProviderProps,
  VueChorusProviderProps
} from './shared/provider-types';
