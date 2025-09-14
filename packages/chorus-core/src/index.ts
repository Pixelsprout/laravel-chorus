// Export core ChorusActionsAPI for generated action functions
export { 
  ChorusActionsAPI,
  getGlobalChorusActionsAPI,
  connectChorusActionsAPI,
  type ChorusActionResponse,
  type ChorusActionConfig,
  type ChorusActionMeta,
} from './chorus-actions';

export {
  ClientWritesCollector,
  createWritesProxy,
  createActionContext,
  type WriteOperation,
  type ModelProxy,
  type WritesProxy,
  type ActionContextLike,
} from './writes-collector';

// Export other core components
export { ChorusDatabase, createChorusDb } from "./db";
export {
  ChorusCore,
  HarmonicEvent,
  TableState,
  SyncError,
} from "./chorus";
export {
  OfflineManager,
  OfflineRequest,
  OfflineState,
  offlineManager,
} from "./offline";
export { offlineFetch, OfflineFetchOptions } from "./fetch";
export { InertiaOfflineWrapper, createOfflineRouter, InertiaOfflineOptions } from "./inertia-offline";
export { 
  WriteActionsAPI, 
  writeActions, 
  writeActionsAPI,
  TableWriteActions,
  EnhancedWriteActionsAPI,
  WriteActionConfig, 
  WriteActionResponse, 
  BatchWriteResponse,
  type OptimisticCallback
} from "./write-actions";

// Export types
export type * from "./types";

// Export provider types  
export type { ChorusProviderProps, VueChorusProviderProps } from "./shared/provider-types";