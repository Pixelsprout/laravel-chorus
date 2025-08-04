import { type InjectionKey, type Ref } from 'vue';
import { ChorusCore, type TableState } from '../core/chorus';

// Types for the provided state
export interface ChorusState {
  isInitialized: Ref<boolean>;
  tables: Record<string, TableState>;
  schema: Record<string, any>;
  initializationError: Ref<string | null>;
}

// Shared injection keys for type safety
export const ChorusCoreKey: InjectionKey<ChorusCore> = Symbol('chorusCore');
export const ChorusStateKey: InjectionKey<ChorusState> = Symbol('chorusState');