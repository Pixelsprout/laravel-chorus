import { type InjectionKey, type Ref } from 'vue';
import { ChorusCore, type TableState } from '../core/chorus';

// Types for the provided state
export interface ChorusState {
  isInitialized: Ref<boolean>;
  tables: Record<string, TableState>;
  schema: Record<string, any>;
  initializationError: Ref<string | null>;
}

// Shared injection keys for type safety - using Symbol.for() to ensure global uniqueness
export const ChorusCoreKey: InjectionKey<ChorusCore> = Symbol.for('chorus-vue-core');
export const ChorusStateKey: InjectionKey<ChorusState> = Symbol.for('chorus-vue-state');