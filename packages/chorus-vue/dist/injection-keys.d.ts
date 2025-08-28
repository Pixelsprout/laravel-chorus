import { type InjectionKey, type Ref } from 'vue';
import { ChorusCore, type TableState } from '@pixelsprout/chorus-core';
export interface ChorusState {
    isInitialized: Ref<boolean>;
    tables: Record<string, TableState>;
    schema: Record<string, any>;
    initializationError: Ref<string | null>;
}
export declare const ChorusCoreKey: InjectionKey<ChorusCore>;
export declare const ChorusStateKey: InjectionKey<ChorusState>;
